import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CanonicalSpec } from "@/compiler/types";
import type { CriterionTestResult } from "@/lib/trust/types";

export type PlaywrightJsonReport = {
  suites?: Array<{
    title?: string;
    suites?: PlaywrightJsonReport["suites"];
    specs?: Array<{
      title: string;
      ok?: boolean;
      tests?: Array<{
        results?: Array<{ status?: string }>;
      }>;
    }>;
  }>;
};

const collectSpecs = (
  suites: PlaywrightJsonReport["suites"],
  out: Array<{ title: string; passed: boolean }> = []
): Array<{ title: string; passed: boolean }> => {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const statuses =
        spec.tests?.flatMap((t) => t.results?.map((r) => r.status) ?? []) ??
        [];
      const passed =
        spec.ok === true ||
        (statuses.length > 0 && statuses.every((s) => s === "passed"));
      out.push({ title: spec.title, passed });
    }
    collectSpecs(suite.suites, out);
  }
  return out;
};

const parseIdFromTitle = (
  title: string
): { id: string; kind: CriterionTestResult["kind"] } | null => {
  const m = title.match(/^(AC-\d+|EC-\d+|COMPOSED)\b/);
  if (!m) return null;
  const id = m[1];
  if (id === "COMPOSED") return { id, kind: "composed" };
  if (id.startsWith("EC-")) return { id, kind: "edge" };
  return { id, kind: "acceptance" };
};

/**
 * Map a Playwright JSON reporter file onto CriterionTestResult[] for §0.
 */
export const resultsFromPlaywrightReport = (
  spec: CanonicalSpec,
  reportPath: string
): CriterionTestResult[] => {
  if (!existsSync(reportPath)) {
    throw new Error(`Playwright report not found: ${reportPath}`);
  }
  const report = JSON.parse(
    readFileSync(reportPath, "utf8")
  ) as PlaywrightJsonReport;
  const cases = collectSpecs(report.suites);
  const results: CriterionTestResult[] = [];

  for (const c of cases) {
    const parsed = parseIdFromTitle(c.title);
    if (!parsed) continue;
    const ac =
      parsed.kind === "acceptance"
        ? spec.acceptance_criteria.find((a) => a.id === parsed.id)
        : undefined;
    const ec =
      parsed.kind === "edge"
        ? spec.edge_cases.find((e) => e.id === parsed.id)
        : undefined;
    results.push({
      id: parsed.id,
      kind: parsed.kind,
      passed: c.passed,
      criticality: ac?.criticality,
      ref: ec?.ref,
    });
  }

  return results;
};

export const defaultReportPath = (specId: string, root = process.cwd()) =>
  join(root, "test-results", `${specId}.report.json`);
