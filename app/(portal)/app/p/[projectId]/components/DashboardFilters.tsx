"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PORTAL_STATUSES, type PortalStatus } from "@/lib/portal/status";
import { StatusBadge } from "./StatusBadge";
import type { SpecCluster } from "@/lib/portal/clusters";
import type { SpecWithLatestBuild } from "@/lib/portal/queries";

interface DashboardFiltersProps {
  projectId: string;
  clusters: SpecCluster<SpecWithLatestBuild>[];
  activeFilter: PortalStatus | "all";
}

export const DashboardFilters = ({
  projectId,
  clusters,
  activeFilter,
}: DashboardFiltersProps) => {
  const router = useRouter();

  const handleFilter = (next: PortalStatus | "all") => {
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
      <div
        className="mb-8 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Filter by status"
      >
        <Button
          type="button"
          size="sm"
          variant={activeFilter === "all" ? "default" : "outline"}
          aria-pressed={activeFilter === "all"}
          onClick={() => handleFilter("all")}
        >
          All
        </Button>
        {PORTAL_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={activeFilter === status ? "default" : "outline"}
            aria-pressed={activeFilter === status}
            onClick={() => handleFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {filteredClusters.length === 0 ? (
        <div className="border border-border bg-card p-5">
          <h2 className="mb-2 font-mono text-sm font-semibold tracking-tight">
            No matching sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Try another status filter, or ingest specs for this project.
          </p>
        </div>
      ) : (
        filteredClusters.map((cluster) => (
          <section key={cluster.id} className="mb-8">
            <h2 className="mb-3 font-mono text-xs text-muted-foreground">
              Cluster · {cluster.specs.map((s) => s.id).join(" · ")}
            </h2>
            <div className="divide-y divide-border border border-border bg-card">
              {cluster.specs.map((spec) => {
                const href = spec.latestBuild
                  ? `/p/${projectId}/builds/${spec.latestBuild.id}`
                  : `/p/${projectId}/specs/${spec.id}`;
                return (
                  <a
                    key={spec.id}
                    href={href}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 no-underline transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <h3 className="font-mono text-sm font-medium text-foreground">
                        {spec.title}
                      </h3>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {spec.id} · {spec.layer} · v{spec.version}
                        {spec.latestBuild
                          ? ` · build ${spec.latestBuild.status}`
                          : " · no build yet"}
                      </div>
                    </div>
                    <StatusBadge status={spec.portalStatus} />
                  </a>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
};
