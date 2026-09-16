# Corin — Design Language

The visual identity is a **verification document**, not a generic SaaS
surface. Every design decision below ties back to what Corin actually
does: specs are documents, tests produce a signed-off record, builds
carry an audit trail. Nothing decorative — the aesthetic *is* the
product's mental model.

Deliberately avoided: warm cream + serif + terracotta (the current
AI-landing-page default), near-black + neon accent (the other current
default), rounded SaaS cards with soft shadows, ALL-CAPS eyebrows,
gradient washes, arrow-suffixed buttons.

---

## Color

Cool paper tones, not warm cream. One ink color carries almost all text
and UI weight; three status colors are used *only* for actual
verification states, never as decoration.

| Token | Hex | Approx. HSL | Role |
|---|---|---|---|
| `background` | `#F2F3F1` | `100 8% 95%` | Page background |
| `card` / `paper` | `#FBFBFA` | `60 10% 98%` | Raised surfaces — document panels, inputs |
| `foreground` / `ink` | `#14181F` | `215 22% 10%` | Primary text, primary buttons |
| `muted-foreground` | `#4A5158` | `205 9% 32%` | Secondary text, captions |
| `border` | `#D3D8DC` | `200 10% 85%` | Hairline rules — the primary structural device |
| `success` (verified) | `#1F6B52` | `156 55% 27%` | Passed / verified / shipped |
| `warning` (flagged) | `#9A6B2E` | `32 54% 39%` | Ambiguous / partial / needs review |
| `destructive` (blocked) | `#A33B2E` | `9 56% 41%` | Blocked / failed |

**Rule:** status colors appear only on an actual status (a build state,
a swarm verdict, a gate decision) — never as a page accent, a hover
color, or a decorative wash. If a color shows up somewhere that isn't
reporting a real status, it should be ink, muted-foreground, or border.

The HSL values above are close approximations for the CSS-variable
format shadcn expects — fine-tune with a proper converter if exact hue
matching matters later; the hex values are the source of truth.

---

## Type

Two families, clearly distinct roles — not decoration, a structural
signal that something is a *document heading* vs. *reading text*.

- **Display / headings — `IBM Plex Mono`.** Monospace as a headline
  face is the one deliberately bold choice here, and it's grounded in
  the subject: specs are literally text files, builds produce logs,
  everything Corin touches is monospaced somewhere in its life. Set
  large, tight line-height, no letter-spacing tricks.
- **Body — `IBM Plex Sans`.** Plain, legible, no personality of its
  own — it should disappear into the reading experience.
- Line length under 80 characters for body copy. No serif anywhere —
  this isn't an editorial/publishing aesthetic, it's a technical
  document aesthetic.

---

## Layout

- **Hairline rules over cards.** Sections are separated by 1px borders,
  not boxes with shadows. This is a document being read top to bottom,
  not a dashboard of unrelated widgets.
- **Sharp corners, not rounded.** 3px radius maximum, applied only
  where a click target needs a soft edge (buttons, inputs). Panels and
  document surfaces stay square — rounding everything is the generic
  SaaS-card tell this language deliberately avoids.
- **Left-aligned, document-style,** not center-stacked marketing blocks.
  Numbered sequences (the how-it-works flow) use a monospace line
  number, styled like a code diff's line gutter — justified because
  that content is genuinely sequential, not decoration.
- **One visual "moment" per page**, not motion scattered across every
  element. The verification-snippet in the landing hero is the one bold
  thing; everything around it stays quiet.

---

## shadcn/ui integration

The tokens above map directly onto shadcn's CSS-variable convention —
see `globals.css` and `tailwind.config.ts`. Using shadcn's primitives
(`Button`, `Input`, `Card`, `Badge`, `Separator`) on top of these
variables means **web and app share one theme automatically** — no
re-implementing the same look twice.

**Component mapping for the app portal (§10), once you build it:**
- Build status badges (`blocked | partial | complete | shipped`) → a
  shadcn `Badge` variant per status, colored from `warning` /
  `destructive` / `success` / `muted-foreground` respectively. This is
  the same three-status-color rule as the marketing site, just applied
  to real build data instead of a mock snippet.
- The build timeline (§10's unified feed) → the same hairline-divided
  list pattern as the landing page's how-it-works flow, not a card
  grid.
- The spec editor surface → the `card`/paper token, same as the hero's
  verification-snippet panel — visually, editing a spec and reading a
  verified one should feel like the same kind of object.
- Gate actions (approve / override) → primary button uses `ink`
  (same as the landing page's CTA), never a status color — a status
  color reports what happened, it doesn't trigger an action.

---

## What not to do

- Don't add a bright accent color "for interest" — the restraint is the
  point; the only saturated color anyone sees is a real status.
- Don't round the document/card surfaces to match the buttons.
- Don't reach for a second serif or display face for "personality" —
  the monospace headline already carries that.
- Don't add icons to the status badges unless they encode information
  a color alone can't (e.g. a distinct shape for colorblind
  accessibility) — decorative icons dilute the document feel.
