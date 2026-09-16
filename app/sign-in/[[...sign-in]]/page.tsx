import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="login">
      <div className="login-panel" style={{ width: "auto", background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
