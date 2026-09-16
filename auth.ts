import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectRoles } from "@/db/schema";

export type CorinRole = "quality_owner" | "contributor";

/**
 * §11 Auth — identity from an external provider; roles enforced in Corin
 * via project_roles. Credentials provider enables local dogfooding without
 * OAuth apps; GitHub activates when AUTH_GITHUB_ID/SECRET are set.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Corin demo",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
        projectId: { label: "Project", type: "text" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim();
        if (!email) return null;
        const role =
          credentials?.role === "quality_owner"
            ? "quality_owner"
            : "contributor";
        const projectId = String(
          credentials?.projectId ??
            process.env.CORIN_DEFAULT_PROJECT_SLUG ??
            "carromlive"
        );
        const userId = `cred:${email}`;

        const database = getDb();
        if (database) {
          await database
            .insert(projectRoles)
            .values({ projectId, userId, role })
            .onConflictDoUpdate({
              target: [projectRoles.projectId, projectRoles.userId],
              set: { role },
            });
        }

        return {
          id: userId,
          email,
          name: email.split("@")[0],
          role,
          projectId,
        };
      },
    }),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: CorinRole }).role ?? "contributor";
        token.projectId = (user as { projectId?: string }).projectId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as { role?: CorinRole }).role =
          (token.role as CorinRole) ?? "contributor";
        (session.user as { projectId?: string }).projectId = token.projectId as
          | string
          | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "corin-dev-secret-change-me",
});

export const getProjectRole = async (
  userId: string,
  projectId: string
): Promise<CorinRole | null> => {
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
  return (rows[0]?.role as CorinRole) ?? null;
};

export const requireQualityOwner = async (
  userId: string,
  projectId: string
): Promise<boolean> => {
  const role = await getProjectRole(userId, projectId);
  return role === "quality_owner";
};
