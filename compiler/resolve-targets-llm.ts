import type { ResolvedTarget } from "./types";
import { resolveUiTargetHeuristic } from "./resolve-targets-heuristic";

export type A11yNode = {
  role?: string;
  name?: string;
  testId?: string;
  value?: string;
  children?: A11yNode[];
};

export type TargetResolver = (
  phrase: string,
  context?: { a11yTree?: A11yNode | null }
) => Promise<ResolvedTarget>;

const flatten = (node: A11yNode, out: A11yNode[] = []): A11yNode[] => {
  out.push(node);
  for (const child of node.children ?? []) flatten(child, out);
  return out;
};

/**
 * Match a phrase against an accessibility tree without an LLM.
 * Used when BLUME_COMPILER_LLM_API_KEY is unset, and as a fallback.
 */
export const resolveAgainstA11yTree = (
  phrase: string,
  tree: A11yNode
): ResolvedTarget | null => {
  const nodes = flatten(tree);
  const quoted =
    phrase.match(/"([^"]+)"/) ??
    phrase.match(/'([^']+)'/) ??
    phrase.match(/“([^”]+)”/);
  const needle = (quoted?.[1] ?? phrase).toLowerCase();

  const byName = nodes.find(
    (n) => n.name && n.name.toLowerCase().includes(needle.slice(0, 40))
  );
  if (byName?.role && byName.name) {
    return {
      strategy: "role",
      value: byName.role,
      name: byName.name,
      source: "llm",
      inViewportCheck: true,
    };
  }
  const byTestId = nodes.find(
    (n) => n.testId && needle.includes(n.testId.toLowerCase())
  );
  if (byTestId?.testId) {
    return {
      strategy: "testid",
      value: byTestId.testId,
      source: "llm",
      inViewportCheck: true,
    };
  }
  return null;
};

/**
 * §4 LLM-assisted resolution. Uses a *different* provider than the build
 * agent (BLUME_COMPILER_LLM_*). Falls back to a11y-tree matching, then
 * heuristics, so compile still works without a key.
 */
export const resolveUiTargetLlm = async (
  phrase: string,
  context?: { a11yTree?: A11yNode | null }
): Promise<ResolvedTarget> => {
  const apiKey = process.env.BLUME_COMPILER_LLM_API_KEY;
  const baseUrl =
    process.env.BLUME_COMPILER_LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model =
    process.env.BLUME_COMPILER_LLM_MODEL ?? "gpt-4o-mini";

  if (context?.a11yTree) {
    const fromTree = resolveAgainstA11yTree(phrase, context.a11yTree);
    // Prefer structured tree match when LLM is unavailable
    if (fromTree && !apiKey) return fromTree;
  }

  if (!apiKey) {
    return resolveUiTargetHeuristic(phrase);
  }

  const treeSummary = context?.a11yTree
    ? JSON.stringify(flatten(context.a11yTree).slice(0, 80))
    : "[]";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Resolve UI phrases to accessibility targets. Reply JSON: {"strategy":"role"|"text"|"testid"|"css"|"unresolved","value":string,"name"?:string}',
          },
          {
            role: "user",
            content: `Phrase: ${phrase}\nAccessibility nodes: ${treeSummary}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return (
        (context?.a11yTree &&
          resolveAgainstA11yTree(phrase, context.a11yTree)) ||
        resolveUiTargetHeuristic(phrase)
      );
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      strategy?: ResolvedTarget["strategy"];
      value?: string;
      name?: string;
    };
    if (!parsed.strategy || !parsed.value) {
      return resolveUiTargetHeuristic(phrase);
    }
    return {
      strategy: parsed.strategy,
      value: parsed.value,
      name: parsed.name,
      source: "llm",
      inViewportCheck: parsed.strategy !== "unresolved",
    };
  } catch {
    return (
      (context?.a11yTree &&
        resolveAgainstA11yTree(phrase, context.a11yTree)) ||
      resolveUiTargetHeuristic(phrase)
    );
  }
};

export const createTargetResolver = (mode: "heuristic" | "llm" = "llm"): TargetResolver => {
  if (mode === "heuristic") {
    return async (phrase) => resolveUiTargetHeuristic(phrase);
  }
  return resolveUiTargetLlm;
};
