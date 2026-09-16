/**
 * Portal display status (§10): blocked | partial | complete | shipped.
 * Derived from build rows (+ verification) and spec status as fallback.
 */

export type PortalStatus = "blocked" | "partial" | "complete" | "shipped";

export interface StatusSource {
  buildStatus?: string | null;
  verificationStatus?: string | null;
  specStatus?: string | null;
}

export const derivePortalStatus = (source: StatusSource): PortalStatus => {
  if (source.buildStatus === "shipped" || source.specStatus === "shipped") {
    return "shipped";
  }
  if (source.buildStatus === "blocked") {
    return "blocked";
  }
  if (source.verificationStatus === "partial") {
    return "partial";
  }
  if (
    source.buildStatus === "passed" ||
    source.verificationStatus === "complete"
  ) {
    return "complete";
  }
  if (source.buildStatus === "building" || source.buildStatus === "testing") {
    return "partial";
  }
  // Spec-only rows (no build yet)
  if (source.specStatus === "building") return "partial";
  if (source.specStatus === "approved") return "complete";
  return "blocked";
};

export const PORTAL_STATUSES: PortalStatus[] = [
  "blocked",
  "partial",
  "complete",
  "shipped",
];

export const OVERRIDE_REASONS = [
  "acknowledged_ambiguity",
  "accepted_contract_mismatch",
  "shipped_despite_incomplete_verification",
  "accepted_score_below_threshold",
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

export const OVERRIDE_REASON_LABELS: Record<OverrideReason, string> = {
  acknowledged_ambiguity: "Acknowledged ambiguity",
  accepted_contract_mismatch: "Accepted contract mismatch",
  shipped_despite_incomplete_verification:
    "Shipped despite incomplete verification",
  accepted_score_below_threshold: "Accepted score below threshold",
};
