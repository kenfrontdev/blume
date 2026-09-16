CREATE TYPE "public"."build_status" AS ENUM('building', 'testing', 'blocked', 'passed', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."deviation_status" AS ENUM('standing_exception', 'permanent_rule');--> statement-breakpoint
CREATE TYPE "public"."drift_type" AS ENUM('silent', 'stale');--> statement-breakpoint
CREATE TYPE "public"."gate_decision" AS ENUM('auto_ship', 'approved', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."override_reason" AS ENUM('acknowledged_ambiguity', 'accepted_contract_mismatch', 'shipped_despite_incomplete_verification', 'accepted_score_below_threshold');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('quality_owner', 'contributor');--> statement-breakpoint
CREATE TYPE "public"."spec_layer" AS ENUM('ui', 'mobile', 'api', 'data');--> statement-breakpoint
CREATE TYPE "public"."spec_status" AS ENUM('draft', 'approved', 'building', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."swarm_note_type" AS ENUM('functional', 'contract-mismatch', 'ambiguity', 'style-deviation');--> statement-breakpoint
CREATE TYPE "public"."swarm_verdict" AS ENUM('pass', 'fail', 'blocked', 'ambiguous');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('complete', 'partial');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "build_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_id" text NOT NULL,
	"build_id" text,
	"ac_ref" text NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "builds" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_id" text NOT NULL,
	"spec_version" integer NOT NULL,
	"status" "build_status" DEFAULT 'building' NOT NULL,
	"verification_status" "verification_status",
	"execution_score" numeric,
	"confidence_ceiling" numeric,
	"trust_trace" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deviations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"spec_id" text NOT NULL,
	"ac_ref" text NOT NULL,
	"summary" text NOT NULL,
	"human_confirmation" text NOT NULL,
	"reasoning" text,
	"status" "deviation_status" DEFAULT 'standing_exception' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drift_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_id" text NOT NULL,
	"type" "drift_type" NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gate_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"build_id" text NOT NULL,
	"decision" "gate_decision" NOT NULL,
	"override_reason" "override_reason",
	"decided_by" text,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_roles" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "role" NOT NULL,
	CONSTRAINT "project_roles_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"retry_cap_default" integer DEFAULT 3 NOT NULL,
	"release_threshold_default" numeric DEFAULT '80' NOT NULL,
	"max_swarm_agents" integer DEFAULT 5 NOT NULL,
	"max_swarm_duration_minutes" integer DEFAULT 15 NOT NULL,
	"swarm_sizing" text DEFAULT 'dynamic' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retry_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"build_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" text NOT NULL,
	"failure_detail" jsonb,
	"rationale" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"surfaces" jsonb NOT NULL,
	"layer" "spec_layer" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "spec_status" DEFAULT 'draft' NOT NULL,
	"source" text,
	"related_specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retry_cap" integer,
	"release_threshold" numeric,
	"summary" text NOT NULL,
	"preconditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"edge_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trailing" jsonb,
	"out_of_scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "swarm_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"build_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"layer" text NOT NULL,
	"spec_id" text NOT NULL,
	"ac_ref" text NOT NULL,
	"verdict" "swarm_verdict" NOT NULL,
	"type" "swarm_note_type" NOT NULL,
	"evidence" text,
	"rationale" text,
	"confidence" numeric,
	"blocks" jsonb,
	"round" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "build_notes" ADD CONSTRAINT "build_notes_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "build_notes" ADD CONSTRAINT "build_notes_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "builds" ADD CONSTRAINT "builds_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deviations" ADD CONSTRAINT "deviations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deviations" ADD CONSTRAINT "deviations_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drift_flags" ADD CONSTRAINT "drift_flags_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gate_decisions" ADD CONSTRAINT "gate_decisions_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retry_attempts" ADD CONSTRAINT "retry_attempts_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specs" ADD CONSTRAINT "specs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "swarm_notes" ADD CONSTRAINT "swarm_notes_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "swarm_notes" ADD CONSTRAINT "swarm_notes_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
