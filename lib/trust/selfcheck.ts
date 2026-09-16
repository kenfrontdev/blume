/**
 * Trust-score + gate selfcheck (§0 / §7).
 * Run: npm run trust:selfcheck
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpecMarkdown } from "@/compiler/parse-spec";
import {
  computeTrustScore,
  evaluateCompleteness,
  evaluateReleaseGate,
  resultsFromSpecAssuming,
  CRITICALITY_WEIGHT,
  CEILING_FLOOR,
} from "@/lib/trust";

const root = process.cwd();
const joinLive = parseSpecMarkdown(
  readFileSync(join(root, "specs/features/join-live-match.md"), "utf8")
);
const matchJoin = parseSpecMarkdown(
  readFileSync(join(root, "specs/features/match-join-endpoint.md"), "utf8")
);

// Foundational pass on sample specs
const c1 = evaluateCompleteness(joinLive, [matchJoin]);
assert.equal(c1.foundationalPass, true);
assert.ok(c1.confidenceCeiling != null);
assert.ok(c1.confidenceCeiling! >= CEILING_FLOOR);

// join-live-match: AC-02 major has no edge → -7; UI states complete; preconditions present
// related_specs → match-join-endpoint which links back → no one-way penalty
const majorGap = c1.gaps.find(
  (g) => g.code === "missing_edge_case" && g.acRef === "AC-02"
);
assert.ok(majorGap);
assert.equal(majorGap!.penalty, CRITICALITY_WEIGHT.major);

// Perfect execution capped by ceiling
const passTrust = computeTrustScore(
  joinLive,
  resultsFromSpecAssuming(joinLive, true),
  [matchJoin]
);
assert.equal(passTrust.executionScore, 100);
assert.equal(passTrust.combined, passTrust.confidenceCeiling);
assert.equal(passTrust.hardStop, false);

const auto = evaluateReleaseGate({
  trust: passTrust,
  releaseThreshold: passTrust.combined! - 1,
  verificationStatus: "complete",
  unresolvedSwarmFlags: 0,
  unresolvedDriftFlags: 0,
});
assert.equal(auto.decision, "auto_ship");

const soft = evaluateReleaseGate({
  trust: passTrust,
  releaseThreshold: 99,
  verificationStatus: "complete",
  unresolvedSwarmFlags: 0,
  unresolvedDriftFlags: 0,
});
assert.equal(soft.decision, "soft_stop");

const failTrust = computeTrustScore(
  matchJoin,
  resultsFromSpecAssuming(matchJoin, false),
  [joinLive]
);
assert.equal(failTrust.executionScore, 0);
assert.equal(failTrust.combined, 0);

// Empty AC → hard stop
const empty = parseSpecMarkdown(`---
id: empty-spec
title: Empty
surfaces: [api]
layer: data
version: 1
status: draft
last_updated: 2026-09-16
---

## Summary
Nothing here.

## Acceptance Criteria
`);
const emptyTrust = computeTrustScore(empty, []);
assert.equal(emptyTrust.hardStop, true);
assert.equal(emptyTrust.combined, null);
const hard = evaluateReleaseGate({
  trust: emptyTrust,
  releaseThreshold: 80,
  verificationStatus: "complete",
  unresolvedSwarmFlags: 0,
  unresolvedDriftFlags: 0,
});
assert.equal(hard.decision, "hard_stop");

console.log("trust selfcheck passed");
console.log(
  JSON.stringify(
    {
      joinLiveCeiling: passTrust.confidenceCeiling,
      joinLiveCombined: passTrust.combined,
      matchJoinFailCombined: failTrust.combined,
    },
    null,
    2
  )
);
