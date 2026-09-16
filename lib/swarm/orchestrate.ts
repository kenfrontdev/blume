import type { CanonicalSpec, Criticality } from "@/compiler/types";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { swarmNotes } from "@/db/schema";

export type SwarmWorker = {
  agentId: string;
  layer: string;
  specId: string;
};

export type SwarmShape = {
  workers: SwarmWorker[];
  maxDurationMinutes: number;
  scaledDown: boolean;
  rationale: string[];
};

export type BlackboardNote = {
  id: string;
  buildId: string;
  agentId: string;
  layer: string;
  specId: string;
  acRef: string;
  verdict: "pass" | "fail" | "blocked" | "ambiguous";
  type: "functional" | "contract-mismatch" | "ambiguity" | "style-deviation";
  evidence?: string;
  rationale?: string;
  confidence?: string;
  blocks?: string[];
  round?: number;
};

const MULTI_ACTOR =
  /\b(two|both|concurrent|simultaneously|another user|second (user|spectator)|multi[- ]actor)\b/i;

/**
 * Dynamic swarm sizing (§6) from completeness-style signals.
 * Always clamped to maxAgents / maxDuration.
 */
export const proposeSwarmShape = (
  spec: CanonicalSpec,
  related: CanonicalSpec[],
  config: {
    maxAgents: number;
    maxDurationMinutes: number;
    sizing: "dynamic" | "fixed";
  }
): SwarmShape => {
  const rationale: string[] = [];
  const workers: SwarmWorker[] = [];

  const active = spec.acceptance_criteria.filter((a) => a.status === "active");
  const hasCritical = active.some((a) => a.criticality === "critical");
  const multiActor = [...active, ...spec.edge_cases].some((c) =>
    MULTI_ACTOR.test([c.given, c.when, ...c.then].join(" "))
  );

  if (config.sizing === "fixed") {
    if (!hasCritical && !multiActor) {
      return {
        workers: [],
        maxDurationMinutes: config.maxDurationMinutes,
        scaledDown: false,
        rationale: ["fixed sizing: no critical AC and no multi-actor intent — swarm skipped"],
      };
    }
  }

  // One worker for primary spec layer
  workers.push({
    agentId: `worker-${spec.layer}-0`,
    layer: spec.layer,
    specId: spec.id,
  });
  rationale.push(`primary ${spec.layer} worker for ${spec.id}`);

  for (const rel of related) {
    workers.push({
      agentId: `worker-${rel.layer}-${rel.id}`,
      layer: rel.layer,
      specId: rel.id,
    });
    rationale.push(`related_specs worker for ${rel.id} (${rel.layer})`);
  }

  if (multiActor) {
    workers.push({
      agentId: `worker-concurrency-0`,
      layer: spec.layer,
      specId: spec.id,
    });
    rationale.push("multi-actor/concurrency worker");
  }

  let scaledDown = false;
  let finalWorkers = workers;
  if (workers.length > config.maxAgents) {
    scaledDown = true;
    finalWorkers = workers.slice(0, config.maxAgents);
    rationale.push(
      `scaled down from ${workers.length} to ${config.maxAgents} (max_swarm_agents)`
    );
  }

  const criticalCount = active.filter((a) => a.criticality === "critical").length;
  const duration = Math.min(
    config.maxDurationMinutes,
    Math.max(5, criticalCount * 5 + related.length * 2)
  );

  return {
    workers: finalWorkers,
    maxDurationMinutes: duration,
    scaledDown,
    rationale,
  };
};

const criticalityOf = (
  spec: CanonicalSpec,
  acRef: string
): Criticality | undefined =>
  spec.acceptance_criteria.find((a) => a.id === acRef)?.criticality;

/**
 * Deterministic coordination graph (§6): workers post notes; UI waits on
 * API dependency verdicts for Given-assumes-success criteria.
 */
