# Spec DSL — Syntax Reference (v0.1 draft)

Format: **YAML frontmatter + Markdown body**, with acceptance criteria and
edge cases written as **Given/When/Then (Gherkin-style)** blocks.

This is the **authoring layer** — what the ideation LLM generates and what
humans read/edit in the portal. It compiles down to the canonical JSON,
which the compiler then targets to Playwright (web) and Maestro (iOS).

---

## 1. Frontmatter

```yaml
---
id: join-live-match          # kebab-case, stable, never reused
title: Join a Live Match
surfaces: [web, ios]         # which platforms this spec applies to
layer: ui                    # ui | mobile | api | data — see below
version: 1                   # bump on any material change
status: draft                # draft | approved | building | shipped
source: <link to ideation conversation>   # for drift/audit trail
last_updated: 2026-09-15
---
```

**Rules:**
- `id` is the join key everywhere downstream — compiler output, test
  files, trust-score records, drift checks all reference it.
- `layer` is never a proxy for programming language. It only affects
  which trailing section is expected (see below) — the spec never says
  Python, TypeScript, Swift, or anything implementation-specific. The
  compiler decides the target language; the spec stays language-blind.
- `version` bumps on any change to Acceptance Criteria or Edge Cases.
  Cosmetic Markdown edits (typos, rewording) don't require a bump.
- `status` is set by the portal, not hand-edited — `draft` until a human
  approves it, then `approved`, then advanced automatically as the build
  progresses.

---

## 0. Universal core vs. layer-specific tail

Every spec, regardless of `layer`, shares the same structure through
**Edge Cases**. That's what keeps one compiler, one rubric, and one
trust-score model working across the whole product — a `ui` spec and a
`data` spec are identical in shape until the very end:

| Section | ui / mobile | api | data |
|---|---|---|---|
| Frontmatter | ✓ | ✓ | ✓ |
| Summary | ✓ | ✓ | ✓ |
| Preconditions | ✓ | ✓ | ✓ |
| Acceptance Criteria | ✓ | ✓ | ✓ |
| Edge Cases | ✓ | ✓ | ✓ |
| **Trailing section** | UI States | Interface Contract | *(none — ACs cover it)* |
| Out of Scope | ✓ | ✓ | ✓ |

Only the trailing section swaps. See §6 for all three variants.

---

## 2. Summary

```markdown
## Summary
A spectator joins a live carrom match in progress and sees the board
update in real time.
```

1–2 sentences. Not testable on its own — gives the build agent and the
independent test generator shared context for everything below it.

---

## 3. Preconditions

```markdown
## Preconditions
- User is authenticated
- A live match exists and is joinable
```

State that must already be true before any acceptance criterion applies.
Referenced by id (`PRE-1`, `PRE-2`) if a later criterion needs to point
back to a specific one.

---

## 4. Acceptance Criteria

The core of the spec. Each one is independently testable, tagged with
criticality, and written as Given/When/Then.

```markdown
## Acceptance Criteria

### AC-01 — Spectator joins successfully [critical]
- Given a live match is in progress
- When the user taps "Join"
- Then the board renders within 2 seconds
- And the user is added to the live viewer count

### AC-02 — Match ends while spectating [major]
- Given the user is spectating a live match
- When the match ends
- Then the user sees a "Match complete" state
- And is offered a link to the results screen
```

**Rules:**
- `AC-##` ids are sequential and stable — never renumbered, even if one
  is later removed (mark it `[removed in v3]` instead of deleting, so
  historical test/trust records still resolve).
- Criticality is one of `critical | major | minor` — this is the single
  input that drives risk-weighting in the trust score. If it's unclear
  from the ideation conversation, the spec-generation step should ask
  rather than guess (per the completeness rubric).
- `Given` sets state, `When` is the single triggering action, `Then`/`And`
  are the observable, verifiable outcomes. Avoid vague outcomes like
  "works correctly" — if it can't be checked by a script, it can't be
  compiled into a test.

---

## 5. Edge Cases

Linked to the criterion they stress-test, same Given/When/Then shape.

```markdown
## Edge Cases

### EC-01 (ref: AC-01) — Match becomes full mid-join
- Given the match reaches max spectators as the user taps "Join"
- When the join request completes
- Then the user sees a "Match is full" message
- And is offered similar live matches

### EC-02 (ref: AC-01) — Network drops during join
- Given the user taps "Join"
- When the network request times out
- Then the user sees a retry option
- And no partial join state is left behind
```

The `ref:` link is what the completeness rubric checks — a `critical`
AC with zero linked edge cases is a Recommended-tier gap, flagged
during spec generation.

---

