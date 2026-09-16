import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "@/lib/db";
import {
  builds,
  driftFlags,
  gateDecisions,
  projects,
  retryAttempts,
  specs,
  swarmNotes,
} from "@/db/schema";
import { derivePortalStatus, type PortalStatus } from "./status";
import { clusterByRelatedSpecs, type SpecCluster } from "./clusters";

export type ProjectRow = typeof projects.$inferSelect;
export type SpecRow = typeof specs.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;
export type SwarmNoteRow = typeof swarmNotes.$inferSelect;
export type DriftFlagRow = typeof driftFlags.$inferSelect;
export type GateDecisionRow = typeof gateDecisions.$inferSelect;
export type RetryAttemptRow = typeof retryAttempts.$inferSelect;

export interface PortalEmpty {
  empty: true;
  reason: "no_database" | "query_failed" | "not_found";
  message: string;
}

export interface SpecWithLatestBuild extends SpecRow {
  latestBuild: BuildRow | null;
  portalStatus: PortalStatus;
}

export interface DashboardData {
  empty: false;
  project: ProjectRow;
  projects: ProjectRow[];
  clusters: SpecCluster<SpecWithLatestBuild>[];
  specs: SpecWithLatestBuild[];
}

export interface BuildDetailData {
  empty: false;
  project: ProjectRow;
  projects: ProjectRow[];
  build: BuildRow;
  spec: SpecRow;
  retries: RetryAttemptRow[];
  swarmNotes: SwarmNoteRow[];
  driftFlags: DriftFlagRow[];
  gateDecisions: GateDecisionRow[];
  timeline: TimelineEvent[];
}

export interface SpecDetailData {
  empty: false;
  project: ProjectRow;
  projects: ProjectRow[];
  spec: SpecRow;
  markdown: string | null;
  builds: BuildRow[];
}

export type TimelineKind =
  | "build_created"
  | "retry"
  | "swarm"
  | "drift"
  | "gate"
  | "trust";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: Date;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
}

export interface SearchHit {
  type: "project" | "spec" | "build";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  projectId: string;
}

const NO_DB: PortalEmpty = {
  empty: true,
  reason: "no_database",
  message:
    "Database is not configured. Set BLUMEDB_DATABASE_URL (or DATABASE_URL) to load live portal data.",
};

const asEmpty = (reason: PortalEmpty["reason"], message: string): PortalEmpty => ({
  empty: true,
  reason,
  message,
});

const isPortalEmpty = (value: unknown): value is PortalEmpty =>
  Boolean(value && typeof value === "object" && "empty" in value && (value as PortalEmpty).empty === true);

export const readSpecMarkdown = (specId: string): string | null => {
  const path = join(process.cwd(), "specs", "features", `${specId}.md`);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

const latestBuildBySpec = async (
  specIds: string[]
): Promise<Map<string, BuildRow>> => {
  const db = getDb()!;
  if (specIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(builds)
    .where(inArray(builds.specId, specIds))
    .orderBy(desc(builds.createdAt));

  const map = new Map<string, BuildRow>();
  for (const row of rows) {
    if (!map.has(row.specId)) map.set(row.specId, row);
  }
  return map;
};

export const listProjects = async (): Promise<ProjectRow[] | PortalEmpty> => {
  const db = getDb();
  if (!db) return NO_DB;
  try {
    return await db.select().from(projects).orderBy(projects.name);
  } catch (err) {
    return asEmpty(
      "query_failed",
      err instanceof Error ? err.message : "Failed to list projects."
    );
  }
};

export const getProjectDashboard = async (
  projectId: string
): Promise<DashboardData | PortalEmpty> => {
  const db = getDb();
  if (!db) return NO_DB;

  try {
    const [projectRows, allProjects, specRows] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select().from(projects).orderBy(projects.name),
      db.select().from(specs).where(eq(specs.projectId, projectId)),
    ]);

    const project = projectRows[0];
    if (!project) {
      return asEmpty("not_found", `Project "${projectId}" was not found.`);
    }

    const latest = await latestBuildBySpec(specRows.map((s) => s.id));
    const withBuilds: SpecWithLatestBuild[] = specRows.map((spec) => {
      const latestBuild = latest.get(spec.id) ?? null;
      return {
        ...spec,
        latestBuild,
        portalStatus: derivePortalStatus({
          buildStatus: latestBuild?.status,
          verificationStatus: latestBuild?.verificationStatus,
          specStatus: spec.status,
        }),
      };
    });

    return {
      empty: false,
      project,
      projects: allProjects,
      specs: withBuilds,
      clusters: clusterByRelatedSpecs(withBuilds),
    };
  } catch (err) {
    return asEmpty(
      "query_failed",
      err instanceof Error ? err.message : "Failed to load dashboard."
    );
  }
};

