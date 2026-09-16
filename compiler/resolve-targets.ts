import type { ResolvedTarget } from "./types";

/**
 * Heuristic UI target resolver for the first deterministic compile path.
 *
 * §4 requires LLM-assisted resolution against the live accessibility tree
 * at build-test time. That step needs a different model provider than the
 * build agent and a running UI surface. Until that wiring exists, we
 * resolve quoted labels and common nouns deterministically so the
 * intermediate form + emitters can be exercised end-to-end.
 *
 * Swap this for an LLM resolver behind the same interface later —
 * emitters only consume ResolvedTarget.
 */
export const resolveUiTarget = (phrase: string): ResolvedTarget => {
  const quoted =
    phrase.match(/"([^"]+)"/) ??
    phrase.match(/'([^']+)'/) ??
    phrase.match(/“([^”]+)”/);

  if (quoted) {
    const label = quoted[1];
    const looksLikeButton =
      /\b(tap|click|press|button|join|submit|retry|refresh)\b/i.test(phrase) ||
      /^(join|retry|refresh|submit)$/i.test(label);
    return {
      strategy: looksLikeButton ? "role" : "text",
      value: looksLikeButton ? "button" : label,
      name: looksLikeButton ? label : undefined,
      source: "heuristic",
      inViewportCheck: true,
    };
  }

  const noun =
    phrase.match(
      /\b(board|viewer count|results?(?: screen)?|match complete|retry(?: option)?|refresh|skeleton|similar live matches|match is full)\b/i
    )?.[1] ?? null;

  if (noun) {
    const lower = noun.toLowerCase();
    if (lower === "board" || lower === "skeleton") {
      return {
        strategy: "testid",
        value: lower === "skeleton" ? "board-skeleton" : "board",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    if (lower === "viewer count") {
      return {
        strategy: "testid",
        value: "viewer-count",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    if (lower === "retry" || lower === "retry option") {
      return {
        strategy: "role",
        value: "button",
        name: "Retry",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    if (lower === "match is full") {
      return {
        strategy: "text",
        value: "Match is full",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    if (lower === "similar live matches") {
      return {
        strategy: "testid",
        value: "similar-matches",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    if (lower.startsWith("result")) {
      return {
        strategy: "role",
        value: "link",
        name: "Results",
        source: "heuristic",
        inViewportCheck: true,
      };
    }
    return {
      strategy: "text",
      value: noun,
      source: "heuristic",
      inViewportCheck: true,
    };
  }

  return {
    strategy: "unresolved",
    value: phrase,
    source: "heuristic",
    inViewportCheck: false,
  };
};
