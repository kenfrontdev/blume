#!/usr/bin/env npx tsx
/**
 * Corin compiler CLI (§4).
 *
 * Usage:
 *   npm run compile -- <spec-id> [--seed <hex>] [--ir-only]
 *   npm run compile -- join-live-match
 *   npm run compile -- match-join-endpoint --seed deadbeef
 */
import { compileSpec } from "./index";

const args = process.argv.slice(2);
const specId = args.find((a) => !a.startsWith("--"));
const seedIdx = args.indexOf("--seed");
const seed = seedIdx >= 0 ? args[seedIdx + 1] : undefined;
const irOnly = args.includes("--ir-only");

if (!specId) {
  console.error(
    "Usage: npm run compile -- <spec-id> [--seed <hex>] [--ir-only]"
  );
  process.exit(1);
}

try {
  const result = compileSpec(specId, { seed, irOnly });
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
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
