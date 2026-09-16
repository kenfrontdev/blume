import { randomUUID } from "node:crypto";
import type { CanonicalSpec } from "@/compiler/types";
import type { TrustScore, GateOutcome } from "@/lib/trust/types";
import { db } from "@/lib/db";
import { builds, gateDecisions } from "@/db/schema";

/**
 * Persist a trust-score snapshot onto a build row (§0 / §3 schema).
 */
export const recordBuildTrust = async (options: {
  spec: CanonicalSpec;
  trust: TrustScore;
  status?: "building" | "testing" | "blocked" | "passed" | "shipped";
  verificationStatus?: "complete" | "partial" | null;
  buildId?: string;
}): Promise<string> => {
  const buildId = options.buildId ?? randomUUID();
  const status =
    options.status ??
    (options.trust.hardStop
      ? "blocked"
      : options.trust.combined != null && options.trust.combined >= 80
        ? "passed"
        : "testing");

  await db.insert(builds).values({
    id: buildId,
    specId: options.spec.id,
    specVersion: options.spec.version,
    status,
    verificationStatus: options.verificationStatus ?? "complete",
    executionScore:
      options.trust.executionScore == null
        ? null
        : String(options.trust.executionScore),
    confidenceCeiling:
      options.trust.confidenceCeiling == null
        ? null
        : String(options.trust.confidenceCeiling),
    trustTrace: options.trust.trace as unknown as Record<string, unknown>,
  });

  return buildId;
};

export const recordGateDecision = async (options: {
  buildId: string;
  gate: GateOutcome;
  decidedBy?: string;
}): Promise<string> => {
  const id = randomUUID();
  const decision =
    options.gate.decision === "auto_ship"
      ? "auto_ship"
      : options.gate.decision === "hard_stop"
        ? "approved" // placeholder bucket; hard_stop isn't a gate_decision enum value
        : "approved";

  // Soft/hard stops that don't ship are still logged when a human later
  // approves/overrides. For auto_ship we write immediately.
  if (options.gate.decision !== "auto_ship") {
    // Leave a note in trust flow only; durable override rows come from portal.
    return id;
  }

  await db.insert(gateDecisions).values({
    id,
    buildId: options.buildId,
    decision,
    decidedBy: options.decidedBy ?? "system",
  });

  return id;
};
