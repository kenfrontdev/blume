import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type {
  AcceptanceCriterion,
  CanonicalSpec,
  Criticality,
  EdgeCase,
  InterfaceContractTrailing,
  SpecLayer,
  SpecStatus,
  TrailingSection,
  UiStatesTrailing,
} from "./types";

const CRITICALITIES = new Set<Criticality>(["critical", "major", "minor"]);
const LAYERS = new Set<SpecLayer>(["ui", "mobile", "api", "data"]);
const STATUSES = new Set<SpecStatus>([
  "draft",
  "approved",
  "building",
  "shipped",
]);

const splitFrontmatter = (
  raw: string
): { frontmatter: string; body: string } => {
  const trimmed = raw.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) {
    throw new Error("Spec must start with YAML frontmatter (---)");
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error("Spec frontmatter is not closed with ---");
  }
  return {
    frontmatter: trimmed.slice(4, end).trim(),
    body: trimmed.slice(end + 4).trim(),
  };
};

const sectionBodies = (body: string): Map<string, string> => {
  const map = new Map<string, string>();
  const parts = body.split(/^## /m).filter(Boolean);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    const content = nl === -1 ? "" : part.slice(nl + 1).trim();
    map.set(title, content);
  }
  return map;
};

const bulletLines = (block: string): string[] =>
  block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());

const parseGwtBlock = (
  block: string
): { given: string; when: string; then: string[] } => {
  let given = "";
  let when = "";
  const then: string[] = [];

  for (const line of bulletLines(block)) {
    const givenMatch = line.match(/^Given\s+(.+)$/i);
    if (givenMatch) {
      given = givenMatch[1].trim();
      continue;
    }
    const whenMatch = line.match(/^When\s+(.+)$/i);
    if (whenMatch) {
      when = whenMatch[1].trim();
      continue;
    }
    const thenMatch = line.match(/^(?:Then|And)\s+(.+)$/i);
    if (thenMatch) {
      then.push(thenMatch[1].trim());
    }
  }

  return { given, when, then };
};

