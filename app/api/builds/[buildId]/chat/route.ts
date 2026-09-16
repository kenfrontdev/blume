import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  builds,
  driftFlags,
  gateDecisions,
  retryAttempts,
  swarmNotes,
} from "@/db/schema";
import { answerChatQuestion } from "@/lib/portal/chat";

interface ChatBody {
  question?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await context.params;
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json(
      { error: "question is required." },
      { status: 400 }
    );
  }

  try {
    const buildRows = await db
      .select()
      .from(builds)
      .where(eq(builds.id, buildId))
      .limit(1);
    const build = buildRows[0];
    if (!build) {
      return NextResponse.json({ error: "Build not found." }, { status: 404 });
    }

    const [retries, swarm, drift, gates] = await Promise.all([
      db
        .select()
        .from(retryAttempts)
        .where(eq(retryAttempts.buildId, buildId))
        .orderBy(retryAttempts.attemptNumber),
      db
        .select()
        .from(swarmNotes)
        .where(eq(swarmNotes.buildId, buildId))
        .orderBy(swarmNotes.createdAt),
      db.select().from(driftFlags).where(eq(driftFlags.specId, build.specId)),
      db
        .select()
        .from(gateDecisions)
        .where(eq(gateDecisions.buildId, buildId))
        .orderBy(desc(gateDecisions.decidedAt)),
    ]);

    const answer = answerChatQuestion(question, {
      build,
      retries,
      swarmNotes: swarm,
      driftFlags: drift,
      gateDecisions: gates,
    });

    return NextResponse.json(answer);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Chat failed.",
      },
      { status: 500 }
    );
  }
}
