import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * Corin database schema.
 *
 * Maps directly onto the decision log's data model — see the section
 * references in each table's comment. This is the source of truth for
 * shape; keep it in sync with the decision log the same way §2 says the
 * canonical JSON schema must stay in sync with the DSL.
 */

// ---------------------------------------------------------------------------
// §10 — Projects (top-level container)
// ---------------------------------------------------------------------------

export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // e.g. "carromlive"
  name: text("name").notNull(),

  // §5 / §6 / §7 — per-project config defaults
  retryCapDefault: integer("retry_cap_default").notNull().default(3),
  releaseThresholdDefault: numeric("release_threshold_default")
    .notNull()
    .default("80"),
  maxSwarmAgents: integer("max_swarm_agents").notNull().default(5),
  maxSwarmDurationMinutes: integer("max_swarm_duration_minutes")
    .notNull()
    .default(15),
  swarmSizing: text("swarm_sizing", { enum: ["dynamic", "fixed"] })
    .notNull()
    .default("dynamic"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §2 — Specs (canonical JSON, stored as structured columns + jsonb for the
// nested arrays). `id` is the human-chosen spec id (e.g. "join-live-match"),
// stable across versions — see §2's id-stability rule.
// ---------------------------------------------------------------------------

export const specLayerEnum = pgEnum("spec_layer", [
  "ui",
  "mobile",
  "api",
  "data",
]);
export const specStatusEnum = pgEnum("spec_status", [
  "draft",
  "approved",
  "building",
  "shipped",
]);

export const specs = pgTable("specs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),

  title: text("title").notNull(),
  surfaces: jsonb("surfaces").notNull().$type<string[]>(), // e.g. ["web","ios"]
  layer: specLayerEnum("layer").notNull(),
  version: integer("version").notNull().default(1),
  status: specStatusEnum("status").notNull().default("draft"),

  source: text("source"), // link back to the ideation conversation, §1
  relatedSpecs: jsonb("related_specs").notNull().default([]).$type<string[]>(),

  // §5 / §7 — per-spec overrides; null means "use project default"
  retryCap: integer("retry_cap"),
  releaseThreshold: numeric("release_threshold"),

  summary: text("summary").notNull(),
  preconditions: jsonb("preconditions").notNull().default([]).$type<string[]>(),

  // Each: { id, title, criticality, status, given, when, then: string[] }
  acceptanceCriteria: jsonb("acceptance_criteria").notNull().$type<unknown[]>(),
  // Each: { id, ref, title, given, when, then: string[] }
  edgeCases: jsonb("edge_cases").notNull().default([]).$type<unknown[]>(),

  // Tagged union: { type: "ui_states" | "interface_contract" | "none", ... }
  trailing: jsonb("trailing").$type<Record<string, unknown>>(),

  outOfScope: jsonb("out_of_scope").notNull().default([]).$type<string[]>(),

  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §3 / §5 / §7 — Builds. One row per build attempt cycle against a spec
// version. Holds the live trust numbers and gate outcome.
// ---------------------------------------------------------------------------

export const buildStatusEnum = pgEnum("build_status", [
  "building",
  "testing",
  "blocked",
  "passed",
  "shipped",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "complete",
  "partial",
]);

export const builds = pgTable("builds", {
  id: text("id").primaryKey(), // uuid, generated at build time
  specId: text("spec_id")
    .notNull()
    .references(() => specs.id),
  specVersion: integer("spec_version").notNull(), // pins which version was built

  status: buildStatusEnum("status").notNull().default("building"),
  verificationStatus: verificationStatusEnum("verification_status"),

  // §0 — the two live numbers, snapshotted immutably once the build settles
  executionScore: numeric("execution_score"),
  confidenceCeiling: numeric("confidence_ceiling"),
  // §0 — full computation trace: which criteria passed/failed, which gaps
  // capped the ceiling. Needed for the root-cause chat, §7.
  trustTrace: jsonb("trust_trace").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §5 — Retry attempts. One row per build-agent attempt within a build cycle.
// ---------------------------------------------------------------------------

export const retryAttempts = pgTable("retry_attempts", {
  id: text("id").primaryKey(),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id),
  attemptNumber: integer("attempt_number").notNull(),

  status: text("status", { enum: ["pass", "fail"] }).notNull(),
  failureDetail: jsonb("failure_detail").$type<Record<string, unknown>>(),
  // §3 / §9 — the agent's reasoning at this attempt, not just outcome.
  rationale: text("rationale"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §3 — Build notes. Ambiguity-handling notes the build agent logs while
// building, tagged to a specific Acceptance Criterion.
// ---------------------------------------------------------------------------

export const buildNotes = pgTable("build_notes", {
  id: text("id").primaryKey(),
  specId: text("spec_id")
    .notNull()
    .references(() => specs.id),
  buildId: text("build_id").references(() => builds.id),
  acRef: text("ac_ref").notNull(), // e.g. "AC-01"
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §6 — Swarm notes. The shared blackboard schema, one row per note posted
// by any worker (coordination or ambiguity-detection mode).
// ---------------------------------------------------------------------------

export const swarmVerdictEnum = pgEnum("swarm_verdict", [
  "pass",
  "fail",
  "blocked",
  "ambiguous",
]);
export const swarmNoteTypeEnum = pgEnum("swarm_note_type", [
  "functional",
  "contract-mismatch",
  "ambiguity",
  "style-deviation",
]);

export const swarmNotes = pgTable("swarm_notes", {
  id: text("id").primaryKey(),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id),
  agentId: text("agent_id").notNull(),
  layer: text("layer").notNull(), // "api" | "ui" | etc.
  specId: text("spec_id")
    .notNull()
    .references(() => specs.id),
  acRef: text("ac_ref").notNull(),

  verdict: swarmVerdictEnum("verdict").notNull(),
  type: swarmNoteTypeEnum("type").notNull(),
  evidence: text("evidence"),
  rationale: text("rationale"),
  confidence: numeric("confidence"),
  blocks: jsonb("blocks").$type<string[]>(),
  round: integer("round"), // set only during a debate escalation

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §8 — Drift flags.
// ---------------------------------------------------------------------------

export const driftTypeEnum = pgEnum("drift_type", ["silent", "stale"]);

export const driftFlags = pgTable("drift_flags", {
  id: text("id").primaryKey(),
  specId: text("spec_id")
    .notNull()
    .references(() => specs.id),
  type: driftTypeEnum("type").notNull(),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolved: boolean("resolved").notNull().default(false),
});

// ---------------------------------------------------------------------------
// §9 — Confirmed-deviations store. Scoped per-project.
// ---------------------------------------------------------------------------

export const deviationStatusEnum = pgEnum("deviation_status", [
  "standing_exception",
  "permanent_rule",
]);

export const deviations = pgTable("deviations", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  specId: text("spec_id")
    .notNull()
    .references(() => specs.id),
  acRef: text("ac_ref").notNull(),

  summary: text("summary").notNull(),
  humanConfirmation: text("human_confirmation").notNull(),
  reasoning: text("reasoning"),
  status: deviationStatusEnum("status").notNull().default("standing_exception"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §7 — Gate decisions. One row per release-gate outcome on a build.
// ---------------------------------------------------------------------------

export const gateDecisionEnum = pgEnum("gate_decision", [
  "auto_ship",
  "approved",
  "overridden",
]);
export const overrideReasonEnum = pgEnum("override_reason", [
  "acknowledged_ambiguity",
  "accepted_contract_mismatch",
  "shipped_despite_incomplete_verification",
  "accepted_score_below_threshold",
]);

export const gateDecisions = pgTable("gate_decisions", {
  id: text("id").primaryKey(),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id),
  decision: gateDecisionEnum("decision").notNull(),
  overrideReason: overrideReasonEnum("override_reason"),
  decidedBy: text("decided_by"), // external auth provider's user id, §11
  decidedAt: timestamp("decided_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// §11 — Roles. Auth/identity lives with the external provider; this table
// only maps a provider user id to a role, scoped per project.
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["quality_owner", "contributor"]);

export const projectRoles = pgTable(
  "project_roles",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    userId: text("user_id").notNull(), // id from the external auth provider
    role: roleEnum("role").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
  })
);
