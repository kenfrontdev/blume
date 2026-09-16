/**
 * Trust-score types (§0) and release-gate outcomes (§7).
 *
 * Execution weights mirror the confidence-ceiling criticality scale
 * from the decision log (critical 15 / major 7 / minor 2). Exact
 * weights for the execution score are not enumerated separately in
 * the log; this keeps one consistent criticality scale.
 */

import type { Criticality } from "@/compiler/types";

export const CRITICALITY_WEIGHT: Record<Criticality, number> = {
  critical: 15,
  major: 7,
  minor: 2,
};

export const CEILING_FLOOR = 40;
export const CEILING_START = 100;

export type CompletenessTier = "foundational" | "recommended" | "advisory";

export interface CompletenessGap {
  tier: CompletenessTier;
  code:
    | "no_acceptance_criteria"
    | "missing_criticality"
    | "missing_edge_case"
    | "missing_ui_state"
    | "missing_precondition"
    | "one_way_related_spec"
    | "vague_wording";
  message: string;
  acRef?: string;
  penalty: number; // 0 for advisory / foundational (foundational is gate, not math)
}

export interface CompletenessResult {
  foundationalPass: boolean;
  gaps: CompletenessGap[];
  confidenceCeiling: number | null; // null when foundational fails
}

export interface CriterionTestResult {
  id: string; // AC-01, EC-01, COMPOSED
  kind: "acceptance" | "edge" | "composed";
  passed: boolean;
  criticality?: Criticality;
  /** For edge cases — inherit weight from referenced AC when set. */
  ref?: string;
}

export interface ExecutionResult {
  score: number | null; // null when nothing testable
  results: CriterionTestResult[];
  weightedPassed: number;
  weightedTotal: number;
}

export interface TrustTrace {
  foundationalPass: boolean;
  confidenceCeiling: number | null;
  executionScore: number | null;
  /** min(execution, ceiling) when both present */
  combined: number | null;
  ceilingGaps: CompletenessGap[];
  execution: {
    weightedPassed: number;
    weightedTotal: number;
    results: CriterionTestResult[];
  };
  computedAt: string;
}

export interface TrustScore {
  executionScore: number | null;
  confidenceCeiling: number | null;
  combined: number | null;
  hardStop: boolean; // zero testable ACs / foundational fail
  trace: TrustTrace;
}

export type GateDecisionKind =
  | "auto_ship"
  | "soft_stop"
  | "hard_stop";

export interface GateInput {
  trust: TrustScore;
  releaseThreshold: number;
  verificationStatus: "complete" | "partial";
  unresolvedSwarmFlags: number;
  unresolvedDriftFlags: number;
}

export interface GateOutcome {
  decision: GateDecisionKind;
  reasons: string[];
  wouldAutoShip: boolean;
}
