import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey?.startsWith("pk_")) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="flex h-12 items-center border-b border-border px-6">
          <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
        </header>
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <p className="max-w-[54ch] text-sm text-muted-foreground">
            Clerk is not configured for this deploy. Set the Clerk keys in
            Vercel, then Redeploy.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-12 items-center border-b border-border px-6">
        <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-2 mb-8 max-w-[54ch] text-sm text-muted-foreground">
          Create a portal account
        </p>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
