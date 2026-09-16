"use client";

import { useRouter } from "next/navigation";
import { PORTAL_STATUSES, type PortalStatus } from "@/lib/portal/status";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
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
      <div
        className="mb-8 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by status"
      >
        <button
          type="button"
          className={cn(
            "rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors",
            activeFilter === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={activeFilter === "all"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {PORTAL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={cn(
              "rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors",
              activeFilter === status
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={activeFilter === status}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredClusters.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">No matching sessions</h2>
          <p className="text-sm text-muted-foreground">
            Try another status filter, or ingest specs for this project.
          </p>
        </div>
      ) : (
        filteredClusters.map((cluster) => (
          <section key={cluster.id} className="mb-8">
            <h2 className="mb-3 font-mono text-xs tracking-wide text-muted-foreground">
              Cluster · {cluster.specs.map((s) => s.id).join(" · ")}
            </h2>
            <div className="divide-y divide-border rounded-sm border border-border bg-card">
              {cluster.specs.map((spec) => {
                const href = spec.latestBuild
                  ? `/p/${projectId}/builds/${spec.latestBuild.id}`
                  : `/p/${projectId}/specs/${spec.id}`;
                return (
                  <a
                    key={spec.id}
                    href={href}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 no-underline transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
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
                    <span className="text-xs text-muted-foreground">Open →</span>
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
