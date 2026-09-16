import { NextResponse } from "next/server";
import { isPortalEmpty, searchPortal } from "@/lib/portal/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const projectId = searchParams.get("projectId") ?? undefined;

  const result = await searchPortal(q, { projectId, limit: 20 });
  if (isPortalEmpty(result)) {
    const status = result.reason === "no_database" ? 503 : 500;
    return NextResponse.json({ error: result.message, hits: [] }, { status });
  }

  return NextResponse.json({ hits: result });
}
