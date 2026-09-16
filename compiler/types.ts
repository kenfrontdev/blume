/**
 * Canonical spec JSON + compiler intermediate form.
 * Shape matches specs/docs/blume-decision-log.md §2 / §4.
 */

export type SpecLayer = "ui" | "mobile" | "api" | "data";
export type SpecStatus = "draft" | "approved" | "building" | "shipped";
export type Criticality = "critical" | "major" | "minor";
export type CriterionStatus = "active" | "removed";

export interface AcceptanceCriterion {
  id: string;
  title: string;
  criticality: Criticality;
  status: CriterionStatus;
  given: string;
  when: string;
  then: string[];
  removedInVersion?: number;
}

export interface EdgeCase {
  id: string;
  ref: string;
  title: string;
  given: string;
  when: string;
  then: string[];
}

export interface UiStatesTrailing {
  type: "ui_states";
  surfaces: Record<
    string,
    {
      loading?: string;
      empty?: string;
      error?: string;
      success?: string;
    }
  >;
}

export interface InterfaceContractTrailing {
  type: "interface_contract";
  method: string;
  path: string;
  request: Record<string, unknown>;
  responses: Array<{
    status: number;
    body?: Record<string, unknown> | string;
    description?: string;
  }>;
}

export interface NoneTrailing {
  type: "none";
}

export type TrailingSection =
  | UiStatesTrailing
  | InterfaceContractTrailing
  | NoneTrailing;

export interface CanonicalSpec {
  id: string;
  title: string;
  surfaces: string[];
  layer: SpecLayer;
  version: number;
  status: SpecStatus;
  source: string | null;
  last_updated: string;
  related_specs: string[];
  retry_cap: number | null;
  release_threshold: number | null;
  summary: string;
  preconditions: string[];
  acceptance_criteria: AcceptanceCriterion[];
  edge_cases: EdgeCase[];
  trailing: TrailingSection;
  out_of_scope: string[];
}

/** Framework-agnostic action list (§4). */
export type IntermediateAction =
  | { action: "setup"; description: string; fixture?: Record<string, unknown> }
  | {
      action: "tap" | "click";
      target: string;
      resolved?: ResolvedTarget;
    }
  | {
      action: "assert";
      assert:
        | "elementVisible"
        | "elementText"
        | "elementInViewport"
        | "httpStatus"
        | "httpBody"
        | "noPartialState";
      target: string;
      expected?: string | number | Record<string, unknown>;
      timeoutMs?: number;
      resolved?: ResolvedTarget;
    }
  | {
      action: "http";
      method: string;
      path: string;
      body?: Record<string, unknown>;
    }
  | { action: "wait"; timeoutMs: number; reason: string };

export interface ResolvedTarget {
  strategy: "role" | "text" | "testid" | "css" | "unresolved";
  value: string;
  name?: string;
  source: "heuristic" | "llm" | "contract";
  inViewportCheck: boolean;
}

export interface IntermediateScenario {
  id: string;
  kind: "acceptance" | "edge" | "composed";
  title: string;
  ref?: string;
  criticality?: Criticality;
  steps: IntermediateAction[];
}

export interface IntermediateForm {
  specId: string;
  specVersion: number;
  layer: SpecLayer;
  surfaces: string[];
  compiledAt: string;
  seed: string;
  concreteValues: Record<string, string | number>;
  scenarios: IntermediateScenario[];
  notes: string[];
}
