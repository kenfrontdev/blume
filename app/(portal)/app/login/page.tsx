import { redirect } from "next/navigation";

/** Legacy route — Clerk modal sign-in lives in the nav. */
export default function LoginPage() {
  redirect("/p/carromlive");
}
