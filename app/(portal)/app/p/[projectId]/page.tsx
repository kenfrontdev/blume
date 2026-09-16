import {
  getProjectDashboard,
  isPortalEmpty,
} from "@/lib/portal/queries";
import { PORTAL_STATUSES, type PortalStatus } from "@/lib/portal/status";
import { DashboardFilters } from "./components/DashboardFilters";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: PageProps) {
  const { projectId } = await params;
  const { status: statusParam } = await searchParams;
  const data = await getProjectDashboard(projectId);

  if (isPortalEmpty(data)) {
    return (
      <div className="rounded-sm border border-border bg-card p-6">
        <h1 className="mb-2 font-mono text-2xl font-semibold tracking-tight">
          Release dashboard
        </h1>
        <p className="text-muted-foreground">{data.message}</p>
        {data.reason === "no_database" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Copy <code className="font-mono text-foreground">.env.example</code>{" "}
            to <code className="font-mono text-foreground">.env</code>, set{" "}
            <code className="font-mono text-foreground">BLUMEDB_DATABASE_URL</code>
            , then run{" "}
            <code className="font-mono text-foreground">npm run ingest</code>.
          </p>
        )}
      </div>
    );
  }

  const activeFilter: PortalStatus | "all" =
    statusParam && (PORTAL_STATUSES as string[]).includes(statusParam)
      ? (statusParam as PortalStatus)
      : "all";

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {data.project.name}
          </h1>
          <p className="mt-2 max-w-[54ch] text-muted-foreground">
            Session list — every spec and latest build, clustered by{" "}
            <code className="font-mono text-sm text-foreground">
              related_specs
            </code>
            .
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>
            Threshold {String(data.project.releaseThresholdDefault)} · retry cap{" "}
            {data.project.retryCapDefault}
          </div>
          <div className="mt-1 text-xs">
            {data.specs.length} spec{data.specs.length === 1 ? "" : "s"} ·{" "}
            {data.clusters.length} cluster
            {data.clusters.length === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      <DashboardFilters
        projectId={projectId}
        clusters={data.clusters}
        activeFilter={activeFilter}
      />
    </>
  );
}
