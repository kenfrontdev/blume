"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/p/carromlive";
  const [email, setEmail] = useState("owner@corin.local");
  const [role, setRole] = useState<"quality_owner" | "contributor">(
    "quality_owner"
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      role,
      projectId: "carromlive",
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (result?.error) {
      setError("Sign-in failed. Check credentials and AUTH_SECRET.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <main className="login">
      <div className="login-panel">
        <p className="eyebrow">Corin</p>
        <h1>Sign in</h1>
        <p className="lede">
          Identity comes from an external provider (§11). Roles are enforced
          per project inside Corin.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Role
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "quality_owner" | "contributor")
              }
            >
              <option value="quality_owner">Quality owner</option>
              <option value="contributor">Contributor</option>
            </select>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
