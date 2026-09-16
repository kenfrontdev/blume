/**
 * Deterministic root-cause chat (§7) — answers only from the build record.
 * No external LLM; every claim cites a concrete log entry.
 */

import type {
  BuildRow,
  DriftFlagRow,
  GateDecisionRow,
  RetryAttemptRow,
  SwarmNoteRow,
} from "./queries";

export interface ChatCitation {
  kind: "trust_trace" | "retry" | "swarm" | "drift" | "gate" | "build";
  ref: string;
  excerpt: string;
}

export interface ChatAnswer {
  answer: string;
  citations: ChatCitation[];
  summary: boolean;
}

export interface ChatContext {
  build: BuildRow;
  retries: RetryAttemptRow[];
  swarmNotes: SwarmNoteRow[];
  driftFlags: DriftFlagRow[];
  gateDecisions: GateDecisionRow[];
}

const citeTrust = (build: BuildRow): ChatCitation | null => {
  if (!build.trustTrace) return null;
  return {
    kind: "trust_trace",
    ref: `build:${build.id}/trust_trace`,
    excerpt: `execution=${build.executionScore ?? "null"} ceiling=${build.confidenceCeiling ?? "null"}`,
  };
};

export const buildAutoSummary = (ctx: ChatContext): ChatAnswer => {
  const citations: ChatCitation[] = [];
  const lines: string[] = [];

  lines.push(
    `Build ${ctx.build.id} for ${ctx.build.specId} v${ctx.build.specVersion} is currently ${ctx.build.status}` +
      (ctx.build.verificationStatus
        ? ` (verification: ${ctx.build.verificationStatus})`
        : "") +
      "."
  );
  citations.push({
    kind: "build",
    ref: `build:${ctx.build.id}`,
    excerpt: `status=${ctx.build.status} verification=${ctx.build.verificationStatus ?? "unset"}`,
  });

  const trustCite = citeTrust(ctx.build);
  if (trustCite) {
    citations.push(trustCite);
    lines.push(
      `Trust: execution score ${ctx.build.executionScore ?? "—"}, confidence ceiling ${ctx.build.confidenceCeiling ?? "—"}.`
    );

    const trace = ctx.build.trustTrace as Record<string, unknown>;
    const gaps = Array.isArray(trace.ceilingGaps) ? trace.ceilingGaps : [];
    if (gaps.length > 0) {
      const gapMsgs = gaps
        .slice(0, 5)
        .map((g) => {
          if (g && typeof g === "object" && "message" in g) {
            return String((g as { message: unknown }).message);
          }
          return null;
        })
        .filter(Boolean);
      if (gapMsgs.length) {
        lines.push(`Ceiling gaps on record: ${gapMsgs.join("; ")}.`);
      }
    }

    const execution = trace.execution as
      | { results?: Array<{ id?: string; passed?: boolean }> }
      | undefined;
    const failed = (execution?.results ?? []).filter((r) => r.passed === false);
    if (failed.length > 0) {
      lines.push(
        `Failed criteria in trust_trace: ${failed.map((r) => r.id ?? "?").join(", ")}.`
      );
    }
  } else {
    lines.push("No trust_trace is stored on this build yet.");
  }

  const unresolvedSwarm = ctx.swarmNotes.filter(
    (n) => n.verdict === "ambiguous" || n.type === "contract-mismatch"
  );
  for (const note of unresolvedSwarm.slice(0, 5)) {
    citations.push({
      kind: "swarm",
      ref: `swarm_note:${note.id}`,
      excerpt: `${note.type}/${note.verdict} ${note.acRef}`,
    });
    lines.push(
      `Swarm note ${note.id} (${note.type}, ${note.verdict}) on ${note.acRef}` +
        (note.rationale ? `: ${note.rationale}` : ".")
    );
  }

  const openDrift = ctx.driftFlags.filter((d) => !d.resolved);
  for (const flag of openDrift) {
    citations.push({
      kind: "drift",
      ref: `drift:${flag.id}`,
      excerpt: `${flag.type} unresolved`,
    });
    lines.push(`Unresolved ${flag.type} drift flag ${flag.id}.`);
  }

  const fails = ctx.retries.filter((r) => r.status === "fail");
  if (fails.length > 0) {
    const last = fails[fails.length - 1]!;
    citations.push({
      kind: "retry",
      ref: `retry_attempt:${last.id}`,
      excerpt: `attempt #${last.attemptNumber} fail`,
    });
    lines.push(
      `${fails.length} failed retry attempt(s); latest #${last.attemptNumber}` +
        (last.rationale ? `: ${last.rationale}` : ".")
    );
  }

  if (ctx.gateDecisions[0]) {
    const g = ctx.gateDecisions[0];
    citations.push({
      kind: "gate",
      ref: `gate_decision:${g.id}`,
      excerpt: g.decision,
    });
    lines.push(
      `Latest gate decision: ${g.decision}` +
        (g.overrideReason ? ` (${g.overrideReason})` : "") +
        "."
    );
  }

  if (lines.length === 1) {
    lines.push("No retry, swarm, drift, or gate evidence is recorded yet.");
  }

  return {
    answer: lines.join("\n\n"),
    citations,
    summary: true,
  };
};

