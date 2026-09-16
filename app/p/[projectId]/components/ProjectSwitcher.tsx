"use client";

import { useRouter } from "next/navigation";
import type { ProjectRow } from "@/lib/portal/queries";

interface ProjectSwitcherProps {
  projectId: string;
  projects: ProjectRow[];
}

export function ProjectSwitcher({ projectId, projects }: ProjectSwitcherProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>
        {projectId}
      </span>
    );
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <span className="visually-hidden" style={{ position: "absolute", left: "-9999px" }}>
        Project
      </span>
      <select
        className="project-switcher"
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
}
