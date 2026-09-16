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
      <div className="rounded-sm border border-border bg-card p-6">
        <h1 className="mb-2 font-mono text-2xl font-semibold tracking-tight">
          Spec
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
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            <Link
              href={`/p/${projectId}`}
              className="no-underline hover:text-foreground"
            >
              Dashboard
            </Link>
            {latest && (
              <>
                {" · "}
                <Link
                  href={`/p/${projectId}/builds/${latest.id}`}
                  className="no-underline hover:text-foreground"
                >
                  Latest build
                </Link>
              </>
            )}
          </p>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {data.spec.title}
          </h1>
          <p className="mt-2 max-w-[54ch] text-muted-foreground">
            Editor-style view · {data.spec.layer} · v{data.spec.version} ·{" "}
            {data.spec.status}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <pre
          className="overflow-auto rounded-sm border border-border bg-card p-5 font-mono text-sm leading-relaxed text-foreground"
          tabIndex={0}
        >
          {markdown}
        </pre>

        <aside className="flex flex-col gap-4">
          <div className="rounded-sm border border-border bg-card p-4">
            <div className="font-mono text-[0.7rem] tracking-wide text-muted-foreground">
              Confidence ceiling
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold">
              {completeness.confidenceCeiling ?? "—"}
            </div>
            <p className="mt-1 mb-0 text-xs text-muted-foreground">
              {completeness.foundationalPass
                ? "Foundational pass"
                : "Foundational fail — hard stop"}
            </p>
          </div>

          <div className="rounded-sm border border-border bg-card p-4">
            <div className="mb-2 font-mono text-[0.7rem] tracking-wide text-muted-foreground">
              Completeness gaps
            </div>
            {completeness.gaps.length === 0 ? (
              <p className="m-0 text-sm text-success">No gaps flagged.</p>
            ) : (
              <ul className="m-0 list-disc space-y-1 pl-4 text-xs text-foreground">
                {completeness.gaps.map((gap, i) => (
                  <li key={`${gap.code}-${i}`}>
                    <strong>{gap.tier}</strong>: {gap.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-sm border border-border bg-card p-4">
            <div className="mb-2 font-mono text-[0.7rem] tracking-wide text-muted-foreground">
              Related specs
            </div>
            {data.spec.relatedSpecs.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">None linked.</p>
            ) : (
              <ul className="m-0 list-disc space-y-1 pl-4 text-sm">
                {data.spec.relatedSpecs.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/p/${projectId}/specs/${id}`}
                      className="font-mono text-foreground no-underline hover:underline"
                    >
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-sm border border-border bg-card p-4">
            <div className="mb-2 font-mono text-[0.7rem] tracking-wide text-muted-foreground">
              Builds
            </div>
            {data.builds.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">
                No builds recorded.
              </p>
            ) : (
              <ul className="m-0 list-disc space-y-1 pl-4 text-sm">
                {data.builds.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/p/${projectId}/builds/${b.id}`}
                      className="font-mono text-foreground no-underline hover:underline"
                    >
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
