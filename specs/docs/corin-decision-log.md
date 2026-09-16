# Corin — Decision Log

**What this is:** a running record of every architectural decision made
for Corin (getcorin.ai) — a spec-driven, test-first **development
management platform**, in the order the flow executes. The spec is the
durable artifact; build and test are both downstream consumers of it,
and the system governs the full path from idea to shipped feature and
back. Product-
agnostic by design — not scoped to any one app. CarromLive, SpendCraft,
DeepDesk, and future apps are dogfooding/usage contexts, not the product.

**How this doc is used:** appended to, node by node, as decisions are
made. Each section states the decision and the reasoning, not the
discussion that led there.

---

## Flow overview

The end-to-end pipeline, in order. Each stage is documented in detail in
its own numbered section below.

```
Idea / requirement
      │
      ▼
Spec & criteria  ──────────────────────┐
      │                                │  (independent tests are
      ▼                                │   generated straight from
    Build                              │   the spec, not from the
      │                                │   build's output)
      ▼                                ▼
Independent tests  ◄────────────────────
      │      ▲
      │      │ on failure: agent revises the build
      │      └──────────────────────────┘
      │ on pass
      ▼
Trust score & drift check
      │
      ▼
Release gate
      │
      ▼
  (ships)
      │
      ▼
↻ production data refines the spec
```

**Key structural properties this encodes:**
- Independent tests are generated from the **spec**, never from the
  build's code — the build only feeds test *execution*, never test
  *design*. This is what makes the retry loop trustworthy: the agent
  can't overfit to pass a test it effectively wrote itself.
- The build↔test cycle is a bounded retry loop, not a one-shot pair —
  capped, with structured failure detail fed back to the agent on each
  failed attempt (cap mechanics: see Open Questions).
- Trust score and drift check happen only after tests pass — they
  gate release, they don't gate the retry loop itself.
- The feedback loop closes on production signals refining the spec,
  not on developer intuition — keeping intent, not implementation, as
  the durable source of truth as the system evolves.
- A swarm testing layer (§6) sits alongside the deterministic suite for
  criteria that warrant deeper, cross-layer verification — triggered
  selectively, not run on every build, and never itself the source of
  the trust score's execution number.

---

## 0. Core philosophy

- **Intent-first development is the moat.** Tests are generated from the
  spec (statement of intent), never from the implementation. This is
  both the differentiator and the safety mechanism — it prevents the
  test suite from inheriting the same blind spots as the model that
  wrote the code.
- **Trust model:** two live numbers, not one blended score —
  **execution score** (weighted by criticality, from actual test
  results) and **confidence ceiling** (from spec completeness, capping
  the execution score regardless of pass rate). The full computation is
  stored as a trace — which specific criteria passed/failed and which
  specific completeness gaps capped the ceiling — not just the two
  final numbers. Needed for the root-cause chat function (§7).
- **Nudge, don't gate.** The system stays honest about spec/test
  quality but doesn't block the user from shipping. The only true
  hard-stop is zero testable acceptance criteria — there's nothing to
  test yet, not a low score.
- **Target user:** a "quality owner" — tech lead, eng manager, or
  dedicated AI-QA role. Owns what ships, doesn't write the code. The
  tool acts on developer/agent output, not through their hands.
- **Team-size framing is deliberately avoided.** Built for AI-native
  development broadly — usable by a team of any size, not positioned
  as solo-vs-enterprise.
- **Confidence ceiling formula:** starts at 100, only computed once
  Foundational (§1) passes — Foundational is the enabling gate, not
  part of the deduction math. Recommended-tier gaps deduct points,
  scaled by the criticality of the criterion they relate to, mirroring
  how the execution score already weights by criticality:

  | Gap | Penalty |
  |---|---|
  | Missing edge case on a `critical` AC | −15 |
  | Missing edge case on a `major` AC | −7 |
  | Missing edge case on a `minor` AC | −2 |
  | Missing UI state, per state | −5 |
  | Precondition left undefined where clearly needed | −5 |
  | One-way `related_specs` link (§6) | −5 |

  Advisory-tier issues cost nothing — mentioned once per §1, never
  touch the ceiling, keeping the nudge proportional to the tier.
  **Floor at 40, not 0** — a spec that passed Foundational shouldn't
  fall to "worthless" purely on Recommended-tier gaps; 40 keeps the
  ceiling meaningfully below a thin-but-valid spec without collapsing
  the distinction between "thin" and "nothing." Gaps stack additively,
  clamped to the floor — no per-gap caps, since each represents a
  genuinely separate blind spot. **Drift and swarm flags stay out of
  this formula entirely**, consistent with §7 — they're distinct gate
  inputs, not folded into the score/ceiling pair.

---

## 1. Idea → Spec (ideation phase)

- **Where ideation happens:** general-purpose chat surfaces (Claude.ai,
  ChatGPT) — not Cursor. Cursor/Claude Code is the build/refinement
  environment, not where specs are born.
- **Trigger mechanism:** MCP tool-call, **explicitly invoked by the
  user** ("generate the spec" / "let's formalize this"). Not a passive
  background listener — Claude.ai and ChatGPT don't expose session
  hooks or local transcript files the way Claude Code does, so an
  explicit tool-call is the only real integration point on these
  surfaces. Given the target user is an intentional platform user, this
  is an acceptable and simpler design than trying to engineer automatic
  detection of "readiness."
