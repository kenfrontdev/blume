import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey?.startsWith("pk_")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
        <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
        <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
          Clerk is not configured for this deploy. Set the Clerk keys in Vercel,
          then Redeploy.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mb-10 text-center">
        <p className="font-mono text-sm font-semibold tracking-tight">BLUME</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a portal account
        </p>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
