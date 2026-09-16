import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="login">
      <div className="login-panel" style={{ width: "auto", background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
