# Spec Authoring Guide

**What this is:** a plain-language companion to `spec-dsl-syntax.md`. That
doc defines the exact syntax; this one explains *what to actually write*
in each section, why it matters, and how much detail is enough.

**Who this is for:** whoever is ideating a feature — usually you, talking
it through with an LLM — and anyone reviewing a generated spec before
approving it.

**The one thing to keep in mind throughout:** this spec is the *only*
thing the independent test generator ever reads. It never looks at the
code. If something isn't written here, it doesn't get tested — no matter
how obvious it seems while you're building.

---

## Before you start: what layer is this?

Ask: does this feature have a user-facing surface (`ui`/`mobile`), is it
a backend contract (`api`), or is it pure logic with no interface of its
own (`data`)? This decides which trailing section you'll fill in later —
everything before that is the same regardless.

---

## Summary

One to two sentences. What is this, in plain English, for someone with
zero context. Not tested directly — it exists so the build agent and the
test generator start from the same understanding of *what this is for*,
not just what boxes to check.

**Good:** "A spectator joins a live carrom match in progress and sees the
board update in real time."
**Too vague:** "Live match joining feature."
**Too much:** don't restate acceptance criteria here — that comes later.

---

## Preconditions

What has to already be true before this feature does anything. Think of
it as the starting line.

**Ask yourself:** if I handed this spec to someone who'd never seen the
product, what would they need to already know exists or be already true?

**Good:** "User is authenticated." "A live match exists and is joinable."
**Skip:** things that are true for literally every feature in the product
(e.g. "the app is installed") — only list what's specific to *this* one.

---

## Acceptance Criteria — the part that matters most

Each criterion is one independently-testable behavior, written as:

- **Given** — the state right before the action
- **When** — the one thing that triggers it
- **Then** (+ **And**) — what should observably happen

**How to know if you've written a good one:** could a script check the
"Then" without a human's judgment call? If the answer is "it depends" or
"you'd know it when you see it," it's not specific enough yet.

| Vague (don't) | Testable (do) |
|---|---|
| "The join should work well" | "The board renders within 2 seconds and viewer count increments by 1" |
| "Errors are handled" | "A 409 response shows a 'Match is full' message and offers similar matches" |
| "It's fast" | "Response returns within 500ms at p95" |

**One action per criterion.** If your "When" has an "and" in it
("when the user joins and the match starts"), it's probably two criteria.

### Criticality — this drives the trust score directly

For each criterion, ask: **if this specific behavior breaks in
production, what happens?**

- **critical** — the feature is unusable, or something is lost/wrong
  that a user can't recover from (data loss, payment issue, can't
  complete the core action at all)
- **major** — the feature still basically works, but this specific path
  is broken or degraded (a fallback exists, or it's a secondary flow)
- **minor** — cosmetic, or an edge condition with low real-world
  frequency and no lasting consequence

**If you're unsure, say so rather than guessing** — a spec-generation
session should ask you directly when criticality isn't obvious from how
you described the feature, because guessing wrong here quietly distorts
the trust score later.

---

## Edge Cases

For every `critical` acceptance criterion, ask: **what's the one thing
most likely to go wrong right at that moment?** Network failure mid-action,
a limit being hit, a second user doing something at the same time, stale
data. Write it the same Given/When/Then way, and reference which AC it's
stress-testing (`ref: AC-01`).

**You don't need to cover everything** — three thoughtful edge cases beat
ten generic ones ("what if the internet is down" copy-pasted onto every
criterion). Prioritize the failure modes that are actually plausible for
*this* feature.

**`major`/`minor` criteria don't strictly need edge cases** — it's a nice-
to-have there, not a gap that lowers your trust ceiling.

---

## The trailing section (pick based on layer)

- **`ui` / `mobile`** → **UI States.** For each surface, what does
  loading, empty, error, and success actually look like? Be specific
  enough that someone could build it without asking you — "skeleton
  placeholder, max 2s" not "loading state."
- **`api`** → **Interface Contract.** The request/response shape and
  status codes. This is the contract, not the implementation — never
  mention the language, framework, or database.
- **`data`** → nothing extra needed most of the time. Your Acceptance
  Criteria's Given/When/Then already is the input → output contract.

---

## Out of Scope

Anything a reasonable person might assume is included, but isn't. This
protects you two ways: it stops the build agent from quietly over-building,
and it stops the test generator from inventing tests for things you never
asked for (which would otherwise look like unexplained coverage gaps).

**Good:** "Spectator chat (tracked separately)." Specific, names the thing.
**Not useful:** "Anything not mentioned above" — too vague to act on.

---

## What happens if you leave something out

Nothing blocks you. The spec still generates, the build still happens.
But every gap has a visible, honest cost later:

- **No acceptance criteria at all** → nothing to test. This is the only
  true stop — there's simply nothing to compile yet.
- **A criterion with no criticality, or a critical one with no edge
  case, or a UI state left unaddressed** → the spec's trust *ceiling*
  drops. The build can still pass every test and still cap out at a
  visibly lower confidence score — you'll see exactly why, and can
  decide whether to fix the spec or ship anyway.
- **Vague wording, an overly broad criterion** → flagged once as a
  suggestion, never blocks anything.

The system trusts you to move fast with a rough spec. It just stays
honest about what that costs, instead of pretending a thin spec is as
trustworthy as a thorough one.

---

## Quick checklist before you approve a spec

- [ ] Every acceptance criterion's "Then" could be checked by a script
- [ ] Every criterion has a criticality tag
- [ ] Every `critical` criterion has at least one edge case
- [ ] All four UI states are addressed (if `ui`/`mobile`)
- [ ] Out of Scope names anything a reasonable person might assume is included