const parseAcceptanceCriteria = (section: string): AcceptanceCriterion[] => {
  if (!section.trim()) return [];
  const chunks = section.split(/^### /m).filter(Boolean);
  return chunks.map((chunk) => {
    const nl = chunk.indexOf("\n");
    const heading = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    const removed = heading.match(/\[removed in v(\d+)\]/i);
    const headingMatch = heading.match(
      /^(AC-\d+)\s+[—–-]\s+(.+?)\s+\[(critical|major|minor)\]/i
    );
    if (!headingMatch) {
      throw new Error(`Invalid Acceptance Criterion heading: "${heading}"`);
    }
    const gwt = parseGwtBlock(body);
    return {
      id: headingMatch[1],
      title: headingMatch[2].trim(),
      criticality: headingMatch[3].toLowerCase() as Criticality,
      status: removed ? "removed" : "active",
      removedInVersion: removed ? Number(removed[1]) : undefined,
      given: gwt.given,
      when: gwt.when,
      then: gwt.then,
    };
  });
};

const parseEdgeCases = (section: string): EdgeCase[] => {
  if (!section?.trim()) return [];
  const chunks = section.split(/^### /m).filter(Boolean);
  return chunks.map((chunk) => {
    const nl = chunk.indexOf("\n");
    const heading = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    const headingMatch = heading.match(
      /^(EC-\d+)\s+\(ref:\s*(AC-\d+)\)\s+[—–-]\s+(.+)$/i
    );
    if (!headingMatch) {
      throw new Error(`Invalid Edge Case heading: "${heading}"`);
    }
    const gwt = parseGwtBlock(body);
    return {
      id: headingMatch[1],
      ref: headingMatch[2],
      title: headingMatch[3].trim(),
      given: gwt.given,
      when: gwt.when,
      then: gwt.then,
    };
  });
};

const parseUiStates = (section: string): UiStatesTrailing => {
  const surfaces: UiStatesTrailing["surfaces"] = {};
  const chunks = section.split(/^### /m).filter(Boolean);
  for (const chunk of chunks) {
    const nl = chunk.indexOf("\n");
    const surface = (nl === -1 ? chunk : chunk.slice(0, nl)).trim().toLowerCase();
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    const states: Record<string, string> = {};
    for (const line of bulletLines(body)) {
      const m = line.match(/^(loading|empty|error|success)\s*:\s*(.+)$/i);
      if (m) states[m[1].toLowerCase()] = m[2].trim();
    }
    surfaces[surface] = states;
  }
  return { type: "ui_states", surfaces };
};

const parseInterfaceContract = (section: string): InterfaceContractTrailing => {
  const lines = bulletLines(section);
  let method = "GET";
  let path = "/";
  let request: Record<string, unknown> = {};
  const responses: InterfaceContractTrailing["responses"] = [];

  for (const line of lines) {
    const endpoint = line.match(
      /^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/i
    );
    if (endpoint) {
      method = endpoint[1].toUpperCase();
      path = endpoint[2];
      continue;
    }
    const req = line.match(/^Request:\s*(.+)$/i);
    if (req) {
      try {
        request = JSON.parse(req[1].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"'));
      } catch {
        // Keep raw object-ish text as a string field when not valid JSON
        request = { _raw: req[1].trim() };
        const brace = req[1].match(/\{([^}]+)\}/);
        if (brace) {
          const fields = brace[1].split(",").map((s) => s.trim()).filter(Boolean);
          request = Object.fromEntries(fields.map((f) => [f, `<${f}>`]));
        }
      }
      continue;
    }
    const res = line.match(/^Response\s+(\d+)\s*:\s*(.+)$/i);
    if (res) {
      const status = Number(res[1]);
      const rest = res[2].trim();
      try {
        const body = JSON.parse(
          rest.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')
        );
        responses.push({ status, body });
      } catch {
        responses.push({ status, description: rest, body: rest });
      }
    }
  }

  return { type: "interface_contract", method, path, request, responses };
};

const parseTrailing = (
  layer: SpecLayer,
  sections: Map<string, string>
): TrailingSection => {
  if (layer === "ui" || layer === "mobile") {
    const ui = sections.get("UI States");
    if (!ui) throw new Error(`layer=${layer} requires a ## UI States section`);
    return parseUiStates(ui);
  }
  if (layer === "api") {
    const contract = sections.get("Interface Contract");
    if (!contract) {
      throw new Error("layer=api requires a ## Interface Contract section");
    }
    return parseInterfaceContract(contract);
  }
  return { type: "none" };
};

const asStringArray = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

export const parseSpecMarkdown = (raw: string): CanonicalSpec => {
  const { frontmatter, body } = splitFrontmatter(raw);
  const meta = parseYaml(frontmatter) as Record<string, unknown>;
  const sections = sectionBodies(body);

  const layer = String(meta.layer ?? "") as SpecLayer;
  if (!LAYERS.has(layer)) {
    throw new Error(`Invalid or missing layer: ${meta.layer}`);
  }

  const status = String(meta.status ?? "draft") as SpecStatus;
  if (!STATUSES.has(status)) {
    throw new Error(`Invalid status: ${meta.status}`);
  }

  const summary = sections.get("Summary");
  if (!summary) throw new Error("Missing ## Summary section");

  const acceptance = parseAcceptanceCriteria(
    sections.get("Acceptance Criteria") ?? ""
  );
  for (const ac of acceptance) {
    if (!CRITICALITIES.has(ac.criticality)) {
      throw new Error(`Invalid criticality on ${ac.id}`);
    }
  }

  const lastUpdated =
    meta.last_updated instanceof Date
      ? meta.last_updated.toISOString().slice(0, 10)
      : String(meta.last_updated ?? new Date().toISOString().slice(0, 10));

  return {
    id: String(meta.id),
    title: String(meta.title),
    surfaces: asStringArray(meta.surfaces),
    layer,
    version: Number(meta.version ?? 1),
    status,
    source:
      meta.source == null || String(meta.source).startsWith("<")
        ? null
        : String(meta.source),
    last_updated: lastUpdated,
    related_specs: asStringArray(meta.related_specs),
    retry_cap: meta.retry_cap == null ? null : Number(meta.retry_cap),
    release_threshold:
      meta.release_threshold == null ? null : Number(meta.release_threshold),
    summary: summary.replace(/\n+/g, " ").trim(),
    preconditions: bulletLines(sections.get("Preconditions") ?? ""),
    acceptance_criteria: acceptance,
    edge_cases: parseEdgeCases(sections.get("Edge Cases") ?? ""),
    trailing: parseTrailing(layer, sections),
    out_of_scope: bulletLines(sections.get("Out of Scope") ?? ""),
  };
};

export const parseSpecFile = (path: string): CanonicalSpec => {
  const raw = readFileSync(path, "utf8");
  return parseSpecMarkdown(raw);
};
