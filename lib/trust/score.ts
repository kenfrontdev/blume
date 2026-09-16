import type { CanonicalSpec } from "@/compiler/types";
import { evaluateCompleteness } from "./completeness";
import { computeExecutionScore } from "./execution";
import type {
  CriterionTestResult,
  TrustScore,
  TrustTrace,
} from "./types";

/**
 * Full trust score (§0): execution capped by confidence ceiling, with trace.
 */
export const computeTrustScore = (
  spec: CanonicalSpec,
  testResults: CriterionTestResult[],
  relatedSpecs: CanonicalSpec[] = []
): TrustScore => {
  const completeness = evaluateCompleteness(spec, relatedSpecs);
  const execution = computeExecutionScore(spec, testResults);

  const hardStop = !completeness.foundationalPass;

  let combined: number | null = null;
  if (
    !hardStop &&
    execution.score != null &&
    completeness.confidenceCeiling != null
  ) {
    combined = Math.min(execution.score, completeness.confidenceCeiling);
  }

  const trace: TrustTrace = {
    foundationalPass: completeness.foundationalPass,
    confidenceCeiling: completeness.confidenceCeiling,
    executionScore: execution.score,
    combined,
    ceilingGaps: completeness.gaps.filter((g) => g.tier !== "advisory"),
    execution: {
      weightedPassed: execution.weightedPassed,
      weightedTotal: execution.weightedTotal,
      results: execution.results,
    },
    computedAt: new Date().toISOString(),
  };

  return {
    executionScore: execution.score,
    confidenceCeiling: completeness.confidenceCeiling,
    combined,
    hardStop,
    trace,
  };
};
