"use client";

import { useRouter } from "next/navigation";
import type { ProjectRow } from "@/lib/portal/queries";

interface ProjectSwitcherProps {
  projectId: string;
  projects: ProjectRow[];
}

export const ProjectSwitcher = ({
  projectId,
  projects,
}: ProjectSwitcherProps) => {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {projectId}
      </span>
    );
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Project</span>
      <select
        className="h-8 rounded-sm border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={projectId}
        aria-label="Switch project"
        onChange={(e) => router.push(`/p/${e.target.value}`)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {!projects.some((p) => p.id === projectId) && (
          <option value={projectId}>{projectId}</option>
        )}
      </select>
    </label>
  );
};
