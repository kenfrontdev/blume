"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export const AuthControls = () => (
  <div className="flex items-center gap-2" aria-label="Account">
    <SignedOut>
      <Button variant="ghost" size="sm" className="rounded-sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button size="sm" className="rounded-sm" asChild>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
  </div>
);
