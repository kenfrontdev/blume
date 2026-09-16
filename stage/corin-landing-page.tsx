"use client";

import { useState } from "react";

/**
 * Corin marketing landing page.
 *
 * Drop this in at app/(marketing)/page.tsx (or wherever the root route
 * should live once the app/portal moves to a subdomain). Self-contained —
 * uses Next.js's built-in styled-jsx, no extra CSS setup needed.
 *
 * The email capture below is client-side only (no backend wired yet).
 * Replace handleSubmit with a real API call / Resend / Supabase insert
 * once that exists.
 */

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // TODO: wire to real capture endpoint
    setSubmitted(true);
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-mark">CORIN</div>
        <nav className="masthead-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#access">Request access</a>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Code isn&apos;t the
              <br />
              source of truth.
              <br />
              The spec is.
            </h1>
            <p className="hero-sub">
              Corin turns a product spec into the only contract that
              matters — the thing your AI coding agent builds against, and
              the thing an independent test suite checks it against. The
              suite never reads the code. It can&apos;t inherit the same
              blind spots.
            </p>
            <a className="cta" href="#access">
              Request access
            </a>
          </div>

          <div className="hero-doc" aria-hidden="true">
            <div className="doc-line doc-head">
              <span>SPEC</span>
              <span>join-live-match · v3</span>
            </div>
            <div className="doc-row pass">
              <span className="doc-tag">AC-01</span>
              <span className="doc-text">Spectator joins successfully</span>
              <span className="doc-status">verified</span>
            </div>
            <div className="doc-row pass">
              <span className="doc-tag">AC-02</span>
              <span className="doc-text">Match ends while spectating</span>
              <span className="doc-status">verified</span>
            </div>
            <div className="doc-row flag">
              <span className="doc-tag">EC-01</span>
              <span className="doc-text">Match becomes full mid-join</span>
              <span className="doc-status">flagged — ambiguous</span>
            </div>
            <div className="doc-foot">
              <span>trust score 88</span>
              <span>ceiling 90</span>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="problem">
          <p className="problem-lede">
            AI agents write code fast now. The bottleneck moved to testing
            it — and most testing tools have a quiet conflict of interest.
          </p>
          <div className="problem-grid">
            <div>
              <h3>Same agent, same blind spot</h3>
              <p>
                When the agent that writes the code also writes the tests,
                a wrong assumption shows up in both. The tests pass. The
                bug ships anyway.
              </p>
            </div>
            <div>
              <h3>Passing the test isn&apos;t the goal</h3>
              <p>
                Under pressure to pass, agents have been documented
                editing the test itself, patching the runner, forcing a
                clean exit code. The test stops meaning anything.
              </p>
            </div>
            <div>
              <h3>No one&apos;s watching in real time</h3>
              <p>
                Unsupervised builds need the review a human would normally
                give — fresh context on every retry, a scope an agent
                can&apos;t wander outside of, a trail of why it decided
                what it decided.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="flow">
          <h2>How it works</h2>
          <ol className="flow-list">
            <li>
              <span className="flow-line">01</span>
              <div>
                <h3>Write the spec, not the ticket</h3>
                <p>
                  Ideate normally, in conversation. Corin extracts
                  acceptance criteria, edge cases, and criticality —
                  and tells you plainly what&apos;s still too thin to test.
                </p>
              </div>
            </li>
            <li>
              <span className="flow-line">02</span>
              <div>
                <h3>Your agent builds against it</h3>
                <p>
                  Cursor or Claude Code reads the spec, builds, and hands
                  off. It can&apos;t edit the criteria it&apos;s being
                  judged against — and it can&apos;t self-certify.
                </p>
              </div>
            </li>
            <li>
              <span className="flow-line">03</span>
              <div>
                <h3>An independent suite checks it</h3>
                <p>
                  Tests are compiled straight from the spec, never from
                  the code. On failure, the agent revises. On a genuine
                  spec gap, it escalates instead of guessing.
                </p>
              </div>
            </li>
            <li>
              <span className="flow-line">04</span>
              <div>
                <h3>A trust score, not a checkbox</h3>
                <p>
                  Execution score and confidence ceiling, shown
                  separately, with the full reasoning behind both. You
                  see exactly why something is or isn&apos;t trustworthy.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* ACCESS */}
        <section id="access" className="access">
          <h2>Request access</h2>
          <p>
            Corin is in active use on our own products right now. We&apos;re
            opening it up in small batches.
          </p>
          {submitted ? (
            <p className="access-confirm">
              You&apos;re on the list — we&apos;ll be in touch.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="access-form">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Request access</button>
            </form>
          )}
        </section>
      </main>

      <footer className="foot">
        <span>Corin</span>
        <span>getcorin.ai</span>
      </footer>

      <style jsx>{`
        :root {
          --bg: #f2f3f1;
          --ink: #14181f;
          --ink-soft: #4a5158;
          --line: #d3d8dc;
          --verified: #1f6b52;
          --flag: #9a4a2e;
          --paper: #fbfbfa;
        }

        .page {
          background: var(--bg);
          color: var(--ink);
          font-family: "IBM Plex Sans", -apple-system, sans-serif;
          min-height: 100vh;
        }

        .masthead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2.5rem;
          border-bottom: 1px solid var(--line);
        }

        .masthead-mark {
          font-family: "IBM Plex Mono", monospace;
          font-weight: 600;
          letter-spacing: 0.02em;
          font-size: 1.05rem;
        }

        .masthead-nav a {
          color: var(--ink-soft);
          text-decoration: none;
          margin-left: 2rem;
          font-size: 0.95rem;
        }
        .masthead-nav a:hover {
          color: var(--ink);
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 3rem;
          padding: 5rem 2.5rem 4rem;
          max-width: 1180px;
          margin: 0 auto;
          align-items: start;
        }

        .hero h1 {
          font-family: "IBM Plex Mono", monospace;
          font-size: clamp(2.1rem, 4.4vw, 3.4rem);
          line-height: 1.12;
          font-weight: 600;
          margin: 0 0 1.5rem;
          letter-spacing: -0.01em;
        }

        .hero-sub {
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--ink-soft);
          max-width: 46ch;
          margin: 0 0 2rem;
        }

        .cta {
          display: inline-block;
          background: var(--ink);
          color: var(--paper);
          padding: 0.85rem 1.6rem;
          border-radius: 3px;
          text-decoration: none;
          font-size: 0.98rem;
          font-weight: 500;
        }
        .cta:hover {
          background: #2a323c;
        }

        .hero-doc {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 1.25rem 1.4rem;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.85rem;
        }

        .doc-line.doc-head {
          display: flex;
          justify-content: space-between;
          color: var(--ink-soft);
          border-bottom: 1px solid var(--line);
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
          font-size: 0.78rem;
          letter-spacing: 0.03em;
        }

        .doc-row {
          display: grid;
          grid-template-columns: 3.2rem 1fr auto;
          gap: 0.6rem;
          padding: 0.5rem 0;
          align-items: baseline;
          border-bottom: 1px solid #e8eaec;
        }

        .doc-tag {
          color: var(--ink-soft);
        }

        .doc-status {
          font-size: 0.78rem;
        }

        .doc-row.pass .doc-status {
          color: var(--verified);
        }
        .doc-row.flag .doc-status {
          color: var(--flag);
        }

        .doc-foot {
          display: flex;
          justify-content: space-between;
          padding-top: 0.75rem;
          margin-top: 0.25rem;
          color: var(--ink-soft);
          font-size: 0.8rem;
        }

        .problem {
          border-top: 1px solid var(--line);
          padding: 4rem 2.5rem;
          max-width: 1180px;
          margin: 0 auto;
        }

        .problem-lede {
          font-size: 1.3rem;
          line-height: 1.5;
          max-width: 52ch;
          margin: 0 0 3rem;
        }

        .problem-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }

        .problem-grid h3 {
          font-size: 1.02rem;
          margin: 0 0 0.6rem;
        }
        .problem-grid p {
          color: var(--ink-soft);
          font-size: 0.95rem;
          line-height: 1.55;
          margin: 0;
        }

        .flow {
          border-top: 1px solid var(--line);
          padding: 4rem 2.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .flow h2 {
          font-size: 1.3rem;
          margin: 0 0 2.5rem;
        }

        .flow-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .flow-list li {
          display: grid;
          grid-template-columns: 3rem 1fr;
          gap: 1.5rem;
          padding: 1.6rem 0;
          border-top: 1px solid var(--line);
        }
        .flow-list li:first-child {
          border-top: none;
        }

        .flow-line {
          font-family: "IBM Plex Mono", monospace;
          color: var(--ink-soft);
          font-size: 0.85rem;
          padding-top: 0.15rem;
        }

        .flow-list h3 {
          font-size: 1.02rem;
          margin: 0 0 0.4rem;
        }
        .flow-list p {
          color: var(--ink-soft);
          font-size: 0.95rem;
          line-height: 1.55;
          margin: 0;
          max-width: 54ch;
        }

        .access {
          border-top: 1px solid var(--line);
          padding: 4.5rem 2.5rem 5rem;
          max-width: 640px;
          margin: 0 auto;
          text-align: left;
        }

        .access h2 {
          font-size: 1.3rem;
          margin: 0 0 0.75rem;
        }
        .access p {
          color: var(--ink-soft);
          margin: 0 0 1.75rem;
        }

        .access-form {
          display: flex;
          gap: 0.75rem;
        }
        .access-form input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid var(--line);
          border-radius: 3px;
          font-size: 0.95rem;
          background: var(--paper);
          color: var(--ink);
        }
        .access-form button {
          background: var(--ink);
          color: var(--paper);
          border: none;
          padding: 0.75rem 1.4rem;
          border-radius: 3px;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .access-form button:hover {
          background: #2a323c;
        }

        .access-confirm {
          color: var(--verified);
          font-size: 1rem;
        }

        .foot {
          display: flex;
          justify-content: space-between;
          padding: 2rem 2.5rem;
          border-top: 1px solid var(--line);
          color: var(--ink-soft);
          font-size: 0.85rem;
          font-family: "IBM Plex Mono", monospace;
        }

        @media (max-width: 860px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .problem-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
