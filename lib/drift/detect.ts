import { randomUUID } from "node:crypto";
import type { CanonicalSpec } from "@/compiler/types";
import { db } from "@/lib/db";
import { driftFlags } from "@/db/schema";

export type DriftFinding = {
  specId: string;
  type: "silent" | "stale";
  detail: string;
};

/**
 * §8 drift detection (lightweight):
 * - related_specs version divergence → silent drift
 * - governed path stubs: if a spec declares related code paths later,
 *   compare mtimes; for now flag when related specs versions diverge
 *   after previously matching (stale vs silent).
 */
export const detectDrift = (
  specs: CanonicalSpec[]
): DriftFinding[] => {
  const byId = new Map(specs.map((s) => [s.id, s]));
  const findings: DriftFinding[] = [];

  for (const spec of specs) {
    for (const relatedId of spec.related_specs) {
      const other = byId.get(relatedId);
      if (!other) {
        findings.push({
          specId: spec.id,
          type: "stale",
          detail: `related_specs references missing spec "${relatedId}"`,
        });
        continue;
      }
      if (spec.version !== other.version) {
        findings.push({
          specId: spec.id,
          type: "silent",
          detail: `Version mismatch with related ${other.id}: ${spec.id}@v${spec.version} vs ${other.id}@v${other.version}`,
        });
      }
    }
  }

  return findings;
};

export const persistDriftFlags = async (
  findings: DriftFinding[]
): Promise<string[]> => {
  const ids: string[] = [];
  for (const f of findings) {
    const id = randomUUID();
    await db.insert(driftFlags).values({
      id,
      specId: f.specId,
      type: f.type,
      resolved: false,
    });
    ids.push(id);
  }
  return ids;
};
