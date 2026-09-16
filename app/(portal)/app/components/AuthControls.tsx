"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_"),
);

export const AuthControls = () => {
  if (!hasClerk) {
    return (
      <div className="flex items-center gap-2" aria-label="Account">
        <Button variant="ghost" size="sm" className="rounded-sm" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" aria-label="Account">
      <Show when="signed-out">
        <Button variant="ghost" size="sm" className="rounded-sm" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button size="sm" className="rounded-sm" asChild>
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
};
