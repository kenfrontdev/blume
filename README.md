# Corin

Spec-driven, test-first development management platform.

This is the starter scaffold — enough structure to open in Cursor and
start building against the design in `specs/docs/corin-decision-log.md`.

## What's here

```
corin/
├── CLAUDE.md                     ← build-agent rules (§3, §12) — read this first
├── compiler/                     ← §4 spec → IR → Playwright/Maestro
├── db/schema.ts                  ← Postgres schema (Drizzle), matches the decision log's data model
├── drizzle.config.ts
├── specs/
│   ├── docs/
│   │   ├── corin-decision-log.md     ← the full design — every decision, with reasoning
│   │   ├── spec-dsl-syntax.md        ← exact spec format (§2)
│   │   └── spec-authoring-guide.md   ← how to write a good spec
│   ├── features/
│   │   ├── join-live-match.md        ← sample ui spec
│   │   └── match-join-endpoint.md    ← sample api spec (deterministic compile path)
│   └── compiled/                 ← compiler output (intermediate + canonical JSON)
├── tests/                        ← generated Playwright / Maestro (do not hand-edit)
├── app/                          ← Next.js app router (placeholder pages for now)
└── lib/db.ts                     ← Neon/Drizzle client
```

## Setup

1. **Create a Neon project** at [neon.tech](https://neon.tech). Copy the
   pooled connection string.
2. **Copy `.env.example` to `.env`** and paste the connection string into
   `DATABASE_URL`.
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Push the schema to your Neon database:**
   ```bash
   npm run db:generate   # generates SQL migration from db/schema.ts
   npm run db:migrate     # applies it to Neon
   ```
5. **Run locally:**
   ```bash
   npm run dev
   ```
6. **Deploy:** connect the repo to [Vercel](https://vercel.com), add
   `DATABASE_URL` as an environment variable in the Vercel project
   settings, and deploy. Vercel + Neon both support branch-per-PR, which
   pairs naturally with the per-spec build isolation this design assumes.

## Working in Cursor

- **Read `CLAUDE.md` before asking Cursor to build anything.** It's the
  standing rule file that makes §3's constraints real — read-only spec
  access, no editing compiled tests, logging rationale for ambiguity,
  the retry-cap behavior. Cursor picks this up automatically as project
  context.
- **Every feature needs a spec first.** Add a new file under
  `specs/features/{id}.md` following the format in
  `specs/docs/spec-dsl-syntax.md` before asking the agent to build it.
  Use `specs/docs/spec-authoring-guide.md` for what to actually write in
  each section.
- **The decision log (`specs/docs/corin-decision-log.md`) is the design
  source of truth.** If Cursor's build behavior seems to contradict
  something, check there first — it's organized by pipeline stage (§0
  through §12) and each decision states its own reasoning.

## Compiler (§4) — first slice

The smallest end-to-end path is in place: authoring Markdown → canonical
JSON → intermediate action list → Playwright (web) / Maestro (iOS).

```bash
npm install
npm run compile -- match-join-endpoint   # fully deterministic (api layer)
npm run compile -- join-live-match       # ui layer (heuristic target resolution)
npm run compile:selfcheck                # parser + emitter smoke checks
```

Outputs (one-way; never written back into the authoring spec):

- `specs/compiled/{id}.canonical.json` — §2 canonical JSON
- `specs/compiled/{id}.json` — framework-agnostic intermediate form
- `tests/{id}.spec.ts` — Playwright emitter output
- `tests/maestro/{id}-*.yaml` — Maestro emitter (when `ios` / `mobile`)

**Still open for the compiler:** LLM-assisted accessibility-tree target
resolution at build-test time (must use a different model provider than
the build agent). Until that lands, `compiler/resolve-targets.ts` uses a
deterministic heuristic so the pipeline can be exercised.

## What's not built yet

This scaffold covers the data model, build-agent rules, the first
compiler slice, and trust-score / release-gate wiring. Still downstream:

- LLM UI-target resolution against a live a11y tree (§4)
- The MCP server for ideation + coding-agent tool exposure, §1 / §12
- The swarm orchestration layer, §6
- The actual portal UI (dashboard, build timeline, root-cause chat), §10
- Auth provider integration, §11
- Live Playwright run → trust score (today `--assume pass|fail` stands in)

## Trust score & release gate (§0 / §7)

```bash
npm run trust:selfcheck
npm run ingest --                                    # upsert specs into Neon
npm run ingest -- --score join-live-match --assume pass --record
```

Computes **execution score** (criticality-weighted) and **confidence
ceiling** (Recommended-tier gaps, floor 40), then evaluates the release
gate (auto-ship vs soft-stop vs hard-stop).
