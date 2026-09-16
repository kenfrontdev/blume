import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseSpecFile } from "./parse-spec";
import { toIntermediate } from "./to-intermediate";
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

export interface CompileOptions {
  rootDir?: string;
  seed?: string;
  /** When true, skip writing Playwright/Maestro (IR + canonical only). */
  irOnly?: boolean;
}

const ensureDir = (filePath: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

/**
 * Compile a feature spec id end-to-end:
 *   specs/features/{id}.md
 *     → canonical JSON (in-memory / optional write)
 *     → specs/compiled/{id}.json  (intermediate form)
 *     → tests/{id}.spec.ts        (Playwright)
 *     → tests/maestro/{id}-*.yaml (Maestro, when ios/mobile)
 *
 * One-way only: never writes back to the authoring spec (§4).
 */
export const compileSpec = (
  specId: string,
  options: CompileOptions = {}
): CompileResult => {
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

  const intermediate = toIntermediate(spec, { seed: options.seed });

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
