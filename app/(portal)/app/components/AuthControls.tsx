"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Clerk Core 3 (@clerk/nextjs v7) removed the `<SignedIn>` / `<SignedOut>`
 * control components. In a client component the idiomatic replacement is the
 * `useAuth()` hook (`<Show>` is an async server component).
 */
export const AuthControls = () => {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex items-center gap-2" aria-label="Account">
      {!isLoaded ? null : isSignedIn ? (
        <UserButton />
      ) : (
        <>
          <Button variant="ghost" size="sm" className="rounded-sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" className="rounded-sm" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </>
      )}
    </div>
  );
};
