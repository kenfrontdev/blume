/**
 * Swarm + drift selfcheck.
 * Run: npm run swarm:selfcheck
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpecMarkdown } from "@/compiler/parse-spec";
import {
  proposeSwarmShape,
  runSwarm,
  unresolvedSwarmFlagCount,
} from "@/lib/swarm/orchestrate";
import { detectDrift } from "@/lib/drift/detect";

const main = async () => {
  const root = process.cwd();
  const joinLive = parseSpecMarkdown(
    readFileSync(join(root, "specs/features/join-live-match.md"), "utf8")
  );
  const matchJoin = parseSpecMarkdown(
    readFileSync(join(root, "specs/features/match-join-endpoint.md"), "utf8")
  );

  const shape = proposeSwarmShape(joinLive, [matchJoin], {
    maxAgents: 5,
    maxDurationMinutes: 15,
    sizing: "dynamic",
  });
  assert.ok(shape.workers.length >= 2, "expects ui + related api workers");

  const notes = await runSwarm({
    buildId: "selfcheck",
    spec: joinLive,
    related: [matchJoin],
    shape,
    persist: false,
  });
  assert.ok(notes.length > 0);
  assert.equal(typeof unresolvedSwarmFlagCount(notes), "number");

  const drift = detectDrift([joinLive, matchJoin]);
  // same version → no version-mismatch drift
  assert.equal(
    drift.filter((d) => d.type === "silent").length,
    0
  );

  console.log("swarm selfcheck passed");
  console.log(
    JSON.stringify(
      {
        workers: shape.workers.map((w) => w.agentId),
        notes: notes.length,
        flags: unresolvedSwarmFlagCount(notes),
      },
      null,
      2
    )
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
