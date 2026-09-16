import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login">
          <div className="login-panel">
            <p className="eyebrow">Corin</p>
            <h1>Sign in</h1>
            <p className="lede">Loading…</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
