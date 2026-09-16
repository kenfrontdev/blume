import Link from "next/link";
import { getBuildDetail, isPortalEmpty } from "@/lib/portal/queries";
import { buildAutoSummary } from "@/lib/portal/chat";
import { derivePortalStatus } from "@/lib/portal/status";
import { StatusBadge } from "../../components/StatusBadge";
import { GateActions } from "../../components/GateActions";
import { RootCauseChat } from "../../components/RootCauseChat";

interface PageProps {
  params: Promise<{ projectId: string; buildId: string }>;
}

export default async function BuildPage({ params }: PageProps) {
  const { projectId, buildId } = await params;
  const data = await getBuildDetail(projectId, buildId);

  if (isPortalEmpty(data)) {
    return (
      <div className="panel panel-pad empty-state">
        <h1>Build</h1>
        <p>{data.message}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href={`/p/${projectId}`}>← Back to dashboard</Link>
        </p>
      </div>
    );
  }

  const status = derivePortalStatus({
    buildStatus: data.build.status,
    verificationStatus: data.build.verificationStatus,
    specStatus: data.spec.status,
  });

  const summary = buildAutoSummary({
    build: data.build,
    retries: data.retries,
    swarmNotes: data.swarmNotes,
    driftFlags: data.driftFlags,
    gateDecisions: data.gateDecisions,
  });

  return (
    <>
      <header className="page-header">
        <div>
          <p style={{ margin: "0 0 0.35rem", color: "var(--ink-faint)" }}>
            <Link href={`/p/${projectId}`}>Dashboard</Link>
            {" · "}
            <Link href={`/p/${projectId}/specs/${data.spec.id}`}>
              {data.spec.id}
            </Link>
          </p>
          <h1>Build {data.build.id.slice(0, 8)}</h1>
          <p className="lede">
            {data.spec.title} · v{data.build.specVersion} · unified timeline +
            gate actions
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="build-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section className="panel panel-pad">
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Trust</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
              }}
            >
              <div className="metric panel" style={{ boxShadow: "none" }}>
                <div className="label">Execution</div>
                <div className="value">
                  {data.build.executionScore ?? "—"}
                </div>
              </div>
              <div className="metric panel" style={{ boxShadow: "none" }}>
                <div className="label">Ceiling</div>
                <div className="value">
                  {data.build.confidenceCeiling ?? "—"}
                </div>
              </div>
              <div className="metric panel" style={{ boxShadow: "none" }}>
                <div className="label">Verification</div>
                <div className="value" style={{ fontSize: "1.15rem" }}>
                  {data.build.verificationStatus ?? "unset"}
                </div>
              </div>
            </div>
          </section>

          <section className="panel panel-pad">
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Timeline</h2>
            {data.timeline.length === 0 ? (
              <p style={{ color: "var(--ink-muted)", margin: 0 }}>
                No events yet.
              </p>
            ) : (
              <ol className="timeline">
                {data.timeline.map((event) => (
                  <li key={event.id} className="timeline-item">
                    <time dateTime={event.at.toISOString()}>
                      {event.at.toLocaleString()} · {event.kind}
                    </time>
                    <strong>{event.title}</strong>
                    {event.detail && <p>{event.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel panel-pad">
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Gate actions</h2>
            <p style={{ color: "var(--ink-muted)", marginTop: 0 }}>
              Approve or override inline with a structured §7 reason — logged
              permanently on this build.
            </p>
            <GateActions buildId={data.build.id} />
            {data.gateDecisions.length > 0 && (
              <ul style={{ marginTop: "1rem", paddingLeft: "1.1rem" }}>
                {data.gateDecisions.map((g) => (
                  <li key={g.id}>
                    {g.decision}
                    {g.overrideReason ? ` · ${g.overrideReason}` : ""} ·{" "}
                    {g.decidedAt.toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <RootCauseChat buildId={data.build.id} initialSummary={summary} />
      </div>
    </>
  );
}
