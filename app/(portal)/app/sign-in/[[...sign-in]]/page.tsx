import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey?.startsWith("pk_")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
        <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
        <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
          Clerk is not configured for this deploy. Set{" "}
          <code className="font-mono text-foreground">
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          and <code className="font-mono text-foreground">CLERK_SECRET_KEY</code>{" "}
          in Vercel, then Redeploy.
        </p>
      </main>
    );
  }

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
