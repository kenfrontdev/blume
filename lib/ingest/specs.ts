import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { parseSpecMarkdown } from "@/compiler/parse-spec";
import type { CanonicalSpec } from "@/compiler/types";
import { db } from "@/lib/db";
import { projects, specs } from "@/db/schema";

export const loadSpecFiles = (rootDir = process.cwd()): CanonicalSpec[] => {
  const dir = join(rootDir, "specs", "features");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseSpecMarkdown(readFileSync(join(dir, f), "utf8")));
};

export const ensureProject = async (
  projectId: string,
  name?: string
): Promise<void> => {
  await db
    .insert(projects)
    .values({
      id: projectId,
      name: name ?? projectId,
    })
    .onConflictDoNothing();
};

/**
 * Upsert authoring specs into Neon (§2 storage). Version is taken from
 * the file; status stays as authored (portal owns status transitions).
 */
export const ingestSpecs = async (options?: {
  projectId?: string;
  rootDir?: string;
}): Promise<{ upserted: string[] }> => {
  const projectId =
    options?.projectId ??
    process.env.CORIN_DEFAULT_PROJECT_SLUG ??
    "carromlive";
  const rootDir = options?.rootDir ?? process.cwd();

  await ensureProject(projectId);

  const files = loadSpecFiles(rootDir);
  const upserted: string[] = [];

  for (const spec of files) {
    const lastUpdated = new Date(spec.last_updated);
    await db
      .insert(specs)
      .values({
        id: spec.id,
        projectId,
        title: spec.title,
        surfaces: spec.surfaces,
        layer: spec.layer,
        version: spec.version,
        status: spec.status,
        source: spec.source,
        relatedSpecs: spec.related_specs,
        retryCap: spec.retry_cap,
        releaseThreshold:
          spec.release_threshold == null
            ? null
            : String(spec.release_threshold),
        summary: spec.summary,
        preconditions: spec.preconditions,
        acceptanceCriteria: spec.acceptance_criteria,
        edgeCases: spec.edge_cases,
        trailing: spec.trailing as unknown as Record<string, unknown>,
        outOfScope: spec.out_of_scope,
        lastUpdated: Number.isNaN(lastUpdated.getTime())
          ? new Date()
          : lastUpdated,
      })
      .onConflictDoUpdate({
        target: specs.id,
        set: {
          projectId,
          title: spec.title,
          surfaces: spec.surfaces,
          layer: spec.layer,
          version: spec.version,
          status: spec.status,
          source: spec.source,
          relatedSpecs: spec.related_specs,
          retryCap: spec.retry_cap,
          releaseThreshold:
            spec.release_threshold == null
              ? null
              : String(spec.release_threshold),
          summary: spec.summary,
          preconditions: spec.preconditions,
          acceptanceCriteria: spec.acceptance_criteria,
          edgeCases: spec.edge_cases,
          trailing: spec.trailing as unknown as Record<string, unknown>,
          outOfScope: spec.out_of_scope,
          lastUpdated: Number.isNaN(lastUpdated.getTime())
            ? new Date()
            : lastUpdated,
        },
      });
    upserted.push(spec.id);
  }

  return { upserted };
};

export const getProjectThreshold = async (
  projectId: string
): Promise<number> => {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const raw = rows[0]?.releaseThresholdDefault ?? "80";
  return Number(raw);
};

export { randomUUID };