- **Completeness rubric runs live, inside that tool call** — evaluated
  fresh from the conversation each time, never stored as metadata on
  the spec. Three tiers:
  - **Foundational** (hard floor): at least one acceptance criterion,
    each with a criticality tag. If missing, nothing to compile yet —
    stated plainly, offer to draft rather than block.
  - **Recommended**: edge case per critical criterion, all UI states
    addressed, preconditions defined. Flagged conversationally, one at
    a time, skippable.
  - **Advisory**: vague wording, overly broad criteria. Mentioned once,
    never blocks, never repeated.
- **No confirmed/inferred metadata stored on the spec.** Completeness
  is judged fresh by the LLM every time the spec is read (generation,
  build time, trust-scoring time) — simpler, no schema overhead, and it
  means the same judgment applies even to specs edited outside this
  flow entirely.
- **Cursor's role in refinement:** rule files instruct the build agent
  to flag divergence from the spec as it builds (see §2), which can
  feed back into spec updates — but Cursor is not where a spec is
  originally authored.
- **For `ui`/`mobile`-layer specs, ideation asks for design system
  references if not already provided** — existing style guide docs,
  Figma links, brand tokens, component libraries. Feeds the shared
  design-intent reference (§2's companion docs) rather than being
  captured per-spec; a spec author isn't expected to re-supply this
  every time, only the first time or when it's missing. This is what
  gives the style-deviation check (§6) something concrete to judge
  against, rather than an LLM guessing at "good taste" with no
  reference.

---

## 2. Spec format (the DSL)

- **Three-layer structure:**
  1. **Authoring DSL** (what gets generated/edited) — Markdown body +
     YAML frontmatter + Gherkin-style (Given/When/Then) blocks for
     Acceptance Criteria and Edge Cases. Chosen because all three
     components are heavily represented in LLM training data
     (Jekyll/Hugo-style frontmatter, BDD/Cucumber Gherkin), minimizing
     malformed generation.
  2. **Canonical storage** — JSON. Not a moat itself; it's tooling
     value (schema validation, diffing, compiler input), not secrecy.
  3. **Compiled output** — Playwright test files (web), Maestro YAML
     flows (iOS). Never hand-written.
- **What's actually defensible:** the taxonomy/schema, the criticality
  tiers, the completeness rubric logic, the trust-score formula, and
  the compiler — not the serialization format.
- **Universal core schema** (identical across every spec, regardless of
  layer): Frontmatter → Summary → Preconditions → Acceptance Criteria →
  Edge Cases → *(layer-specific trailing section)* → Out of Scope.
- **`layer` field in frontmatter** (`ui | mobile | api | data`) —
  determines only which trailing section applies. **Never a proxy for
  programming language** — the spec stays fully language/framework-
  blind; the compiler alone decides implementation target.
  - `ui` / `mobile` → **UI States** section (loading/empty/error/success
    per surface)
  - `api` → **Interface Contract** section (endpoint, request/response
    shape, status codes — contract only, no implementation detail)
  - `data` → no trailing section; Given/When/Then in Acceptance
    Criteria already is the full input→output contract
- **Id stability:** `AC-##` / `EC-##` ids are sequential and permanent —
  never renumbered. Removed criteria are marked `[removed in vN]`, not
  deleted, so historical trust-score/test records stay resolvable.
- **Criticality (`critical | major | minor`)** is the single input
  driving trust-score risk-weighting. If unclear during authoring, the
  spec-generation step asks rather than guesses.
- **Companion docs published (source of truth going forward):**
  - `spec-dsl-syntax.md` — exact structure/syntax, both `ui` and `api`
    worked examples
  - `spec-authoring-guide.md` — plain-language guidance on what to
    write per section, good-vs-vague examples, the completeness-cost
    explanation, pre-approval checklist
  - `design-intent-reference.md` (planned) — a shared, product-level
    taste/style baseline (spacing scale, brand tokens, component
    behavior norms) built from design system files and reference
    material gathered during ideation (§1). Lives once, referenced by
    every `ui`/`mobile` spec rather than restated per-spec; this is
    what the style-deviation check (§6) judges against.
- **Canonical JSON schema** — the compiler's, drift detection's, and the
  trust-score trace's actual input. Direct 1:1 mapping from the DSL,
  nothing invented beyond what's already decided elsewhere in this log:

  ```json
  {
    "id": "join-live-match",
    "title": "Join a Live Match",
    "surfaces": ["web", "ios"],
    "layer": "ui",
    "version": 1,
    "status": "draft",
    "source": "https://claude.ai/chat/xxxx",
    "last_updated": "2026-09-15",
    "related_specs": ["match-join-endpoint"],
    "retry_cap": null,
    "release_threshold": null,

    "summary": "A spectator joins a live match in progress...",
    "preconditions": ["User is authenticated", "A live match exists and is joinable"],

    "acceptance_criteria": [
      {
        "id": "AC-01",
        "title": "Spectator joins successfully",
        "criticality": "critical",
        "status": "active",
        "given": "a live match is in progress",
        "when": "the user taps \"Join\"",
        "then": ["the board renders within 2 seconds", "the user is added to the live viewer count"]
      }
    ],

    "edge_cases": [
      {
        "id": "EC-01",
        "ref": "AC-01",
        "title": "Match becomes full mid-join",
        "given": "...", "when": "...", "then": ["..."]
      }
    ],

    "trailing": {
      "type": "ui_states",
      "surfaces": {
        "web": { "loading": "...", "empty": "...", "error": "...", "success": "..." },
        "ios": { "loading": "...", "empty": "...", "error": "...", "success": "..." }
      }
    },

    "out_of_scope": ["Spectator chat (tracked separately)"]
  }
  ```

  - `retry_cap` / `release_threshold` default to `null`, meaning "use
    the global config value" — explicit null rather than omitting the
    key, so the compiler and gate can distinguish "not set" from "set
    to zero" unambiguously.
  - `status: "active" | "removed"` on each criterion, not deletion —
    the machine-readable implementation of the `[removed in vN]` rule
    (§2), rather than a Markdown-comment convention.
  - `trailing` is a tagged union keyed by `type`
    (`ui_states | interface_contract | none`), matching `layer` 1:1 —
    the compiler switches on `trailing.type` directly rather than
    re-deriving it from `layer` a second time.
  - **Runtime records stay out of this file.** Build-notes, swarm
    notes, and the trust-score trace (§3, §5, §6, §0) are separate
    records that reference a spec's `id` and `version`, not fields
    embedded in the spec — keeps the spec a clean, versionable artifact
    rather than a growing log.
  - **This schema needs to be kept current as the rest of the design
    evolves** — any new frontmatter field, trailing-section type, or
    structural decision made elsewhere in this log should be reflected
    back here, or the schema silently drifts out of sync with its own
    source document.

---

## 3. Build (spec → Cursor/Claude Code)

- **Pre-build consistency gate.** Before Build starts, a lightweight
  internal-consistency check runs against the spec — not the
  completeness rubric (which checks thinness), but a check for
  self-contradiction (e.g. two Acceptance Criteria that cannot both be
  true). With no human reviewing the spec before build begins, a
  contradictory spec would otherwise burn the full retry cap and any
  swarm budget on something no fix could ever satisfy.
- **Discovery mechanism:** a standing rule file (`CLAUDE.md` /
  `.cursor/rules`) instructs the agent to locate the matching spec by
  id/title in `specs/features/` before building or modifying a
  feature, and treat its Acceptance Criteria + Edge Cases as the
  binding contract for "done."
- **Trigger:** the user's own build prompt resolves the spec id. If no
  matching spec exists, the agent states that and stops rather than
  building ungoverned.
- **Build agent has read-only access to the spec.** It cannot edit
  Acceptance Criteria, Edge Cases, or bump `version` — those are
  portal/ideation-side changes only. This preserves the independence
  guarantee between what's built and what tests it.
- **Ambiguity handling:** if the agent hits a genuine spec gap while
  building, it doesn't resolve it by silent assumption — it logs a note
  (`build-notes.md`, tagged to the spec id) and proceeds with its best
  interpretation. Each note includes a `rationale` field — the specific
  reasoning behind the interpretation, not just a description of the
  ambiguity — needed for the root-cause chat (§7) to explain *why* the
  agent chose what it chose, not just *that* it had to choose. That note
  feeds drift detection and nudges a spec refinement, rather than
  becoming an undocumented decision baked into shipped behavior.
- **No self-certification.** The build agent stopping just means it
  handed off — pass/fail is exclusively the independent test stage's
  call.
- **Fresh context per retry attempt.** Each retry re-reads the spec
  fresh, using only the prior attempt's structured failure detail as
  new input — not the agent's own accumulated reasoning about what it
  thinks the spec means. Without this, a misread on attempt 1 can
  compound silently across all remaining attempts with nobody there to
  notice.
- **Edit scope enforcement during retries.** Changes are constrained to
  the spec's declared governed file paths; a diff outside that scope
  is flagged rather than silently landing. Guards against an agent
  "helpfully" touching unrelated files while chasing a fix over
  multiple unsupervised attempts — normally a human review step catches
  this, and here there isn't one.
- **Crash/resume must not corrupt attempt counts.** An infrastructure
  failure mid-attempt (not a real test failure) must not silently
  consume a retry or leave state ambiguous, since there's no human to
  notice and manually correct it.

---

## 4. Independent test generation (the compiler)

- **One core compiler, two thin backend emitters.** The compiler parses
  the spec's canonical JSON into an intermediate, framework-agnostic
  action list — each Acceptance Criterion/Edge Case becomes a sequence
  of abstract steps (e.g. `{action: tap, target: "Join button"}`,
  `{assert: elementVisible, target: "board"}`). Two emitters translate
  that intermediate form into Playwright TypeScript or Maestro YAML.
  Adding a future surface (e.g. native Android) means writing one new
  emitter against the existing intermediate form, not rebuilding the
  compiler.
- **Target resolution is LLM-assisted, not deterministic string-
  matching.** Acceptance Criteria are written in human phrasing
  ("tap the Join button"), not selectors. An LLM step in the compiler
  resolves that phrasing against the actual current UI (accessibility
  tree/DOM inspection at compile time) rather than relying on brittle
  regex/string matching against spec text.
- **`layer` gates this step.** `ui`/`mobile` specs go through UI target
  resolution; `api` specs skip it entirely — the Interface Contract's
  explicit request/response shape is already unambiguous and compiles
  directly.
- **Compilation happens at build-test time, not at spec-approval
  time.** A spec approved earlier compiles against the *current* UI/API
  surface when a build actually runs, not a stale snapshot from
  approval — keeps tests current without manual maintenance.
- **One-way data flow, enforced structurally.** The compiler never
  writes back to the spec. Its output lands in
  `specs/compiled/{id}.json` (intermediate form) and generated test
  files under the project's normal `tests/` directory. Spec is always
  upstream of tests, never the reverse.
- **Build agent has no write access to compiled test files or the test
  harness/runner.** Extends the same read-only principle from §3 to
  the test layer itself — otherwise an agent under pressure to pass
  could edit the test it's being judged against, or patch the runner's
  reporting, rather than fixing the actual code. Documented cases of
  this exact behavior (editing assertions, monkey-patching test
  reporting, forcing exit codes) are why this is enforced structurally
  rather than left to instruction alone.
- **Different model providers for build vs. compiler resolution.** The
  build agent and the compiler's LLM-assisted UI-target-resolution step
  must not be the same underlying model. A shared blind spot between
  the thing that builds and the thing that tests would normally surface
  on human review; with no human in the loop between spec and test
  completion, that coincidence has no other chance to be caught.
- **One composed test per spec, in addition to per-criterion tests.**
  Individual Acceptance Criteria passing in isolation doesn't guarantee
  they hold up chained together as a real user journey — a documented
  gap in agentic coding evaluation generally. The compiler emits one
  end-to-end sequence alongside the isolated AC/EC tests for this
  reason.
- **Randomized concrete values at each compile.** Given/When/Then
  constraints are filled with different concrete data per compile
  (different match id, different user) rather than fixed placeholder
  values, to resist an agent hardcoding output for values it can
  predict in advance.
- **Viewport-bounds check, as a free universal baseline.** §4's
  accessibility-tree-based element resolution is fast because it skips
  visual geometry — which means an element can be "present and
  visible" in the tree while actually rendering off-screen or clipped
  by a container. When the compiler resolves an element to interact
  with it, it already has that element's bounding box available; one
  added assertion (is this box fully within the viewport or its
  scrollable container) catches the common case — a dropdown rendering
  off-screen, a button clipped by overflow — with no spec authoring
  required and near-zero added cost. This does not replace true visual
  regression testing (pixel-diff tools like Percy/Chromatic, which
  catch subtler spacing/overlap issues) — that's a heavier, separate
  tool category, deliberately not adopted here.
- **Anything more specific than generic viewport bounds still needs to
  be an explicit edge case in the spec** — intent-first testing can't
  invent a layout expectation nobody stated. `spec-authoring-guide.md`
  should be updated with a short nudge encouraging `ui`-layer spec
  authors to name layout-specific expectations explicitly when they
  matter (still pending — noted here, not yet written into that file).

---

## 5. Retry-loop cap & escalation

- **Default: 3 attempts. User-configurable.**
- **Overridable per-spec.** An optional `retry_cap` field in spec
  frontmatter overrides the global default for that one feature, falling
  back to the global value when unset. Criticality varies: a `critical`
  flow may warrant a lower cap (fail fast, escalate sooner); a `minor`
  feature may warrant a higher one (let the agent keep trying before
  involving a human).
- **On cap hit → `blocked`, not `failed`.** A distinct build status from
  a normal test failure. This is the status the release gate and
  dashboard key off — the build is not silently retried again without a
  human decision.
- **Full failure history is preserved, not just the last attempt.** All
  N attempts' structured failure details — including a `rationale` for
  the agent's interpretation at each attempt, not just the pass/fail
  outcome — stay attached to the build record, so a reviewer (or the
  root-cause chat, §7) can tell whether the agent was converging or
  looping on the same issue — which changes whether the right fix is
  nudging the agent again or revising the spec itself.
- **Escalation is currently a state, not an action.** `blocked` means
  visibly surfaced for the quality owner to find — no auto-notification
  mechanism decided yet; depends on portal design (still open).

---

## 6. Swarm testing & cross-layer coordination

- **Purpose:** the deterministic compiled suite (§4) stays the fast,
  cheap, always-run backbone. The swarm is an additional layer for what
  isolated deterministic tests structurally can't catch: multi-actor
  concurrency, whether criteria hold up composed together as a real
  journey, and cross-layer consistency (API and UI agreeing on the
  same state). It is not a replacement for the deterministic suite and
  does not feed the trust score's execution number — its findings are
  a separate signal alongside the score.
- **Triggered selectively, not on every build:** `critical`
  criticality, specs explicitly involving multiple actors, or on-demand
  before a release gate decision.
- **`related_specs` field in frontmatter** links specs describing the
  same feature across layers (e.g. `join-live-match` ↔
  `match-join-endpoint`). Required to be declared symmetrically on both
  sides — a one-way link is flagged as a spec-quality issue, same
  handling as other Recommended-tier gaps. Circular chains
  (A→B→A) are rejected at compile time.
- **Version mismatch between related specs is a drift case.** If
  linked specs' versions imply they were last touched together but have
  since diverged, drift detection (§8) fires — same mechanism as
  code-vs-spec drift, not a separate check.
- **Shared notes schema** (used for both coordination and
  ambiguity-detection modes — one schema, two consuming reconciliation
  rules, not two schemas):
  - `agent_id` / `layer` — which worker, and api or ui
  - `spec_id`, `ac_ref` — which spec and criterion
  - `verdict` — `pass | fail | blocked | ambiguous`
  - `type` — `functional | contract-mismatch | ambiguity`
  - `evidence` — concrete observation (response body, screenshot ref,
    assertion diff)
  - `rationale` — the reasoning behind the verdict, not just the
    observation — what proves something happened vs. why the agent
    judged it that way. Needed for the root-cause chat (§7) to explain
    findings, not just list them.
  - `confidence` — how sure the agent is
  - `blocks` — other layers/criteria this result should gate
  - `timestamp`
- **Coordination protocol:**
  - Workers start in parallel by default.
  - Before running a UI Acceptance Criterion whose `Given` assumes a
    dependency succeeded, the UI worker checks the board for that
    dependency's verdict. A posted `fail` produces
    `blocked: dependency-failed` referencing the root cause, instead of
    a separate, misleading UI failure report.
  - **This blocking rule never applies to Edge Cases that are
    themselves about the dependency failing** — those depend on the
    failure occurring and must still run.
  - One retry on a suspected transient dependency failure before
    cascading a block, so a flaky test environment doesn't produce a
    false negative on everything downstream.
  - `blocked: timeout` (dependency never reported) is tracked
    separately from `blocked: dependency-failed` — the fix for each is
    different (infra vs. an actual bug).
  - A reconciliation step compares state that should agree across
    layers (e.g. API's `viewerCount` vs. what the UI renders).
    Structured value comparisons use deterministic equality, not an
    LLM judgment — reserve agent-level reconciliation for genuinely
    fuzzy comparisons only, to avoid reintroducing non-determinism
    into a check that doesn't need it.
  - Same-layer ambiguity detection (independent agents, same
    criterion, disagreement is itself a signal fed to the completeness
    rubric) stays deliberately independent — no cross-talk — since
    that's a different relationship (duplicate coverage) than
    dependency coordination. **Independent poll is the default; escalate
    to a bounded leader-follower debate only on a genuine split.** If the
    independent poll produces no majority verdict among the agents, the
    same agents enter a capped debate (max 2-3 rounds: one agent
    proposes, the others agree/disagree with reasoning, the proposer
    revises if needed) to attempt resolution rather than leaving a flat
    disagreement. If the debate doesn't converge within the round cap,
    it terminates as `ambiguous` — the same outcome an unresolved poll
    would have produced, just with the extra resolution attempt logged.
    Every debate round is written to the blackboard with the same
    schema as any other note (`rationale`, `verdict`, plus a `round`
    number), so the root-cause chat (§7) can reconstruct the negotiation,
    not just cite a final flag. Kept as an escalation path rather than
    the default specifically to preserve the independent poll's cost
    and parallelism advantages for the common case, and to limit the
    debate's own convergence risk (a leader's framing swaying followers)
    to only the cases that actually need the extra resolution attempt.
- **Shared, pinned test data per run.** One seed/dataset is generated
  at compile time and handed to every worker in a swarm run, so workers
  testing "the same" instance are actually looking at the same data.
- **Environment isolation per swarm run.** Each run gets its own
  isolated environment/data instance, so concurrency scenarios (e.g.
  two spectators joining at once) reflect deliberate concurrency, not
  accidental collision with another build's run.
- **Full transcript retained, not just the verdict.** Divergence
  between agents is diagnostic; attached to the immutable build record
  for audit, same as build failure history.
- **Own budget, separate from the retry cap.** A swarm-discovered issue
  opens a new build-notes cycle — it does not debit the existing
  `retry_cap` from §5. Cost ceiling follows the same shape as
  `retry_cap`: `max_swarm_agents` / `max_swarm_duration`, global default
  with per-spec override.
- **Deferred, not decided:** a dedicated `data`-layer worker — only
  worth adding if a `layer: data` spec has no API surface already
  covering it.
- **Swarm sizing: `dynamic` by default, `fixed` as a fallback option**
  (`swarm_sizing: fixed | dynamic` in project config).
  - **Dynamic sizing rides on the same completeness pass (§1), not a
    separate stage.** When a spec is read for completeness, the same
    LLM pass also scores complexity, since it's already looking at the
    whole spec. Signals: count and criticality mix of Acceptance
    Criteria, density of Edge Cases, number of `related_specs` (how
    many layers the feature spans), and concurrency/multi-actor intent
    detected directly from Given/When/Then wording — not a keyword
    trigger.
  - **Produces a proposed swarm shape, not a yes/no.** E.g. one worker
    per declared layer via `related_specs`, plus one per detected
    concurrent-actor scenario, with exploration depth/duration scaling
    with the count of `critical` criteria.
  - **Always clamped to `max_swarm_agents` / `max_swarm_duration`.** If
    the proposed shape exceeds budget, the reduced version runs and the
    scale-down is recorded — visible, not silent, same posture as
    every other soft limit in this system.
  - **`fixed` keeps the original rule** (`critical` criticality,
    explicit multi-actor specs, or on-demand pre-release) as a simpler,
    more predictable fallback.
  - **Chosen as default over `fixed` deliberately, to learn from real
    usage during dogfooding** before this is relied on by other
    projects or sold as a product. Trade-off accepted knowingly: early
    on, swarm cost per build is less predictable while the
    complexity-to-size mapping is still being tuned — the budget clamp
    bounds it, but bounded isn't the same as well-calibrated yet. Worth
    watching actual swarm spend closely through the first stretch of
    dogfooding.
- **Orchestration substrate: LangGraph-style deterministic state graph,
  not an LLM-mediated framework.** Coordination (who runs next, whether
  a dependency's verdict blocks a downstream check, when the debate
  escalation in this section fires) is code-based graph routing, not an
  LLM deciding handoffs — matching §6's existing deterministic-first
  posture (structured reconciliation, immutable audit trail, capped
  budgets). Cheaper and more auditable than role-based LLM-mediated
  orchestration, and gives the root-cause chat (§7) a real state graph
  to reconstruct rather than an inferred conversation.
- **Heterogeneous model allocation across workers, for cost control.**
  Not every worker needs the same model. Structured, deterministic work
  (reconciliation equality checks, dependency-status lookups on the
  blackboard) runs on a cheaper/faster model; genuine semantic reasoning
  (UI target resolution, ambiguity judgment, debate rounds) reserves the
  stronger model. Same principle as the compiler's model-diversity rule
  (§4), applied for cost rather than for independence — the two
  requirements don't conflict as long as the build agent, the compiler
  resolution step, and the swarm's semantic-reasoning model stay
  distinct where §4 requires it.
- **Style-deviation check: judges rendered output against the shared
  design-intent reference (§1, §2), not against per-spec criteria.**
  A dropdown fully in-viewport (caught for free by §4's bounding-box
  check) can still violate house style — wrong spacing, inconsistent
  component behavior versus the rest of the product. This is a
  semantic-reasoning judgment, same lane as ambiguity detection, not a
  deterministic assertion — an LLM comparing what rendered against the
  design-intent doc.
  - **New note type:** `style-deviation` added alongside
    `functional | contract-mismatch | ambiguity` in the shared notes
    schema above. Surfaces as a flag, same nudge-don't-gate posture as
    every other swarm finding — never a blocker on its own.
  - **Triggered selectively, not on every UI-layer swarm run.** Fires
    when a spec is UI-heavy (multiple screens, dense UI States section)
    or contains `critical`-tier UI-facing criteria — not on a minor,
    low-criticality UI tweak, where a taste-judgment pass adds cost for
    something that usually isn't the point of that particular change.
    Same selective-trigger philosophy as the swarm's overall
    activation rule and as dynamic sizing (§6, above).

---

## 7. Release gate & root-cause chat

- **Threshold config follows the same pattern as `retry_cap` and
  `max_swarm_*`** — a global default (`release_threshold`) in project
  config, overridable per-spec via frontmatter for features that
  warrant a stricter or looser bar.
- **The gate checks the live combined number** — execution score capped
  by the confidence ceiling (§0) — evaluated fresh at ship time, not a
  cached value from when the build last ran.
- **Swarm findings are a distinct input, not folded into the score.**
  An unresolved `ambiguous` or `contract-mismatch` note (§6) surfaces at
  the gate as its own flag, separate from the score/ceiling pair. A
  build can score perfectly on the deterministic suite and still carry
  an unresolved swarm flag that needs a human's judgment — averaging
  that into one number would hide exactly the thing that needs
  attention.
- **`verification_status: complete | partial`, shown alongside the
  score.** If a swarm run hit its budget ceiling or a dependency
  `blocked: timeout` before finishing (§6), the feature reaches the
  gate not fully checked — categorically different from "checked and
  scored low." A human seeing `partial` should first ask whether to
  finish verification before asking whether to ship despite the score.
- **Below threshold, an unresolved swarm flag, or `partial` status is a
  soft stop, not a hard one** — consistent with "nudge, don't gate."
  The one true hard-stop stays "zero testable criteria" (§1); nothing
  else escalates to a hard block here.
- **Auto-ship path for the clean case.** Score ≥ threshold,
  `verification_status: complete`, zero unresolved swarm flags, zero
  drift → ships automatically, logged the same as any other gate
  decision. With no human watching most builds in real time, requiring
  a manual click on every trivially clean, low-criticality feature
  doesn't match the "one level above the developer" persona — the
  human's attention should go to builds that actually need judgment.
- **Override reason is structured, not free text** — a fixed set of
  categories (e.g. acknowledged ambiguity / accepted contract-mismatch
  / shipped despite incomplete verification / accepted score below
  threshold), permanently logged to the immutable per-build audit
  record. More useful for audit than free text, and sets up eventually
  correlating override reasons against real production issues, feeding
  §0's production→spec loop.
- **Role/permission model deferred.** Only the mechanic is decided here
  (an override requires a structured reason and is permanently logged)
  — who is allowed to perform it is left to Auth/roles (still open),
  rather than inventing role names ahead of the portal actually
  existing.

### Root-cause chat

- **Purpose:** with no human in the loop from spec approval through
  test completion, the gate is the first point a human sees anything —
  the chat lets them ask "what happened" and "what should I look at"
  once they're there.
- **Scoped strictly to one build's own record** — that build's spec
  version, all retry attempts' failure details and rationale (§3, §5),
  full swarm transcript and notes including rationale (§6), drift
  flags, and the trust score's computation trace (§0). No reaching into
  other builds or specs unless explicitly asked for a comparison —
  keeps answers grounded, avoids cross-contamination.
- **A root-cause summary generates automatically, not only on
  request**, whenever a build reaches the gate needing attention
  (`blocked`, below threshold, an unresolved swarm flag, or `partial`
  verification). The person shouldn't have to know what to ask first;
  the chat is for drilling past that default summary, not the only way
  in.
- **Every claim must cite the specific log entry it came from**
  (attempt number, AC/EC id, swarm note id). A fluent-sounding
  explanation that quietly invents a detail would be worse than none,
  at the exact moment a human is trusted to make a fast, informed call
  with no other context to check it against.

---

## 8. Drift detection

**Dependencies on prior sections — this mechanism doesn't stand alone:**
- **§3 (Build)** — reuses the governed file paths each spec already
  declares for edit-scope enforcement, rather than inventing a second
  spec-to-code mapping to maintain in parallel.
- **§4 (Compiler)** — runs at build-test time, the same moment the
  compiler already has both the current code state and the current
  spec state in hand; no separate scheduled pass.
- **§6 (Swarm)** — the `related_specs` version-mismatch check is a
  special case of silent drift below, not a separate mechanism: same
  detection logic, comparing two specs' versions against each other
  instead of a spec's version against its own governed code.
- **§0 / §7 (Trust score & release gate)** — drift is a flag that feeds
  trust-score context and surfaces at the gate as a soft-stop
  condition, same category as an unresolved swarm flag; it never hard-
  stops on its own.

**The mechanism:**
- **Two distinct drift types, not one flat flag:**
  - **Silent drift** — a governed file changed in a commit, but the
    spec's `version` didn't bump. The dangerous case: code no longer
    matches what the spec claims. Detected by diffing the spec's
    governed paths between the current build's commit and the commit
    at which `version` was last bumped.
  - **Stale drift** — the spec's `version` bumped, but no commit has
    touched its governed paths since. Lower urgency — normal mid-flight
    state while a feature is being rebuilt — surfaced as a "pending"
    marker, not an alarm.
- **Output is a flag on the build record, not a blocking check** —
  consistent with nudge-don't-gate; drift alone never hard-stops
  anything, it just makes "tested" mean less until resolved.

---

## 9. Production → spec feedback loop

**Two distinct mechanisms — one for corrections during testing, one for
real bugs that reach production.**

### Override-learning

- **Only two of §7's override reason categories are spec-quality
  signals worth learning from:** `acknowledged ambiguity` and
  `accepted contract-mismatch`. The other two
  (`shipped despite incomplete verification`, `accepted score below
  threshold`) are business decisions, not evidence the spec itself was
  wrong — they never feed this loop.
- **Learning is a nudge at the next natural editing moment, not a
  background rewrite.** Specs stay human-authored (§1). When a
  learning-eligible override occurs, the correction (what was flagged,
  what the human confirmed, why) attaches to that spec. The next time
  the spec is opened for editing or its `version` bumps, the
  completeness rubric pass (§1) surfaces it as context — "this
  criterion was previously flagged as ambiguous and you confirmed it
  meant X; consider making that explicit" — rather than silently
  rewriting anything.

### Confirmed-deviations store

- **Scoped per-project (§10), not global.** A confirmation on one
  project's spec doesn't apply to another project's similar case by
  default — different products, different context.
- **What gets written:** only from the two learning-eligible override
  categories above. Each entry stores a semantic summary of what was
  flagged, the human's confirmation and reasoning, the source
  spec/criterion, and a status starting at `standing_exception`.
- **Matching is semantic, not exact.** "A different test case, similar
  situation" means cross-spec comparison — an LLM checks new
  `ambiguous`/`contract-mismatch` swarm findings against the store
  before presenting them as fresh flags. Same semantic-reasoning lane
  as ambiguity detection itself (§6), not a new kind of judgment.
- **On a match: surface it with past context, offer to promote, never
  auto-resolve on first recurrence.** "This looks similar to something
  confirmed on `join-live-match` on [date]: [summary]. Confirm again,
  or make this a standing rule?" Only an explicit promotion changes
  future behavior — repetition is what makes promoting worth it, so
  the human decides once the pattern has actually recurred, not on
  first occurrence.
- **A promoted `permanent_rule` still logs every time it fires** —
  "auto-resolved via standing rule [X]" appears in that build's record,
  never silent. Consistent with the rest of this system: a rule
  suppressing a real regression without a trace would be a bad failure
  mode; one that's visibly firing and wrong is one a human can catch
  and revoke.
- **Staleness is a known risk, deliberately deferred.** A permanent
  rule can outlive the spec state it was matched against. Worth a
  future revisit trigger (e.g. re-surface a rule if drift touches the
  spec/criterion it references) — not decided now, flagged for later.

### Real production bugs

- **A production bug becomes a new spec, or a new Acceptance Criterion
  / Edge Case on an existing spec — never a direct code patch.**
  Consistent with intent-first: the bug is evidence the spec didn't
  capture the correct behavior, so the fix is authored the same way any
  other requirement is (§1's ideation flow), then flows through the
  normal spec→build→test pipeline. This is what keeps the spec from
  silently drifting out of truth with every real-world fix that
  bypasses it.
- **Not yet decided:** the entry mechanism — whether this pulls
  automatically from an external ticket/error-tracking tool (a new
  dependency this design hasn't touched) or is manually initiated by a
  human turning a bug report into a spec themselves. The destination
  (a spec) is decided; how a production bug arrives at that point is
  still open.

---

## 10. Portal & UI

**Interaction model, deliberately modeled on Devin's session-based
pattern rather than a traditional dashboard-and-forms app:**

- **Chat-first entry, not forms.** The root-cause chat (§7) is the
  default way into a flagged build, not a fallback reached after
  clicking through fields — mirrors Devin's chat-first new-task screen.
- **One unified timeline per build, not scattered tabs.** The build
  record page merges retry attempts (§5), compiler runs (§4), swarm
  activity and notes (§6), and drift flags (§8) into a single
  chronological feed — same pattern as Devin's Progress tab unifying
  shell/code/browser activity, so nothing requires hunting across
  separate screens to reconstruct what happened.
- **Session list = release dashboard.** Every spec/build shown with a
  status badge (`blocked | partial | complete | shipped`), filterable
  and sortable — the default landing view.
- **Gate actions live inline on the build record page**, not as a
  separate approval queue — approve, override with reason (§7), or
  trigger more verification, all in the context where the evidence
  already is.
- **Editor-style view for the spec itself** — dedicated surface for
  the DSL content, editable, with the live completeness score and
  trust ceiling (§0, §1) shown inline as it's edited, not only at save
  time.
- **Command palette (Cmd+K/Ctrl+K)** for navigation across specs,
  builds, and the dashboard — fits the "quality owner reviewing many
  things quickly" persona (§0) directly.

**Project and specs structure:**

- **Project is the top-level container.** CarromLive, SpendCraft,
  DeepDesk, and the new app each get their own project — everything
  else (specs, config, builds) lives inside one.
- **Each project owns its own config** — `retry_cap`,
  `release_threshold`, `max_swarm_agents`/`max_swarm_duration`,
  `swarm_sizing` defaults (§5, §6, §7). Different products warrant
  different defaults; nothing leaks across projects implicitly.
- **Specs are grouped by `related_specs` clusters within a project**,
  not listed flat/alphabetically — a feature's UI + API + data specs
  sit together as one visual group, since §6 already treats
  `related_specs` as the thing linking them.
- **The confirmed-deviations store (§9) is scoped per-project by
  default, not global.** A UI/style confirmation on CarromLive
  shouldn't silently apply to SpendCraft — different products,
  different design-intent references. Cross-project matching would
  need to be a deliberate, explicit action later, not a default.
- **The design-intent reference (§1, §2) is per-project too**, for the
  same reason — each product has its own style baseline; there's no
  shared "house style" across unrelated apps.
- **Project switcher kept in the nav.** Considered simplifying to a
  single cross-project view with a filter (reasonable for one reviewer
  across a small number of projects), but decided to keep an explicit
  switcher — worth revisiting if a filtered all-projects view later
  proves better in practice, but the switcher is the current decision.
  Command palette search defaults to the current project, with an
  explicit modifier to search across all.

---

## 11. Auth & roles

- **Authentication delegated to an established external provider** —
  identity, login, sessions, SSO are a solved problem elsewhere; not
  worth building custom. The provider's only job is answering "who is
  this person."
- **Roles are defined and enforced inside the system itself, not
  delegated to the provider's own group/role features.** The
  permissions here are domain-specific (gate overrides, spec editing,
  standing-rule promotion) — genuinely this product's concern, not a
  generic identity concept an auth provider would model well.
- **Two roles, matching the minimal split sketched (and deferred) in
  §7:**
  - **Quality owner** — approves specs, performs gate overrides, edits
    criticality, promotes a confirmed deviation to a `permanent_rule`
    (§9), edits project config (`retry_cap`, `release_threshold`,
    `max_swarm_*`, §5/§6/§7).
  - **Contributor** — triggers builds, cannot approve specs or
    override a gate.

  Deliberately minimal, not full RBAC — the smallest distinction that
  makes the override path (§7) and spec-approval path (§1) actually
  mean something. Room to grow later without redesigning the concept.
- **Roles are scoped per-project (§10), not global.** A person can be
  quality owner on one project and contributor on another — consistent
  with projects being the top-level container everything else lives
  inside.

---

## 12. Git & coding-agent connectors

**Two connectors, distinct jobs — not to be conflated.**

### Git connector

- **Read/diff access only** — powers §8's drift detection (diffing a
  spec's governed paths between commits) and §6's `related_specs`
  version-mismatch check. Also the trigger surface for Build (§3): a
  commit touching governed paths, or a spec `version` bump merging,
  kicks off a build — the connector is an event source, not something
  the build agent calls mid-task.
- **No write access from the pipeline side**, consistent with the
  read-only posture already established for the spec (§3) and the test
  harness (§4). The pipeline observes git; it doesn't commit to it —
  code changes still land through the build agent's own normal
  commits.

### Coding-agent connector

- **Same MCP server as the ideation connector (§1), not a separate
  one** — a single server with role-gated tool exposure: the
  ideation-facing surface (Claude.ai/ChatGPT) exposes spec-generation
  tools, the coding-agent-facing surface (inside Cursor/Claude Code)
  exposes a different, more restricted tool set. Simpler to maintain
  than two servers, and consistent with there being one canonical
  system behind both surfaces.
- **What it turns from prompted instruction into structural
  enforcement** — §3 currently relies on a rule file (`CLAUDE.md` /
  `.cursor/rules`) *instructing* the build agent to behave correctly.
  Real tool calls make the constraints actual rather than hoped-for,
  same principle as §4's structurally-enforced read-only test harness:
  - `get_spec(id)` — read-only fetch; no write method exists, so §3's
    read-only rule is enforced by the tool's shape, not just the prompt.
  - `report_build_note(ac_id, rationale)` — logs ambiguity-handling
    notes (§3) through an actual call, not a file the agent could also
    freely edit.
  - `report_retry_attempt(status, failure_detail)` — feeds §5's failure
    history directly.
  - `check_edit_scope(path)` — lets the agent verify a file is within
    governed paths *before* editing, rather than relying on
    after-the-fact detection.

---

## Outer execution ceiling

- **One ceiling spans the whole per-feature pipeline** (build retries +
  any swarm investigation cycles combined), separate from the per-node
  caps in §5 and §6. Per-node caps guard their own stage; nothing
  otherwise stops the combination from compounding past what's
  reasonable for one feature, with no human noticing until it's
  expensive. Cost or wall-clock based — mechanism not yet decided.
- **A blocked feature must never block other features in flight.**
  Explicit rather than assumed, since with no human available to
  manually unstick a queue, an implicit shared blocker would stall
  unrelated work.

---

## Open / not yet decided

- Production bug entry mechanism: automatic pull from an external
  ticket/error-tracking tool vs. manual human-initiated spec creation
  (§9 — the destination is decided, the entry path is not)
- Outer execution ceiling: cost vs. wall-clock, exact threshold
- `spec-authoring-guide.md` update nudging `ui`-layer authors to name
  layout-specific expectations explicitly (referenced in §4, not yet
  written into that file)
