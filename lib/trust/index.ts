export type { CompletenessGap, CompletenessResult, TrustScore, GateOutcome } from "./types";
export { evaluateCompleteness } from "./completeness";
export { computeExecutionScore, resultsFromSpecAssuming } from "./execution";
export { computeTrustScore } from "./score";
export { evaluateReleaseGate } from "./gate";
export { CRITICALITY_WEIGHT, CEILING_FLOOR, CEILING_START } from "./types";
