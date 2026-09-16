import { randomBytes } from "node:crypto";
import type {
  AcceptanceCriterion,
  CanonicalSpec,
  EdgeCase,
  IntermediateAction,
  IntermediateForm,
  IntermediateScenario,
  InterfaceContractTrailing,
} from "./types";
import type { A11yNode, TargetResolver } from "./resolve-targets-llm";
import { createTargetResolver } from "./resolve-targets-llm";

const makeSeed = (): string => randomBytes(8).toString("hex");

const concreteFromSeed = (
  seed: string,
  layer: CanonicalSpec["layer"]
): Record<string, string | number> => {
  const n = Number.parseInt(seed.slice(0, 8), 16);
  return {
    matchId: `match-${(n % 9000) + 1000}`,
    userId: `user-${(n % 90000) + 10000}`,
    viewerCount: (n % 40) + 1,
    // api layer gets a second user for capacity edge cases
    otherUserId:
      layer === "api" ? `user-${((n >> 4) % 90000) + 10000}` : `user-alt-${n % 1000}`,
  };
};

const extractTimeoutMs = (phrases: string[]): number | undefined => {
  for (const p of phrases) {
    const m = p.match(/within\s+(\d+)\s*seconds?/i);
    if (m) return Number(m[1]) * 1000;
  }
  return undefined;
};

const isSystemEvent = (when: string): boolean =>
  /\b(ends?|completes?|times?\s*out|receives?|arrives?|expires?)\b/i.test(
    when
  ) && !/\b(tap|click|press|user)\b/i.test(when);

const uiWhenToSteps = async (
  when: string,
  resolve: TargetResolver,
  a11yTree?: A11yNode | null
): Promise<IntermediateAction[]> => {
  if (isSystemEvent(when)) {
    return [
      {
        action: "wait",
        timeoutMs: 2000,
        reason: when,
      },
    ];
  }
  const resolved = await resolve(when, { a11yTree });
  return [{ action: "tap", target: when, resolved }];
};

const uiThenToSteps = async (
  thens: string[],
  resolve: TargetResolver,
  a11yTree?: A11yNode | null
): Promise<IntermediateAction[]> => {
  const timeoutMs = extractTimeoutMs(thens);
  const steps: IntermediateAction[] = [];
  for (const t of thens) {
    if (/no partial|does not (leave|retain)|left behind/i.test(t)) {
      steps.push({
        action: "assert",
        assert: "noPartialState",
        target: t,
      });
      continue;
    }
    const resolved = await resolve(t, { a11yTree });
    const isTimeout = /within\s+\d+\s*seconds?/i.test(t);
    steps.push({
      action: "assert",
      assert: "elementVisible",
      target: t,
      timeoutMs: isTimeout ? timeoutMs : undefined,
      resolved,
    });
  }
  return steps;
};

const uiScenarioSteps = async (
  criterion: Pick<AcceptanceCriterion | EdgeCase, "given" | "when" | "then">,
  preconditions: string[],
  resolve: TargetResolver,
  a11yTree?: A11yNode | null
): Promise<IntermediateAction[]> => {
  const steps: IntermediateAction[] = [
    {
      action: "setup",
      description: [criterion.given, ...preconditions].filter(Boolean).join("; "),
    },
    ...(await uiWhenToSteps(criterion.when, resolve, a11yTree)),
    ...(await uiThenToSteps(criterion.then, resolve, a11yTree)),
  ];

  for (const step of [...steps]) {
    if (
      (step.action === "tap" || step.action === "click") &&
      step.resolved &&
      step.resolved.inViewportCheck &&
      step.resolved.strategy !== "unresolved"
    ) {
      steps.push({
        action: "assert",
        assert: "elementInViewport",
        target: step.target,
        resolved: step.resolved,
      });
    }
  }
  return steps;
};

const apiScenarioSteps = (
  criterion: Pick<AcceptanceCriterion | EdgeCase, "given" | "when" | "then">,
  contract: InterfaceContractTrailing,
  concrete: Record<string, string | number>
): IntermediateAction[] => {
  const path = contract.path.replace(
    /\{id\}|\{matchId\}/gi,
    String(concrete.matchId)
  );
  const body = Object.fromEntries(
    Object.entries(contract.request).map(([k, v]) => {
      if (typeof v === "string" && v.startsWith("<") && v.endsWith(">")) {
        const key = v.slice(1, -1);
        return [k, concrete[key] ?? concrete.userId];
      }
      if (k.toLowerCase() === "userid") return [k, concrete.userId];
      return [k, v];
    })
  );

  const steps: IntermediateAction[] = [
    {
      action: "setup",
      description: criterion.given,
      fixture: { matchId: concrete.matchId, userId: concrete.userId },
    },
    {
      action: "http",
      method: contract.method,
      path,
      body,
    },
  ];

  for (const t of criterion.then) {
    const statusMatch = t.match(/\b(200|201|204|400|401|403|404|409|500)\b/);
    if (statusMatch || /response is\s+(\d+)/i.test(t)) {
      const status =
        statusMatch?.[1] ??
        t.match(/response is\s+(\d+)/i)?.[1] ??
        "200";
      steps.push({
        action: "assert",
        assert: "httpStatus",
        target: t,
        expected: Number(status),
      });
      continue;
    }
    if (/does not increment|no partial/i.test(t)) {
      steps.push({
        action: "assert",
        assert: "noPartialState",
        target: t,
      });
      continue;
    }
    steps.push({
      action: "assert",
      assert: "httpBody",
      target: t,
      expected: t,
    });
  }

  return steps;
};

