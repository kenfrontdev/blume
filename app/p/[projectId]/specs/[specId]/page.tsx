import Link from "next/link";
import {
  getSpecDetail,
  getProjectDashboard,
  isPortalEmpty,
} from "@/lib/portal/queries";
import { evaluateCompleteness } from "@/lib/trust";
import { specRowToCanonical } from "@/lib/portal/spec-canonical";
import { derivePortalStatus } from "@/lib/portal/status";
import { StatusBadge } from "../../components/StatusBadge";

interface PageProps {
  params: Promise<{ projectId: string; specId: string }>;
}

export default async function SpecPage({ params }: PageProps) {
  const { projectId, specId } = await params;
  const data = await getSpecDetail(projectId, specId);

  if (isPortalEmpty(data)) {
    return (
      <div className="panel panel-pad empty-state">
        <h1>Spec</h1>
        <p>{data.message}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href={`/p/${projectId}`}>← Back to dashboard</Link>
        </p>
      </div>
    );
  }

  const relatedCanonical = [];
  const dash = await getProjectDashboard(projectId);
  if (!isPortalEmpty(dash)) {
    for (const relatedId of data.spec.relatedSpecs) {
      const related = dash.specs.find((s) => s.id === relatedId);
      if (related) relatedCanonical.push(specRowToCanonical(related));
    }
  }

  const canonical = specRowToCanonical(data.spec);
  const completeness = evaluateCompleteness(canonical, relatedCanonical);
  const latest = data.builds[0] ?? null;
  const status = derivePortalStatus({
    buildStatus: latest?.status,
    verificationStatus: latest?.verificationStatus,
    specStatus: data.spec.status,
  });

  const markdown =
    data.markdown ??
    `# ${data.spec.title}\n\n_(No markdown file at specs/features/${data.spec.id}.md — showing DB fields.)_\n\n${data.spec.summary}\n`;

  return (
    <>
      <header className="page-header">
        <div>
          <p style={{ margin: "0 0 0.35rem", color: "var(--ink-faint)" }}>
            <Link href={`/p/${projectId}`}>Dashboard</Link>
            {latest && (
              <>
                {" · "}
                <Link href={`/p/${projectId}/builds/${latest.id}`}>
                  Latest build
                </Link>
              </>
            )}
          </p>
          <h1>{data.spec.title}</h1>
          <p className="lede">
            Editor-style view · {data.spec.layer} · v{data.spec.version} ·{" "}
            {data.spec.status}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="spec-editor">
        <pre className="panel spec-markdown" tabIndex={0}>
          {markdown}
        </pre>

        <aside className="metric-stack">
          <div className="panel metric">
            <div className="label">Confidence ceiling</div>
            <div className="value">
              {completeness.confidenceCeiling ?? "—"}
            </div>
            <p style={{ margin: "0.35rem 0 0", color: "var(--ink-muted)", fontSize: "0.85rem" }}>
              {completeness.foundationalPass
                ? "Foundational pass"
                : "Foundational fail — hard stop"}
            </p>
          </div>

          <div className="panel panel-pad">
            <div className="label" style={{ marginBottom: "0.5rem" }}>
              Completeness gaps
            </div>
            {completeness.gaps.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ok)", fontSize: "0.9rem" }}>
                No gaps flagged.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
                {completeness.gaps.map((gap, i) => (
                  <li key={`${gap.code}-${i}`}>
                    <strong>{gap.tier}</strong>: {gap.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel panel-pad">
            <div className="label" style={{ marginBottom: "0.5rem" }}>
              Related specs
            </div>
            {data.spec.relatedSpecs.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                None linked.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {data.spec.relatedSpecs.map((id) => (
                  <li key={id}>
                    <Link href={`/p/${projectId}/specs/${id}`}>{id}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel panel-pad">
            <div className="label" style={{ marginBottom: "0.5rem" }}>
              Builds
            </div>
            {data.builds.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                No builds recorded.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
                {data.builds.map((b) => (
                  <li key={b.id}>
                    <Link href={`/p/${projectId}/builds/${b.id}`}>
                      {b.id.slice(0, 8)}… · {b.status}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
