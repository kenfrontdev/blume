"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export const AuthControls = () => (
  <div className="auth-controls" aria-label="Account">
    <Show when="signed-out">
      <Link href="/sign-in" className="auth-btn">
        Sign in
      </Link>
      <Link href="/sign-up" className="auth-btn auth-btn-primary">
        Sign up
      </Link>
    </Show>
    <Show when="signed-in">
      <UserButton />
    </Show>
  </div>
);
