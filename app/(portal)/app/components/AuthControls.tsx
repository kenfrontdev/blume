"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Portal auth chrome. When Clerk keys are configured, sign-in / sign-up
 * routes under /app use Clerk's hosted components; the shell keeps plain
 * links so marketing/portal can boot without keys.
 */
export const AuthControls = () => (
  <div className="flex items-center gap-2" aria-label="Account">
    <Button variant="ghost" size="sm" className="rounded-sm" asChild>
      <Link href="/sign-in">Sign in</Link>
    </Button>
    <Button size="sm" className="rounded-sm" asChild>
      <Link href="/sign-up">Sign up</Link>
    </Button>
  </div>
);
