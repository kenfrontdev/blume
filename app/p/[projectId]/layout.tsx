import Link from "next/link";
import { CommandPalette } from "./components/CommandPalette";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { AuthControls } from "@/app/components/AuthControls";
import { listProjects, type ProjectRow } from "@/lib/portal/queries";

interface PortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function PortalLayout({
  children,
  params,
}: PortalLayoutProps) {
  const { projectId } = await params;
  const listed = await listProjects();
  const projects: ProjectRow[] =
    "empty" in listed && listed.empty ? [] : (listed as ProjectRow[]);

  return (
    <div className="portal-shell">
      <header className="portal-nav">
        <Link href={`/p/${projectId}`} className="portal-brand">
          Corin<span>.</span>
        </Link>
        <ProjectSwitcher projectId={projectId} projects={projects} />
        <nav
          aria-label="Portal"
          style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
        >
          <Link href={`/p/${projectId}`}>Dashboard</Link>
        </nav>
        <div className="portal-nav-spacer" />
        <AuthControls />
        <CommandPalette projectId={projectId} />
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
