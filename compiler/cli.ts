#!/usr/bin/env npx tsx
/**
 * Corin compiler CLI (§4).
 *
 *   npm run compile -- <spec-id> [--seed <hex>] [--ir-only] [--llm]
 */
import { compileSpec } from "./index";
import { readFileSync, existsSync } from "node:fs";
import type { A11yNode } from "./resolve-targets-llm";

const args = process.argv.slice(2);
const specId = args.find((a) => !a.startsWith("--"));
const seedIdx = args.indexOf("--seed");
const seed = seedIdx >= 0 ? args[seedIdx + 1] : undefined;
const irOnly = args.includes("--ir-only");
const useLlm = args.includes("--llm");
const a11yIdx = args.indexOf("--a11y");
const a11yPath = a11yIdx >= 0 ? args[a11yIdx + 1] : undefined;

if (!specId) {
  console.error(
    "Usage: npm run compile -- <spec-id> [--seed <hex>] [--ir-only] [--llm] [--a11y tree.json]"
  );
  process.exit(1);
}

let a11yTree: A11yNode | null = null;
if (a11yPath) {
  if (!existsSync(a11yPath)) {
    console.error(`a11y tree not found: ${a11yPath}`);
    process.exit(1);
  }
  a11yTree = JSON.parse(readFileSync(a11yPath, "utf8")) as A11yNode;
}

compileSpec(specId, {
  seed,
  irOnly,
  resolver: useLlm ? "llm" : "heuristic",
  a11yTree,
})
  .then((result) => {
    console.log(`Compiled ${result.spec.id}@v${result.spec.version}`);
    console.log(`  canonical:    ${result.paths.canonicalJson}`);
    console.log(`  intermediate: ${result.paths.intermediateJson}`);
    if (!irOnly) {
      console.log(`  playwright:   ${result.paths.playwright}`);
      for (const m of result.paths.maestro) {
        console.log(`  maestro:      ${m}`);
      }
    }
    if (result.intermediate.notes.length) {
      console.log("Notes:");
      for (const note of result.intermediate.notes) {
        console.log(`  - ${note}`);
      }
    }
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
