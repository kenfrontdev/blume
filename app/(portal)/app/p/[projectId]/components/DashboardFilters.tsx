"use client";

import { useRouter } from "next/navigation";
import { PORTAL_STATUSES, type PortalStatus } from "@/lib/portal/status";
import { StatusBadge } from "./StatusBadge";
import type { SpecCluster } from "@/lib/portal/clusters";
import type { SpecWithLatestBuild } from "@/lib/portal/queries";

interface DashboardFiltersProps {
  projectId: string;
  clusters: SpecCluster<SpecWithLatestBuild>[];
  activeFilter: PortalStatus | "all";
}

export function DashboardFilters({
  projectId,
  clusters,
  activeFilter,
}: DashboardFiltersProps) {
  const router = useRouter();

  const setFilter = (next: PortalStatus | "all") => {
    const url =
      next === "all"
        ? `/p/${projectId}`
        : `/p/${projectId}?status=${encodeURIComponent(next)}`;
    router.push(url);
  };

  const filteredClusters = clusters
    .map((cluster) => ({
      ...cluster,
      specs:
        activeFilter === "all"
          ? cluster.specs
          : cluster.specs.filter((s) => s.portalStatus === activeFilter),
    }))
    .filter((c) => c.specs.length > 0);

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter by status">
        <button
          type="button"
          className="filter-chip"
          aria-pressed={activeFilter === "all"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {PORTAL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className="filter-chip"
            aria-pressed={activeFilter === status}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredClusters.length === 0 ? (
        <div className="panel panel-pad empty-state">
          <h2 style={{ marginTop: 0 }}>No matching sessions</h2>
          <p>Try another status filter, or ingest specs for this project.</p>
        </div>
      ) : (
        filteredClusters.map((cluster) => (
          <section key={cluster.id} className="cluster">
            <h2 className="cluster-title">
              Cluster · {cluster.specs.map((s) => s.id).join(" · ")}
            </h2>
            <div className="panel">
              {cluster.specs.map((spec) => {
                const href = spec.latestBuild
                  ? `/p/${projectId}/builds/${spec.latestBuild.id}`
                  : `/p/${projectId}/specs/${spec.id}`;
                return (
                  <a key={spec.id} href={href} className="spec-row">
                    <div>
                      <h3>{spec.title}</h3>
                      <div className="meta">
                        {spec.id} · {spec.layer} · v{spec.version}
                        {spec.latestBuild
                          ? ` · build ${spec.latestBuild.status}`
                          : " · no build yet"}
                      </div>
                    </div>
                    <StatusBadge status={spec.portalStatus} />
                    <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
                      Open →
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