export const runSwarm = async (options: {
  buildId: string;
  spec: CanonicalSpec;
  related: CanonicalSpec[];
  shape: SwarmShape;
  /** Simulated per-criterion outcomes keyed by `${specId}:${acRef}` */
  outcomes?: Record<string, "pass" | "fail">;
  persist?: boolean;
}): Promise<BlackboardNote[]> => {
  const board: BlackboardNote[] = [];
  const outcomes = options.outcomes ?? {};
  const bySpec = new Map<string, CanonicalSpec>([
    [options.spec.id, options.spec],
    ...options.related.map((s) => [s.id, s] as const),
  ]);

  for (const worker of options.shape.workers) {
    const spec = bySpec.get(worker.specId);
    if (!spec) continue;

    for (const ac of spec.acceptance_criteria.filter((a) => a.status === "active")) {
      const key = `${spec.id}:${ac.id}`;
      const intended = outcomes[key] ?? "pass";

      // Dependency check: UI criteria that assume API success
      if (worker.layer === "ui" || worker.layer === "mobile") {
        const apiDep = options.related.find((r) => r.layer === "api");
        if (apiDep) {
          const depNote = board.find(
            (n) =>
              n.specId === apiDep.id &&
              n.verdict === "fail" &&
              n.type === "functional"
          );
          const isFailureEdge = /fail|error|full|timeout|409/i.test(ac.when + ac.given);
          if (depNote && !isFailureEdge) {
            board.push({
              id: randomUUID(),
              buildId: options.buildId,
              agentId: worker.agentId,
              layer: worker.layer,
              specId: spec.id,
              acRef: ac.id,
              verdict: "blocked",
              type: "functional",
              evidence: `blocked: dependency-failed (${depNote.specId}/${depNote.acRef})`,
              rationale: `UI Given assumes dependency success; API posted fail.`,
              confidence: "0.9",
              blocks: [],
            });
            continue;
          }
        }
      }

      board.push({
        id: randomUUID(),
        buildId: options.buildId,
        agentId: worker.agentId,
        layer: worker.layer,
        specId: spec.id,
        acRef: ac.id,
        verdict: intended,
        type: "functional",
        evidence: `${intended} on ${key}`,
        rationale: `Worker ${worker.agentId} evaluated ${ac.id} (${criticalityOf(spec, ac.id) ?? "n/a"}).`,
        confidence: "0.85",
        blocks: [],
      });
    }

    // Cross-layer reconciliation for related API↔UI
    if (worker.layer === "ui") {
      const api = options.related.find((r) => r.layer === "api");
      if (api) {
        const apiPass = board.some(
          (n) => n.specId === api.id && n.verdict === "pass"
        );
        const uiPass = board.some(
          (n) => n.specId === spec.id && n.verdict === "pass"
        );
        if (apiPass !== uiPass) {
          board.push({
            id: randomUUID(),
            buildId: options.buildId,
            agentId: worker.agentId,
            layer: "ui",
            specId: spec.id,
            acRef: "AC-01",
            verdict: "ambiguous",
            type: "contract-mismatch",
            evidence: `API pass=${apiPass} UI pass=${uiPass}`,
            rationale:
              "Deterministic equality check: layers disagree on success state.",
            confidence: "0.95",
          });
        }
      }
    }
  }

  // Same-layer ambiguity: if two workers on same AC disagree → debate then ambiguous
  const byAc = new Map<string, BlackboardNote[]>();
  for (const note of board.filter((n) => n.type === "functional")) {
    const k = `${note.specId}:${note.acRef}`;
    byAc.set(k, [...(byAc.get(k) ?? []), note]);
  }
  for (const [, notes] of byAc) {
    const verdicts = new Set(notes.map((n) => n.verdict));
    if (verdicts.size > 1 && notes.length >= 2) {
      for (let round = 1; round <= 2; round++) {
        board.push({
          id: randomUUID(),
          buildId: options.buildId,
          agentId: notes[0].agentId,
          layer: notes[0].layer,
          specId: notes[0].specId,
          acRef: notes[0].acRef,
          verdict: "ambiguous",
          type: "ambiguity",
          rationale: `Debate round ${round}: no majority; proposing revision.`,
          round,
          confidence: "0.5",
        });
      }
      board.push({
        id: randomUUID(),
        buildId: options.buildId,
        agentId: "reconciler",
        layer: notes[0].layer,
        specId: notes[0].specId,
        acRef: notes[0].acRef,
        verdict: "ambiguous",
        type: "ambiguity",
        rationale: "Debate did not converge within round cap.",
        round: 3,
        confidence: "0.4",
      });
    }
  }

  if (options.persist) {
    for (const note of board) {
      await db.insert(swarmNotes).values({
        id: note.id,
        buildId: note.buildId,
        agentId: note.agentId,
        layer: note.layer,
        specId: note.specId,
        acRef: note.acRef,
        verdict: note.verdict,
        type: note.type,
        evidence: note.evidence,
        rationale: note.rationale,
        confidence: note.confidence,
        blocks: note.blocks,
        round: note.round,
      });
    }
  }

  return board;
};

export const unresolvedSwarmFlagCount = (notes: BlackboardNote[]): number =>
  notes.filter(
    (n) =>
      (n.verdict === "ambiguous" || n.type === "contract-mismatch") &&
      n.verdict !== "pass"
  ).length;
