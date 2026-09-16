import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth, requireQualityOwner } from "@/auth";
import { getDb } from "@/lib/db";
import { builds, gateDecisions, specs } from "@/db/schema";
import {
  OVERRIDE_REASONS,
  type OverrideReason,
} from "@/lib/portal/status";

interface GateBody {
  action?: string;
  override_reason?: string;
  decided_by?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ buildId: string }> }
) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { buildId } = await context.params;
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  let body: GateBody;
  try {
    body = (await request.json()) as GateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "override") {
    return NextResponse.json(
      { error: 'action must be "approve" or "override".' },
      { status: 400 }
    );
  }

  let overrideReason: OverrideReason | null = null;
  if (action === "override") {
    if (
      !body.override_reason ||
      !(OVERRIDE_REASONS as readonly string[]).includes(body.override_reason)
    ) {
      return NextResponse.json(
        {
          error:
            "override_reason is required and must be one of the §7 structured reasons.",
          allowed: OVERRIDE_REASONS,
        },
        { status: 400 }
      );
    }
    overrideReason = body.override_reason as OverrideReason;
  }

  try {
    const existing = await db
      .select()
      .from(builds)
      .where(eq(builds.id, buildId))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Build not found." }, { status: 404 });
    }

    const specRows = await db
      .select()
      .from(specs)
      .where(eq(specs.id, existing[0].specId))
      .limit(1);
    const projectId = specRows[0]?.projectId ?? "carromlive";

    const isOwner = await requireQualityOwner(session.userId, projectId);
    if (!isOwner && action === "override") {
      return NextResponse.json(
        { error: "Only quality owners may override the gate (§11)." },
        { status: 403 }
      );
    }

    const decision = action === "approve" ? "approved" : "overridden";
    const id = randomUUID();

    await db.insert(gateDecisions).values({
      id,
      buildId,
      decision,
      overrideReason,
      decidedBy: body.decided_by ?? session.userId,
    });

    await db
      .update(builds)
      .set({
        status: "shipped",
        updatedAt: new Date(),
      })
      .where(eq(builds.id, buildId));

    return NextResponse.json({
      ok: true,
      gateDecisionId: id,
      decision,
      override_reason: overrideReason,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to record gate decision.",
      },
      { status: 500 }
    );
  }
}