## 6. Trailing section (layer-specific)

Which one appears is determined by `layer` in the frontmatter. Exactly
one per spec — never more than one, never zero for `ui`/`mobile`/`api`.

### 6a. `layer: ui` or `layer: mobile` → UI States

Grouped by surface, since web and iOS states can differ.

```markdown
## UI States

### Web
- loading: skeleton board placeholder, max 2s
- empty: "No live matches right now" with a refresh action
- error: inline banner, non-blocking, retry button
- success: full board renders, live viewer count visible

### iOS
- loading: native spinner over dimmed board
- empty: same copy as web, platform-native empty-state illustration
- error: toast, auto-dismiss after 4s
- success: same as web
```

### 6b. `layer: api` → Interface Contract

Describes the contract, not the implementation — no framework, no
language, no ORM details.

```markdown
## Interface Contract
- POST /matches/{id}/join
- Request: { userId }
- Response 200: { boardState, viewerCount }
- Response 409: match full
- Response 401: not authenticated
```

### 6c. `layer: data` → *(no trailing section)*

Data/logic specs (a scoring algorithm, a matchmaking rule, a batch
transform) usually have nothing left to add here — the Given/When/Then
in Acceptance Criteria already states input state and expected output,
which is the full contract for pure logic. If a data spec later needs
something else (performance bounds, data-quality constraints), that's
a candidate for a 4th trailing-section type, not a reason to bend
UI States or Interface Contract to fit.

---

## 7. Out of Scope

```markdown
## Out of Scope
- Spectator chat (tracked separately)
- Replay/rewind of an already-joined match
```

Prevents the build agent from over-building and the test generator from
inventing coverage for things nobody asked for.

---

## Full worked example

```markdown
---
id: join-live-match
title: Join a Live Match
surfaces: [web, ios]
layer: ui
version: 1
status: draft
source: https://claude.ai/chat/xxxx
last_updated: 2026-09-15
---

## Summary
A spectator joins a live carrom match in progress and sees the board
update in real time.

## Preconditions
- User is authenticated
- A live match exists and is joinable

## Acceptance Criteria

### AC-01 — Spectator joins successfully [critical]
- Given a live match is in progress
- When the user taps "Join"
- Then the board renders within 2 seconds
- And the user is added to the live viewer count

### AC-02 — Match ends while spectating [major]
- Given the user is spectating a live match
- When the match ends
- Then the user sees a "Match complete" state
- And is offered a link to the results screen

## Edge Cases

### EC-01 (ref: AC-01) — Match becomes full mid-join
- Given the match reaches max spectators as the user taps "Join"
- When the join request completes
- Then the user sees a "Match is full" message
- And is offered similar live matches

### EC-02 (ref: AC-01) — Network drops during join
- Given the user taps "Join"
- When the network request times out
- Then the user sees a retry option
- And no partial join state is left behind

## UI States

### Web
- loading: skeleton board placeholder, max 2s
- empty: "No live matches right now" with a refresh action
- error: inline banner, non-blocking, retry button
- success: full board renders, live viewer count visible

### iOS
- loading: native spinner over dimmed board
- empty: same copy as web, platform-native empty-state illustration
- error: toast, auto-dismiss after 4s
- success: same as web

## Out of Scope
- Spectator chat (tracked separately)
- Replay/rewind of an already-joined match
```

---

## Second worked example — `layer: api`

Same shape through Edge Cases, different trailing section. No mention
of Python, Node, or any framework — that's the compiler's job.

```markdown
---
id: match-join-endpoint
title: Match Join Endpoint
surfaces: [api]
layer: api
version: 1
status: draft
source: https://claude.ai/chat/yyyy
last_updated: 2026-09-15
---

## Summary
Backend endpoint that adds a user to a live match's viewer list and
returns current board state.

## Preconditions
- User is authenticated
- Match exists

## Acceptance Criteria

### AC-01 — Successful join [critical]
- Given a live match under capacity
- When a join request is received
- Then the response is 200 with board state and viewer count
- And the viewer count increments by 1

## Edge Cases

### EC-01 (ref: AC-01) — Match at capacity
- Given the match is at max viewers
- When a join request is received
- Then the response is 409
- And viewer count does not increment

## Interface Contract
- POST /matches/{id}/join
- Request: { userId }
- Response 200: { boardState, viewerCount }
- Response 409: match full
- Response 401: not authenticated

## Out of Scope
- Rate limiting (tracked separately)
```

---

## Open questions for the next pass
- Exact JSON shape this compiles to (field-for-field mapping)
- How `[removed in vN]` criteria are handled by the drift checker
- Whether `ref:` links are required or advisory for `minor` criteria
