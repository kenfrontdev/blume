#!/usr/bin/env npx tsx
/**
 * Ingest specs/features/*.md into Neon and optionally score + gate a build.
 *
 *   npm run ingest --
 *   npm run ingest -- --score join-live-match --assume pass
 *   npm run ingest -- --score match-join-endpoint --assume fail --record
 */
import "dotenv/config";
import { loadSpecFiles, ingestSpecs, getProjectThreshold } from "@/lib/ingest/specs";
import { recordBuildTrust, recordGateDecision } from "@/lib/ingest/builds";
import {
  computeTrustScore,
  evaluateReleaseGate,
  resultsFromSpecAssuming,
} from "@/lib/trust";

const args = process.argv.slice(2);
const scoreIdx = args.indexOf("--score");
const scoreId = scoreIdx >= 0 ? args[scoreIdx + 1] : undefined;
const assumeIdx = args.indexOf("--assume");
const assume = (assumeIdx >= 0 ? args[assumeIdx + 1] : "pass") as
  | "pass"
  | "fail";
const shouldRecord = args.includes("--record");

const projectId = process.env.CORIN_DEFAULT_PROJECT_SLUG ?? "carromlive";

const main = async () => {
  const { upserted } = await ingestSpecs({ projectId });
  console.log(`Ingested ${upserted.length} spec(s): ${upserted.join(", ")}`);

  if (!scoreId) return;

  const all = loadSpecFiles();
  const spec = all.find((s) => s.id === scoreId);
  if (!spec) {
    console.error(`Spec not found: ${scoreId}`);
    process.exit(1);
  }

  const related = all.filter((s) => spec.related_specs.includes(s.id));
  const results = resultsFromSpecAssuming(spec, assume === "pass");
  const trust = computeTrustScore(spec, results, related);
  const threshold =
    spec.release_threshold ?? (await getProjectThreshold(projectId));

  const gate = evaluateReleaseGate({
    trust,
    releaseThreshold: threshold,
    verificationStatus: "complete",
    unresolvedSwarmFlags: 0,
    unresolvedDriftFlags: 0,
  });

  console.log(
    JSON.stringify(
      {
        specId: spec.id,
        assume,
        executionScore: trust.executionScore,
        confidenceCeiling: trust.confidenceCeiling,
        combined: trust.combined,
        hardStop: trust.hardStop,
        gate,
        ceilingGaps: trust.trace.ceilingGaps.map((g) => ({
          code: g.code,
          penalty: g.penalty,
          message: g.message,
        })),
      },
      null,
      2
    )
  );

  if (shouldRecord) {
    const buildId = await recordBuildTrust({
      spec,
      trust,
      status:
        gate.decision === "auto_ship"
          ? "shipped"
          : trust.hardStop
            ? "blocked"
            : "passed",
      verificationStatus: "complete",
    });
    const gateId = await recordGateDecision({ buildId, gate });
    console.log(`Recorded build ${buildId}${gate.decision === "auto_ship" ? ` gate ${gateId}` : ""}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
