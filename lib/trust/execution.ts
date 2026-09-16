import type { CanonicalSpec, Criticality } from "@/compiler/types";
import {
  CRITICALITY_WEIGHT,
  type CriterionTestResult,
  type ExecutionResult,
} from "./types";

const weightFor = (
  result: CriterionTestResult,
  spec: CanonicalSpec
): number => {
  if (result.kind === "composed") {
    // Composed journey: average weight of active ACs (doesn't invent criticality)
    const active = spec.acceptance_criteria.filter((a) => a.status === "active");
    if (active.length === 0) return 0;
    const sum = active.reduce(
      (s, a) => s + CRITICALITY_WEIGHT[a.criticality],
      0
    );
    return sum / active.length;
  }

  if (result.criticality) {
    return CRITICALITY_WEIGHT[result.criticality];
  }

  if (result.ref) {
    const ac = spec.acceptance_criteria.find((a) => a.id === result.ref);
    if (ac) return CRITICALITY_WEIGHT[ac.criticality];
  }

  // Edge/AC without criticality — shouldn't happen after foundational pass
  return CRITICALITY_WEIGHT.minor;
};

/**
 * Execution score (§0): weighted pass rate over criterion/edge/composed results.
 * Swarm findings are intentionally excluded.
 */
export const computeExecutionScore = (
  spec: CanonicalSpec,
  results: CriterionTestResult[]
): ExecutionResult => {
  if (results.length === 0) {
    return {
      score: null,
      results,
      weightedPassed: 0,
      weightedTotal: 0,
    };
  }

  let weightedPassed = 0;
  let weightedTotal = 0;

  for (const result of results) {
    const w = weightFor(result, spec);
    weightedTotal += w;
    if (result.passed) weightedPassed += w;
  }

  const score =
    weightedTotal === 0
      ? null
      : Math.round((weightedPassed / weightedTotal) * 1000) / 10;

  return { score, results, weightedPassed, weightedTotal };
};

export const resultsFromSpecAssuming = (
  spec: CanonicalSpec,
  passed: boolean
): CriterionTestResult[] => {
  const out: CriterionTestResult[] = [];
  for (const ac of spec.acceptance_criteria.filter((a) => a.status === "active")) {
    out.push({
      id: ac.id,
      kind: "acceptance",
      passed,
      criticality: ac.criticality as Criticality,
    });
  }
  for (const ec of spec.edge_cases) {
    out.push({
      id: ec.id,
      kind: "edge",
      passed,
      ref: ec.ref,
    });
  }
  const activeCount = spec.acceptance_criteria.filter(
    (a) => a.status === "active"
  ).length;
  if (activeCount >= 2) {
    out.push({ id: "COMPOSED", kind: "composed", passed });
  }
  return out;
};
