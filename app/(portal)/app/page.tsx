import { redirect } from "next/navigation";

/**
 * Portal home on app.getblume.ai — lands on the default project dashboard.
 */
export default function PortalHome() {
  const project =
    process.env.BLUME_DEFAULT_PROJECT_SLUG?.trim() || "carromlive";
  redirect(`/p/${project}`);
}
