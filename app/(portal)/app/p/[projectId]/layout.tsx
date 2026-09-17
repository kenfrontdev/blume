import Link from "next/link";
import { CommandPalette } from "./components/CommandPalette";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { AuthControls } from "../../components/AuthControls";
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 items-center gap-4 border-b border-border px-6">
        <Link
          href={`/p/${projectId}`}
          className="font-mono text-sm font-semibold tracking-tight text-foreground no-underline"
        >
          BLUME
        </Link>
        <ProjectSwitcher projectId={projectId} projects={projects} />
        <nav aria-label="Portal" className="flex items-center gap-3 text-sm">
          <Link
            href={`/p/${projectId}`}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
        <div className="flex-1" />
        <AuthControls />
        <CommandPalette projectId={projectId} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
