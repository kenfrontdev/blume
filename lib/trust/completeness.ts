import type { CanonicalSpec } from "@/compiler/types";
import {
  CEILING_FLOOR,
  CEILING_START,
  CRITICALITY_WEIGHT,
  type CompletenessGap,
  type CompletenessResult,
} from "./types";

const UI_STATES = ["loading", "empty", "error", "success"] as const;

const VAGUE_PATTERNS =
  /\b(works correctly|handles errors|is fast|as expected|properly|etc\.?)\b/i;

/**
 * Completeness rubric (§1) + confidence ceiling (§0).
 * Judged fresh from the canonical spec each call — never stored on the spec.
 */
export const evaluateCompleteness = (
  spec: CanonicalSpec,
  relatedSpecs: CanonicalSpec[] = []
): CompletenessResult => {
  const gaps: CompletenessGap[] = [];
  const active = spec.acceptance_criteria.filter((ac) => ac.status === "active");

  if (active.length === 0) {
    gaps.push({
      tier: "foundational",
      code: "no_acceptance_criteria",
      message: "No active acceptance criteria — nothing to compile or score.",
      penalty: 0,
    });
  }

  for (const ac of active) {
    if (!ac.criticality) {
      gaps.push({
        tier: "foundational",
        code: "missing_criticality",
        message: `${ac.id} is missing a criticality tag.`,
        acRef: ac.id,
        penalty: 0,
      });
    }
  }

  const foundationalPass =
    active.length > 0 && active.every((ac) => Boolean(ac.criticality));

  // Recommended: edge case per critical (and optionally major/minor per §0 table)
  for (const ac of active) {
    const hasEdge = spec.edge_cases.some((ec) => ec.ref === ac.id);
    if (!hasEdge) {
      const penalty = CRITICALITY_WEIGHT[ac.criticality];
      gaps.push({
        tier: "recommended",
        code: "missing_edge_case",
        message: `${ac.id} (${ac.criticality}) has no linked edge case.`,
        acRef: ac.id,
        penalty,
      });
    }
  }

  // Recommended: UI states for ui/mobile
  if (spec.trailing.type === "ui_states") {
    for (const surface of spec.surfaces) {
      const key = surface.toLowerCase();
      const states = spec.trailing.surfaces[key] ?? {};
      for (const state of UI_STATES) {
        if (!states[state]?.trim()) {
          gaps.push({
            tier: "recommended",
            code: "missing_ui_state",
            message: `UI state "${state}" missing for surface "${surface}".`,
            penalty: 5,
          });
        }
      }
    }
  }

  // Recommended: preconditions when clearly needed
  if (
    spec.preconditions.length === 0 &&
    (spec.layer === "ui" || spec.layer === "mobile" || spec.layer === "api")
  ) {
    gaps.push({
      tier: "recommended",
      code: "missing_precondition",
      message:
        "No preconditions defined; ui/api specs usually need at least auth or entity existence.",
      penalty: 5,
    });
  }

  // Recommended: one-way related_specs links
  for (const relatedId of spec.related_specs) {
    const other = relatedSpecs.find((s) => s.id === relatedId);
    if (!other) {
      gaps.push({
        tier: "recommended",
        code: "one_way_related_spec",
        message: `related_specs includes "${relatedId}" but that spec was not loaded for reciprocity check.`,
        penalty: 5,
      });
      continue;
    }
    if (!other.related_specs.includes(spec.id)) {
      gaps.push({
        tier: "recommended",
        code: "one_way_related_spec",
        message: `One-way related_specs link: ${spec.id} → ${relatedId}, but not the reverse.`,
        penalty: 5,
      });
    }
  }

  // Advisory: vague wording (no ceiling impact)
  for (const ac of active) {
    const blob = [ac.given, ac.when, ...ac.then].join(" ");
    if (VAGUE_PATTERNS.test(blob)) {
      gaps.push({
        tier: "advisory",
        code: "vague_wording",
        message: `${ac.id} uses vague wording that may not compile cleanly.`,
        acRef: ac.id,
        penalty: 0,
      });
    }
  }

  if (!foundationalPass) {
    return { foundationalPass: false, gaps, confidenceCeiling: null };
  }

  const recommendedPenalty = gaps
    .filter((g) => g.tier === "recommended")
    .reduce((sum, g) => sum + g.penalty, 0);

  const confidenceCeiling = Math.max(
    CEILING_FLOOR,
    CEILING_START - recommendedPenalty
  );

  return { foundationalPass: true, gaps, confidenceCeiling };
};