const buildScenarioFromAc = async (
  spec: CanonicalSpec,
  ac: AcceptanceCriterion,
  concrete: Record<string, string | number>,
  resolve: TargetResolver,
  a11yTree?: A11yNode | null
): Promise<IntermediateScenario> => {
  const steps =
    spec.layer === "api" && spec.trailing.type === "interface_contract"
      ? apiScenarioSteps(ac, spec.trailing, concrete)
      : await uiScenarioSteps(ac, spec.preconditions, resolve, a11yTree);

  return {
    id: ac.id,
    kind: "acceptance",
    title: ac.title,
    criticality: ac.criticality,
    steps,
  };
};

const buildScenarioFromEc = async (
  spec: CanonicalSpec,
  ec: EdgeCase,
  concrete: Record<string, string | number>,
  resolve: TargetResolver,
  a11yTree?: A11yNode | null
): Promise<IntermediateScenario> => {
  const steps =
    spec.layer === "api" && spec.trailing.type === "interface_contract"
      ? apiScenarioSteps(ec, spec.trailing, concrete)
      : await uiScenarioSteps(ec, spec.preconditions, resolve, a11yTree);

  return {
    id: ec.id,
    kind: "edge",
    title: ec.title,
    ref: ec.ref,
    steps,
  };
};

/**
 * One composed end-to-end journey chaining active ACs in order (§4).
 */
const buildComposedScenario = (
  scenarios: IntermediateScenario[]
): IntermediateScenario | null => {
  const acs = scenarios.filter((s) => s.kind === "acceptance");
  if (acs.length < 2) return null;
  return {
    id: "COMPOSED",
    kind: "composed",
    title: "End-to-end composed journey",
    steps: acs.flatMap((s, i) =>
      i === 0
        ? s.steps
        : s.steps.filter((step) => step.action !== "setup")
    ),
  };
};

export type ToIntermediateOptions = {
  seed?: string;
  /** heuristic (default for selfcheck) | llm (§4 provider-diverse step) */
  resolver?: "heuristic" | "llm" | TargetResolver;
  a11yTree?: A11yNode | null;
};

export const toIntermediate = async (
  spec: CanonicalSpec,
  options?: ToIntermediateOptions
): Promise<IntermediateForm> => {
  const seed = options?.seed ?? makeSeed();
  const concreteValues = concreteFromSeed(seed, spec.layer);
  const notes: string[] = [];

  const resolve: TargetResolver =
    typeof options?.resolver === "function"
      ? options.resolver
      : createTargetResolver(options?.resolver ?? "heuristic");

  if (
    (spec.layer === "ui" || spec.layer === "mobile") &&
    options?.resolver !== "llm" &&
    typeof options?.resolver !== "function"
  ) {
    notes.push(
      "UI targets resolved heuristically. Pass resolver:'llm' (CORIN_COMPILER_LLM_*) for §4 accessibility-tree resolution."
    );
  }

  const active = spec.acceptance_criteria.filter((ac) => ac.status === "active");
  const scenarios: IntermediateScenario[] = [];
  for (const ac of active) {
    scenarios.push(
      await buildScenarioFromAc(
        spec,
        ac,
        concreteValues,
        resolve,
        options?.a11yTree
      )
    );
  }
  for (const ec of spec.edge_cases) {
    scenarios.push(
      await buildScenarioFromEc(
        spec,
        ec,
        concreteValues,
        resolve,
        options?.a11yTree
      )
    );
  }

  const composed = buildComposedScenario(scenarios);
  if (composed) scenarios.push(composed);

  for (const scenario of scenarios) {
    for (const step of scenario.steps) {
      if ("resolved" in step && step.resolved?.strategy === "unresolved") {
        notes.push(
          `${scenario.id}: unresolved target "${step.target}" — needs LLM resolution or a clearer phrase in the spec.`
        );
      }
    }
  }

  return {
    specId: spec.id,
    specVersion: spec.version,
    layer: spec.layer,
    surfaces: spec.surfaces,
    compiledAt: new Date().toISOString(),
    seed,
    concreteValues,
    scenarios,
    notes,
  };
};