export const answerChatQuestion = (
  question: string,
  ctx: ChatContext
): ChatAnswer => {
  const q = question.trim().toLowerCase();
  if (!q || q === "summary" || q === "what happened" || q === "help") {
    return buildAutoSummary(ctx);
  }

  const citations: ChatCitation[] = [];
  const lines: string[] = [];

  if (/score|trust|ceiling|execution|fail(ed)? criteria/.test(q)) {
    const trustCite = citeTrust(ctx.build);
    if (!trustCite) {
      return {
        answer:
          "No trust_trace is stored on this build, so I cannot cite a score.",
        citations: [],
        summary: false,
      };
    }
    citations.push(trustCite);
    lines.push(
      `From trust_trace on build ${ctx.build.id}: execution=${ctx.build.executionScore ?? "null"}, ceiling=${ctx.build.confidenceCeiling ?? "null"}.`
    );
    const trace = ctx.build.trustTrace as Record<string, unknown>;
    const execution = trace.execution as
      | { results?: Array<{ id?: string; passed?: boolean; kind?: string }> }
      | undefined;
    if (execution?.results?.length) {
      for (const r of execution.results) {
        lines.push(
          `- ${(r.id ?? "?").toString()} (${r.kind ?? "criterion"}): ${r.passed ? "passed" : "failed"} [trust_trace]`
        );
      }
    }
  }

  if (/swarm|ambigu|contract|mismatch/.test(q)) {
    if (ctx.swarmNotes.length === 0) {
      lines.push("No swarm notes are recorded for this build.");
    } else {
      for (const note of ctx.swarmNotes) {
        citations.push({
          kind: "swarm",
          ref: `swarm_note:${note.id}`,
          excerpt: `${note.verdict} ${note.type}`,
        });
        lines.push(
          `swarm_note:${note.id} — agent ${note.agentId}, layer ${note.layer}, ${note.acRef}, verdict ${note.verdict}, type ${note.type}` +
            (note.rationale ? `. ${note.rationale}` : "")
        );
      }
    }
  }

  if (/retry|attempt|agent/.test(q)) {
    if (ctx.retries.length === 0) {
      lines.push("No retry attempts are recorded for this build.");
    } else {
      for (const retry of ctx.retries) {
        citations.push({
          kind: "retry",
          ref: `retry_attempt:${retry.id}`,
          excerpt: `#${retry.attemptNumber} ${retry.status}`,
        });
        lines.push(
          `retry_attempt:${retry.id} — attempt #${retry.attemptNumber} ${retry.status}` +
            (retry.rationale ? `: ${retry.rationale}` : "")
        );
      }
    }
  }

  if (/drift/.test(q)) {
    if (ctx.driftFlags.length === 0) {
      lines.push("No drift flags are recorded for this build's spec.");
    } else {
      for (const flag of ctx.driftFlags) {
        citations.push({
          kind: "drift",
          ref: `drift:${flag.id}`,
          excerpt: flag.type,
        });
        lines.push(
          `drift:${flag.id} — ${flag.type}, resolved=${flag.resolved}`
        );
      }
    }
  }

  if (/gate|override|ship|approv/.test(q)) {
    if (ctx.gateDecisions.length === 0) {
      lines.push("No gate decisions are recorded for this build yet.");
    } else {
      for (const g of ctx.gateDecisions) {
        citations.push({
          kind: "gate",
          ref: `gate_decision:${g.id}`,
          excerpt: g.decision,
        });
        lines.push(
          `gate_decision:${g.id} — ${g.decision}` +
            (g.overrideReason ? `, override_reason=${g.overrideReason}` : "")
        );
      }
    }
  }

  if (lines.length === 0) {
    return {
      answer:
        "I can only answer from this build's trust_trace, retry attempts, swarm notes, drift flags, and gate decisions. Try asking about score, swarm, retries, drift, or gate — or say \"what happened\" for the auto summary.",
      citations: [],
      summary: false,
    };
  }

  return { answer: lines.join("\n"), citations, summary: false };
};
