import { redirect } from "next/navigation";

/**
 * Landing → project release dashboard (§10).
 * Auth can gate this later; for now go straight to the default project.
 */
export default function Home() {
  const project =
    process.env.CORIN_DEFAULT_PROJECT_SLUG?.trim() || "carromlive";
  redirect(`/p/${project}`);
}
