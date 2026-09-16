import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mb-10 text-center">
        <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to the verification portal
        </p>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
