# Corin

Spec-driven, test-first development management platform.

## What's here

```
corin/
├── CLAUDE.md                 ← build-agent rules (§3, §12)
├── auth.ts                   ← Auth.js + per-project roles (§11)
├── mcp/server.ts             ← ideation + coding-agent MCP (§1 / §12)
├── compiler/                 ← §4 spec → IR → Playwright/Maestro (+ LLM a11y)
├── lib/
│   ├── trust/                ← §0 score + §7 gate
│   ├── swarm/                ← §6 orchestration
│   ├── drift/                ← §8 drift detection
│   ├── ingest/               ← Neon upsert + build records
│   └── portal/               ← dashboard queries / chat grounding
├── app/                      ← §10 portal (dashboard, timeline, chat, specs)
├── db/schema.ts
└── specs/                    ← decision log + feature specs
```

## Setup

1. Create a Neon project; copy pooled + unpooled URLs into `.env`
2. `npm install`
3. `npm run db:migrate`
4. `npm run ingest --`
5. `npm run dev` → http://localhost:3000 (redirects to `/p/carromlive`)
6. Sign in at `/login` (demo credentials provider; optional GitHub OAuth)

## Core loop commands

```bash
npm run selfcheck                          # compiler + trust + swarm
npm run compile -- match-join-endpoint
npm run compile -- join-live-match --llm --a11y tree.json
npm run score:playwright -- match-join-endpoint --assume pass --record
CORIN_MCP_ROLE=coding npm run mcp          # or ideation
```

## Pipeline coverage

| Stage | Status |
| --- | --- |
| §4 Compiler (MD → IR → Playwright/Maestro) | Done |
| §4 LLM / a11y target resolution | Done (`--llm`, `CORIN_COMPILER_LLM_*`, a11y tree fallback) |
| §0 Trust score + §7 release gate | Done |
| Playwright JSON → trust score | Done (`score:playwright`) |
| §6 Swarm orchestration + notes | Done |
| §8 Drift (related_specs version mismatch) | Done |
| §1/§12 MCP (role-gated tools) | Done |
| §10 Portal UI | Done |
| §11 Auth + project roles | Done |

## Portal

| Route | Purpose |
| --- | --- |
| `/p/[projectId]` | Release dashboard |
| `/p/[projectId]/builds/[buildId]` | Timeline + root-cause chat + gate actions |
| `/p/[projectId]/specs/[specId]` | Spec view + live confidence ceiling |
| Cmd+K | Command palette |

**Auth (Clerk):** Sign in / Sign up / UserButton live in the portal nav.
Identity comes from Clerk; Corin roles stay in `project_roles` (§11).
Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local`.

After ingesting specs (`npm run ingest`), open the app (`npm run dev`) and
go to `/` — it redirects to `/p/carromlive`.

## Env

See `.env.example` for `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`,
`CORIN_COMPILER_LLM_*`, and optional GitHub OAuth keys.

`.env` is gitignored — never commit credentials.
