"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Blume marketing landing page — shadcn/Tailwind version.
 *
 * Requires: npx shadcn@latest add button input badge
 * Requires the tokens from blume-globals.css / blume-tailwind.config.ts
 * to already be wired into the project (see blume-design-language.md).
 *
 * Drop at app/(marketing)/page.tsx, or app/page.tsx if the portal lives
 * on a subdomain (app.getblume.ai) via middleware host-based rewrite.
 */

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // TODO: wire to a real capture endpoint (server action / API route)
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Masthead */}
      <header className="flex items-center justify-between border-b border-border px-10 py-6">
        <span className="font-mono font-semibold tracking-tight">BLUME</span>
        <nav className="flex gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#access" className="hover:text-foreground">
            Request access
          </a>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-12 px-10 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div>
            <h1 className="mb-6 font-mono text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Code isn&apos;t the
              <br />
              source of truth.
              <br />
              The spec is.
            </h1>
            <p className="mb-8 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
              Blume turns a product spec into the only contract that
              matters — the thing your AI coding agent builds against, and
              the thing an independent test suite checks it against. The
              suite never reads the code. It can&apos;t inherit the same
              blind spots.
            </p>
            <Button size="lg" className="rounded-sm" asChild>
              <a href="#access">Request access</a>
            </Button>
          </div>

          {/* Verification-snippet — the one bold visual moment */}
          <div className="rounded-sm border border-border bg-card p-6 font-mono text-sm">
            <div className="mb-3 flex justify-between border-b border-border pb-3 text-xs tracking-wide text-muted-foreground">
              <span>SPEC</span>
              <span>join-live-match · v3</span>
            </div>

            <DocRow tag="AC-01" text="Spectator joins successfully" status="success" label="verified" />
            <DocRow tag="AC-02" text="Match ends while spectating" status="success" label="verified" />
            <DocRow tag="EC-01" text="Match becomes full mid-join" status="warning" label="flagged" />

            <div className="mt-3 flex justify-between pt-3 text-xs text-muted-foreground">
              <span>trust score 88</span>
              <span>ceiling 90</span>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-[1180px] border-t border-border px-10 py-16">
          <p className="mb-12 max-w-[52ch] text-xl leading-relaxed">
            AI agents write code fast now. The bottleneck moved to testing
            it — and most testing tools have a quiet conflict of interest.
          </p>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <Problem
              title="Same agent, same blind spot"
              body="When the agent that writes the code also writes the tests, a wrong assumption shows up in both. The tests pass. The bug ships anyway."
            />
            <Problem
              title="Passing the test isn't the goal"
              body="Under pressure to pass, agents have been documented editing the test itself, patching the runner, forcing a clean exit code. The test stops meaning anything."
            />
            <Problem
              title="No one's watching in real time"
              body="Unsupervised builds need the review a human would normally give — fresh context on every retry, a scope an agent can't wander outside of, a trail of why it decided what it decided."
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-[900px] border-t border-border px-10 py-16">
          <h2 className="mb-10 text-xl font-semibold">How it works</h2>
          <ol className="divide-y divide-border">
            <FlowStep
              n="01"
              title="Write the spec, not the ticket"
              body="Ideate normally, in conversation. Blume extracts acceptance criteria, edge cases, and criticality — and tells you plainly what's still too thin to test."
            />
            <FlowStep
              n="02"
              title="Your agent builds against it"
              body="Cursor or Claude Code reads the spec, builds, and hands off. It can't edit the criteria it's being judged against — and it can't self-certify."
            />
            <FlowStep
              n="03"
              title="An independent suite checks it"
              body="Tests are compiled straight from the spec, never from the code. On failure, the agent revises. On a genuine spec gap, it escalates instead of guessing."
            />
            <FlowStep
              n="04"
              title="A trust score, not a checkbox"
              body="Execution score and confidence ceiling, shown separately, with the full reasoning behind both. You see exactly why something is or isn't trustworthy."
            />
          </ol>
        </section>

        {/* Access */}
        <section id="access" className="mx-auto max-w-[640px] border-t border-border px-10 py-20">
          <h2 className="mb-3 text-xl font-semibold">Request access</h2>
          <p className="mb-7 text-muted-foreground">
            Blume is in active use on our own products right now. We&apos;re
            opening it up in small batches.
          </p>
          {submitted ? (
            <p className="text-success">You&apos;re on the list — we&apos;ll be in touch.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-sm"
              />
              <Button type="submit" className="rounded-sm">
                Request access
              </Button>
            </form>
          )}
        </section>
      </main>

      <footer className="flex justify-between border-t border-border px-10 py-8 font-mono text-sm text-muted-foreground">
        <span>Blume</span>
        <span>getblume.ai</span>
      </footer>
    </div>
  );
}

function DocRow({
  tag,
  text,
  status,
  label,
}: {
  tag: string;
  text: string;
  status: "success" | "warning";
  label: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-none">
      <span className="w-14 shrink-0 text-muted-foreground">{tag}</span>
      <span className="flex-1 text-foreground">{text}</span>
      <Badge
        variant="outline"
        className={
          status === "success"
            ? "border-success/40 text-success"
            : "border-warning/40 text-warning"
        }
      >
        {label}
      </Badge>
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function FlowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[3rem_1fr] gap-6 py-6 first:pt-0">
      <span className="pt-0.5 font-mono text-sm text-muted-foreground">{n}</span>
      <div>
        <h3 className="mb-1 font-medium">{title}</h3>
        <p className="max-w-[54ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
