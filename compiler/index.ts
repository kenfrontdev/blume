import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseSpecFile, parseSpecMarkdown } from "./parse-spec";
import { toIntermediate, type ToIntermediateOptions } from "./to-intermediate";
import { emitPlaywright } from "./emitters/playwright";
import { emitMaestro } from "./emitters/maestro";
import type { CanonicalSpec, IntermediateForm } from "./types";

export interface CompileResult {
  spec: CanonicalSpec;
  intermediate: IntermediateForm;
  paths: {
    canonicalJson: string;
    intermediateJson: string;
    playwright: string;
    maestro: string[];
  };
}

export interface CompileOptions extends ToIntermediateOptions {
  rootDir?: string;
  /** When true, skip writing Playwright/Maestro (IR + canonical only). */
  irOnly?: boolean;
}

const ensureDir = (filePath: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

/** §6: reject related_specs cycles longer than a mutual pair (A↔B is required). */
export const assertNoRelatedSpecCycles = (
  root: CanonicalSpec,
  catalog: CanonicalSpec[]
): void => {
  const byId = new Map(catalog.map((s) => [s.id, s]));

  const dfs = (id: string, stack: string[]): void => {
    const cycleAt = stack.indexOf(id);
    if (cycleAt !== -1) {
      const cycle = [...stack.slice(cycleAt), id];
      // Mutual A↔B is length-2 cycle (3 nodes in path listing) — allowed.
      if (cycle.length > 3) {
        throw new Error(
          `Circular related_specs chain rejected: ${cycle.join(" → ")}`
        );
      }
      return;
    }
    const node = byId.get(id);
    for (const next of node?.related_specs ?? []) {
      dfs(next, [...stack, id]);
    }
  };

  dfs(root.id, []);
};

export const loadFeatureCatalog = (rootDir: string): CanonicalSpec[] => {
  const dir = join(rootDir, "specs", "features");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseSpecMarkdown(readFileSync(join(dir, f), "utf8")));
};

/**
 * Compile a feature spec id end-to-end (§4).
 * One-way only: never writes back to the authoring spec.
 */
export const compileSpec = async (
  specId: string,
  options: CompileOptions = {}
): Promise<CompileResult> => {
  const root = options.rootDir ?? process.cwd();
  const specPath = join(root, "specs", "features", `${specId}.md`);
  if (!existsSync(specPath)) {
    throw new Error(`No spec found at ${specPath}`);
  }

  const spec = parseSpecFile(specPath);
  if (spec.id !== specId) {
    throw new Error(
      `Spec file id mismatch: filename "${specId}" vs frontmatter id "${spec.id}"`
    );
  }

  const catalog = loadFeatureCatalog(root);
  assertNoRelatedSpecCycles(spec, catalog);

  const intermediate = await toIntermediate(spec, {
    seed: options.seed,
    resolver: options.resolver ?? "heuristic",
    a11yTree: options.a11yTree,
  });

  const canonicalJson = join(root, "specs", "compiled", `${specId}.canonical.json`);
  const intermediateJson = join(root, "specs", "compiled", `${specId}.json`);
  const playwrightPath = join(root, "tests", `${specId}.spec.ts`);
  const maestroDir = join(root, "tests", "maestro");

  ensureDir(canonicalJson);
  ensureDir(intermediateJson);
  writeFileSync(canonicalJson, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  writeFileSync(
    intermediateJson,
    `${JSON.stringify(intermediate, null, 2)}\n`,
    "utf8"
  );

  const maestroPaths: string[] = [];

  if (!options.irOnly) {
    ensureDir(playwrightPath);
    writeFileSync(playwrightPath, emitPlaywright(intermediate), "utf8");

    const maestroFiles = emitMaestro(intermediate);
    for (const [name, contents] of Object.entries(maestroFiles)) {
      const out = join(maestroDir, name);
      ensureDir(out);
      writeFileSync(out, contents, "utf8");
      maestroPaths.push(out);
    }
  }

  return {
    spec,
    intermediate,
    paths: {
      canonicalJson,
      intermediateJson,
      playwright: playwrightPath,
      maestro: maestroPaths,
    },
  };
};

export { parseSpecFile, parseSpecMarkdown } from "./parse-spec";
export { toIntermediate } from "./to-intermediate";
export { emitPlaywright } from "./emitters/playwright";
export { emitMaestro } from "./emitters/maestro";
export type * from "./types";
