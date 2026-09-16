import type { CanonicalSpec } from "@/compiler/types";
import type { SpecRow } from "./queries";

/** Map a DB spec row into CanonicalSpec for completeness / ceiling display. */
export const specRowToCanonical = (row: SpecRow): CanonicalSpec => ({
  id: row.id,
  title: row.title,
  surfaces: row.surfaces,
  layer: row.layer,
  version: row.version,
  status: row.status,
  source: row.source,
  last_updated: row.lastUpdated.toISOString().slice(0, 10),
  related_specs: row.relatedSpecs,
  retry_cap: row.retryCap,
  release_threshold: row.releaseThreshold
    ? Number(row.releaseThreshold)
    : null,
  summary: row.summary,
  preconditions: row.preconditions,
  acceptance_criteria: row.acceptanceCriteria as CanonicalSpec["acceptance_criteria"],
  edge_cases: row.edgeCases as CanonicalSpec["edge_cases"],
  trailing: (row.trailing
    ? (row.trailing as unknown as CanonicalSpec["trailing"])
    : { type: "none" }),
  out_of_scope: row.outOfScope,
});
