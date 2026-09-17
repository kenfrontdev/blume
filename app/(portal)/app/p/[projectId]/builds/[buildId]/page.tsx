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
      <div className="border border-border bg-card p-5">
        <h1 className="mb-2 font-mono text-2xl font-semibold tracking-tight">
          Build
        </h1>
        <p className="text-muted-foreground">{data.message}</p>
        <p className="mt-4">
          <Link
            href={`/p/${projectId}`}
            className="text-sm text-foreground underline-offset-2 hover:underline"
          >
            ← Back to dashboard
          </Link>
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
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            <Link
              href={`/p/${projectId}`}
              className="no-underline hover:text-foreground"
            >
              Dashboard
            </Link>
            {" · "}
            <Link
              href={`/p/${projectId}/specs/${data.spec.id}`}
              className="no-underline hover:text-foreground"
            >
              {data.spec.id}
            </Link>
          </p>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            Build {data.build.id.slice(0, 8)}
          </h1>
          <p className="mt-2 max-w-[54ch] text-muted-foreground">
            {data.spec.title} · v{data.build.specVersion} · unified timeline +
            gate actions
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col">
          <section className="border border-border bg-card p-5">
            <h2 className="mb-4 font-mono text-sm font-semibold tracking-tight">
              Trust
            </h2>
            <div className="grid grid-cols-3 divide-x divide-border border border-border">
              <div className="p-3">
                <div className="font-mono text-[0.7rem] text-muted-foreground">
                  Execution
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold">
                  {data.build.executionScore ?? "—"}
                </div>
              </div>
              <div className="p-3">
                <div className="font-mono text-[0.7rem] text-muted-foreground">
                  Ceiling
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold">
                  {data.build.confidenceCeiling ?? "—"}
                </div>
              </div>
              <div className="p-3">
                <div className="font-mono text-[0.7rem] text-muted-foreground">
                  Verification
                </div>
                <div className="mt-1 font-mono text-base font-semibold capitalize">
                  {data.build.verificationStatus ?? "unset"}
                </div>
              </div>
            </div>
          </section>

          <section className="border-x border-b border-border bg-card p-5">
            <h2 className="mb-4 font-mono text-sm font-semibold tracking-tight">
              Timeline
            </h2>
            {data.timeline.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ol className="m-0 list-none divide-y divide-border p-0">
                {data.timeline.map((event, index) => (
                  <li
                    key={event.id}
                    className="grid grid-cols-[3rem_1fr] gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="pt-0.5 font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <time
                        className="font-mono text-[0.7rem] text-muted-foreground"
                        dateTime={event.at.toISOString()}
                      >
                        {event.at.toLocaleString()} · {event.kind}
                      </time>
                      <strong className="mt-0.5 block font-mono text-sm font-medium">
                        {event.title}
                      </strong>
                      {event.detail && (
                        <p className="m-0 mt-1 max-w-[54ch] text-sm text-muted-foreground">
                          {event.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border-x border-b border-border bg-card p-5">
            <h2 className="mb-2 font-mono text-sm font-semibold tracking-tight">
              Gate actions
            </h2>
            <p className="mb-4 mt-0 max-w-[54ch] text-sm text-muted-foreground">
              Approve or override inline with a structured §7 reason — logged
              permanently on this build.
            </p>
            <GateActions buildId={data.build.id} />
            {data.gateDecisions.length > 0 && (
              <ol className="mt-4 divide-y divide-border border-t border-border p-0">
                {data.gateDecisions.map((g) => (
                  <li key={g.id} className="py-2 font-mono text-sm">
                    <span className="text-foreground">{g.decision}</span>
                    {g.overrideReason ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {g.overrideReason}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {" "}
                      · {g.decidedAt.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <RootCauseChat buildId={data.build.id} initialSummary={summary} />
      </div>
    </>
  );
}