const buildTimeline = (input: {
  build: BuildRow;
  retries: RetryAttemptRow[];
  swarm: SwarmNoteRow[];
  drift: DriftFlagRow[];
  gates: GateDecisionRow[];
}): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  events.push({
    id: `build-${input.build.id}`,
    kind: "build_created",
    at: input.build.createdAt,
    title: "Build started",
    detail: `Spec ${input.build.specId} @ v${input.build.specVersion}`,
  });

  if (input.build.trustTrace) {
    events.push({
      id: `trust-${input.build.id}`,
      kind: "trust",
      at: input.build.updatedAt,
      title: "Trust score computed",
      detail: `Execution ${input.build.executionScore ?? "—"} · ceiling ${input.build.confidenceCeiling ?? "—"}`,
      meta: { trustTrace: input.build.trustTrace },
    });
  }

  for (const retry of input.retries) {
    events.push({
      id: `retry-${retry.id}`,
      kind: "retry",
      at: retry.createdAt,
      title: `Retry attempt #${retry.attemptNumber} — ${retry.status}`,
      detail: retry.rationale ?? undefined,
      meta: { failureDetail: retry.failureDetail ?? undefined },
    });
  }

  for (const note of input.swarm) {
    events.push({
      id: `swarm-${note.id}`,
      kind: "swarm",
      at: note.createdAt,
      title: `Swarm ${note.type} · ${note.verdict}`,
      detail: note.rationale ?? note.evidence ?? undefined,
      meta: {
        agentId: note.agentId,
        layer: note.layer,
        acRef: note.acRef,
        noteId: note.id,
      },
    });
  }

  for (const flag of input.drift) {
    events.push({
      id: `drift-${flag.id}`,
      kind: "drift",
      at: flag.detectedAt,
      title: `Drift flagged (${flag.type})`,
      detail: flag.resolved ? "Resolved" : "Unresolved",
      meta: { driftId: flag.id, resolved: flag.resolved },
    });
  }

  for (const gate of input.gates) {
    events.push({
      id: `gate-${gate.id}`,
      kind: "gate",
      at: gate.decidedAt,
      title: `Gate ${gate.decision}`,
      detail: gate.overrideReason
        ? `Override reason: ${gate.overrideReason}`
        : undefined,
      meta: {
        decision: gate.decision,
        overrideReason: gate.overrideReason,
        decidedBy: gate.decidedBy,
      },
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
};

export const getBuildDetail = async (
  projectId: string,
  buildId: string
): Promise<BuildDetailData | PortalEmpty> => {
  const db = getDb();
  if (!db) return NO_DB;

  try {
    const [buildRows, allProjects] = await Promise.all([
      db.select().from(builds).where(eq(builds.id, buildId)).limit(1),
      db.select().from(projects).orderBy(projects.name),
    ]);

    const build = buildRows[0];
    if (!build) {
      return asEmpty("not_found", `Build "${buildId}" was not found.`);
    }

    const [specRows, projectRows, retries, swarm, drift, gates] =
      await Promise.all([
        db.select().from(specs).where(eq(specs.id, build.specId)).limit(1),
        db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
        db
          .select()
          .from(retryAttempts)
          .where(eq(retryAttempts.buildId, buildId))
          .orderBy(retryAttempts.attemptNumber),
        db
          .select()
          .from(swarmNotes)
          .where(eq(swarmNotes.buildId, buildId))
          .orderBy(swarmNotes.createdAt),
        db.select().from(driftFlags).where(eq(driftFlags.specId, build.specId)),
        db
          .select()
          .from(gateDecisions)
          .where(eq(gateDecisions.buildId, buildId))
          .orderBy(desc(gateDecisions.decidedAt)),
      ]);

    const spec = specRows[0];
    const project = projectRows[0];
    if (!spec || !project || spec.projectId !== projectId) {
      return asEmpty(
        "not_found",
        `Build "${buildId}" is not in project "${projectId}".`
      );
    }

    return {
      empty: false,
      project,
      projects: allProjects,
      build,
      spec,
      retries,
      swarmNotes: swarm,
      driftFlags: drift,
      gateDecisions: gates,
      timeline: buildTimeline({
        build,
        retries,
        swarm,
        drift,
        gates,
      }),
    };
  } catch (err) {
    return asEmpty(
      "query_failed",
      err instanceof Error ? err.message : "Failed to load build."
    );
  }
};

export const getSpecDetail = async (
  projectId: string,
  specId: string
): Promise<SpecDetailData | PortalEmpty> => {
  const db = getDb();
  if (!db) return NO_DB;

  try {
    const [specRows, projectRows, allProjects, buildRows] = await Promise.all([
      db.select().from(specs).where(eq(specs.id, specId)).limit(1),
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select().from(projects).orderBy(projects.name),
      db
        .select()
        .from(builds)
        .where(eq(builds.specId, specId))
        .orderBy(desc(builds.createdAt)),
    ]);

    const spec = specRows[0];
    const project = projectRows[0];
    if (!spec || !project || spec.projectId !== projectId) {
      return asEmpty(
        "not_found",
        `Spec "${specId}" was not found in project "${projectId}".`
      );
    }

    return {
      empty: false,
      project,
      projects: allProjects,
      spec,
      markdown: readSpecMarkdown(specId),
      builds: buildRows,
    };
  } catch (err) {
    return asEmpty(
      "query_failed",
      err instanceof Error ? err.message : "Failed to load spec."
    );
  }
};

export const searchPortal = async (
  q: string,
  options?: { projectId?: string; limit?: number }
): Promise<SearchHit[] | PortalEmpty> => {
  const db = getDb();
  if (!db) return NO_DB;

  const query = q.trim();
  if (!query) return [];

  const limit = options?.limit ?? 20;
  const pattern = `%${query}%`;

  try {
    const specMatch = or(ilike(specs.id, pattern), ilike(specs.title, pattern));
    const buildMatch = or(
      ilike(builds.id, pattern),
      ilike(builds.specId, pattern)
    );

    const [projectHits, specHits, buildHits] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(or(ilike(projects.id, pattern), ilike(projects.name, pattern)))
        .limit(limit),
      db
        .select()
        .from(specs)
        .where(
          options?.projectId
            ? and(eq(specs.projectId, options.projectId), specMatch)
            : specMatch
        )
        .limit(limit),
      db
        .select({
          build: builds,
          spec: specs,
        })
        .from(builds)
        .innerJoin(specs, eq(builds.specId, specs.id))
        .where(
          options?.projectId
            ? and(eq(specs.projectId, options.projectId), buildMatch)
            : buildMatch
        )
        .limit(limit),
    ]);

    const hits: SearchHit[] = [];

    for (const p of projectHits) {
      hits.push({
        type: "project",
        id: p.id,
        title: p.name,
        subtitle: "Project",
        href: `/p/${p.id}`,
        projectId: p.id,
      });
    }

    for (const s of specHits) {
      hits.push({
        type: "spec",
        id: s.id,
        title: s.title,
        subtitle: `Spec · ${s.layer} · ${s.status}`,
        href: `/p/${s.projectId}/specs/${s.id}`,
        projectId: s.projectId,
      });
    }

    for (const row of buildHits) {
      hits.push({
        type: "build",
        id: row.build.id,
        title: `Build ${row.build.id.slice(0, 8)}…`,
        subtitle: `${row.spec.title} · ${row.build.status}`,
        href: `/p/${row.spec.projectId}/builds/${row.build.id}`,
        projectId: row.spec.projectId,
      });
    }

    return hits.slice(0, limit);
  } catch (err) {
    return asEmpty(
      "query_failed",
      err instanceof Error ? err.message : "Search failed."
    );
  }
};

export { isPortalEmpty };
