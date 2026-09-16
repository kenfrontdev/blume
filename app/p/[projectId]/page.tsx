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
      <div className="panel panel-pad empty-state">
        <h1>Release dashboard</h1>
        <p>{data.message}</p>
        {data.reason === "no_database" && (
          <p style={{ marginTop: "1rem" }}>
            Copy <code>.env.example</code> to <code>.env</code>, set{" "}
            <code>DATABASE_URL</code>, then run <code>npm run ingest</code>.
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
      <header className="page-header">
        <div>
          <h1>{data.project.name}</h1>
          <p className="lede">
            Session list — every spec and latest build, clustered by{" "}
            <code>related_specs</code>.
          </p>
        </div>
        <div style={{ textAlign: "right", color: "var(--ink-muted)" }}>
          <div>
            Threshold {String(data.project.releaseThresholdDefault)} · retry cap{" "}
            {data.project.retryCapDefault}
          </div>
          <div style={{ fontSize: "0.85rem" }}>
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
