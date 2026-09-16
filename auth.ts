import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectRoles } from "@/db/schema";

export type BlumeRole = "quality_owner" | "contributor";

/**
 * §11 — identity from Clerk; roles enforced in Blume via project_roles.
 */
export const auth = clerkAuth;

export const getProjectRole = async (
  userId: string,
  projectId: string
): Promise<BlumeRole | null> => {
  const database = getDb();
  if (!database) return null;
  const rows = await database
    .select()
    .from(projectRoles)
    .where(
      and(
        eq(projectRoles.userId, userId),
        eq(projectRoles.projectId, projectId)
      )
    )
    .limit(1);
  return (rows[0]?.role as BlumeRole) ?? null;
};

export const requireQualityOwner = async (
  userId: string,
  projectId: string
): Promise<boolean> => {
  const role = await getProjectRole(userId, projectId);
  if (role === "quality_owner") return true;

  // First signed-in user on a project becomes quality_owner (bootstrap).
  const database = getDb();
  if (!database) return false;
  const existing = await database
    .select()
    .from(projectRoles)
    .where(eq(projectRoles.projectId, projectId))
    .limit(1);

  if (existing.length === 0) {
    await database.insert(projectRoles).values({
      projectId,
      userId,
      role: "quality_owner",
    });
    return true;
  }

  return false;
};

export const ensureSignedInUser = async (): Promise<string | null> => {
  const session = await clerkAuth();
  return session.userId;
};

export const getCurrentClerkUser = currentUser;
