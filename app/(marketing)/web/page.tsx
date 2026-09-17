"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between border-b border-border px-10 py-5">
        <span className="font-mono text-sm font-semibold tracking-tight">
          BLUME
        </span>
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
        <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-12 px-10 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div>
            <h1 className="mb-6 font-mono text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
              Code isn&apos;t the
              <br />
              source of truth.
              <br />
              The spec is.
            </h1>
            <p className="mb-8 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
              Blume turns a product spec into the only contract that matters —
              the thing your AI coding agent builds against, and the thing an
              independent test suite checks it against. The suite never reads
              the code. It can&apos;t inherit the same blind spots.
            </p>
            <Button size="lg" asChild>
              <a href="#access">Request access</a>
            </Button>
          </div>

          <div className="border border-border bg-card p-5 font-mono text-sm">
            <div className="mb-3 flex justify-between border-b border-border pb-3 text-xs text-muted-foreground">
              <span>SPEC</span>
              <span>join-live-match · v3</span>
            </div>

            <DocRow
              tag="AC-01"
              text="Spectator joins successfully"
              status="success"
              label="verified"
            />
            <DocRow
              tag="AC-02"
              text="Match ends while spectating"
              status="success"
              label="verified"
            />
            <DocRow
              tag="EC-01"
              text="Match becomes full mid-join"
              status="warning"
              label="flagged"
            />

            <div className="mt-3 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>trust score 88</span>
              <span>ceiling 90</span>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-[1180px] px-10 py-16">
            <p className="mb-12 max-w-[52ch] text-xl leading-relaxed">
              AI agents write code fast now. The bottleneck moved to testing it —
              and most testing tools have a quiet conflict of interest.
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
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border">
          <div className="mx-auto max-w-[900px] px-10 py-16">
            <h2 className="mb-10 font-mono text-xl font-semibold tracking-tight">
              How it works
            </h2>
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
          </div>
        </section>

        <section id="access" className="border-t border-border">
          <div className="mx-auto max-w-[900px] px-10 py-20">
            <h2 className="mb-3 font-mono text-xl font-semibold tracking-tight">
              Request access
            </h2>
            <p className="mb-7 max-w-[54ch] text-muted-foreground">
              Blume is in active use on our own products right now. We&apos;re
              opening it up in small batches.
            </p>
            {submitted ? (
              <p className="text-foreground">
                You&apos;re on the list — we&apos;ll be in touch.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex max-w-md gap-2">
                <Input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
                <Button type="submit">Request access</Button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="flex justify-between border-t border-border px-10 py-8 font-mono text-sm text-muted-foreground">
        <span>Blume</span>
        <span>getblume.ai</span>
      </footer>
    </div>
  );
}

const DocRow = ({
  tag,
  text,
  status,
  label,
}: {
  tag: string;
  text: string;
  status: "success" | "warning";
  label: string;
}) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0">
    <span className="w-14 shrink-0 text-muted-foreground">{tag}</span>
    <span className="flex-1 text-foreground">{text}</span>
    <Badge
      variant="outline"
      className={
        status === "success"
          ? "rounded-none border-success/40 text-success"
          : "rounded-none border-warning/40 text-warning"
      }
    >
      {label}
    </Badge>
  </div>
);

const Problem = ({ title, body }: { title: string; body: string }) => (
  <div>
    <h3 className="mb-2 font-mono text-sm font-medium tracking-tight">
      {title}
    </h3>
    <p className="max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
      {body}
    </p>
  </div>
);

const FlowStep = ({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) => (
  <li className="grid grid-cols-[3rem_1fr] gap-6 py-6 first:pt-0 last:pb-0">
    <span className="pt-0.5 font-mono text-sm text-muted-foreground">{n}</span>
    <div>
      <h3 className="mb-1 font-mono text-sm font-medium tracking-tight">
        {title}
      </h3>
      <p className="max-w-[54ch] text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  </li>
);
