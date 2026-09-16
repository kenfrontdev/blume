# Build notes — compiler first slice

Logged while implementing the §4 compiler against the decision log
(not against a feature AC — there is no `specs/features/compiler.md`
yet; the README explicitly directs this as the first build target).

## Interpretation: heuristic UI target resolution

§4 requires LLM-assisted resolution against the live accessibility tree,
using a different model provider than the build agent. No UI surface or
compiler-side LLM provider is wired in this scaffold yet. Interpretation:
ship a deterministic heuristic resolver (`compiler/resolve-targets.ts`)
behind the same `ResolvedTarget` interface so the MD → canonical → IR →
emitter path is exercisable end-to-end, and leave the LLM step as the
next compiler increment. Api-layer specs skip resolution entirely and
are the fully deterministic proof path.

## Interpretation: canonical JSON written alongside IR

The decision log says the compiler's input is canonical JSON and its
output is `specs/compiled/{id}.json` (intermediate) plus `tests/`.
Interpretation: also write `{id}.canonical.json` next to the IR so the
parse step is inspectable and drift tooling has a stable artifact
without inventing a separate store. Authoring Markdown remains the
source of truth; this file is derived, never written back into.
