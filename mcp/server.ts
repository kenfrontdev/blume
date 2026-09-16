#!/usr/bin/env npx tsx
/**
 * Blume MCP server (§1 ideation + §12 coding-agent), one process,
 * role-gated tool exposure via BLUME_MCP_ROLE=ideation|coding.
 *
 *   BLUME_MCP_ROLE=coding npm run mcp
 */
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseSpecMarkdown } from "../compiler/parse-spec";
import { evaluateCompleteness } from "../lib/trust/completeness";
import { db } from "../lib/db";
import { buildNotes, retryAttempts } from "../db/schema";

const role = (process.env.BLUME_MCP_ROLE ?? "coding") as "ideation" | "coding";
const root = process.cwd();

const loadSpec = (id: string) => {
  const path = join(root, "specs", "features", `${id}.md`);
  if (!existsSync(path)) throw new Error(`Spec not found: ${id}`);
  return parseSpecMarkdown(readFileSync(path, "utf8"));
};

const loadAll = () => {
  const dir = join(root, "specs", "features");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseSpecMarkdown(readFileSync(join(dir, f), "utf8")));
};

const governedPathsFor = (specId: string): string[] => [
  "app/",
  "lib/",
  "compiler/",
  `specs/features/${specId}.md`,
];

const ideationTools = [
  {
    name: "evaluate_spec_completeness",
    description:
      "Run the §1 completeness rubric on a spec id. Returns foundational/recommended/advisory gaps and confidence ceiling.",
    inputSchema: {
      type: "object",
      properties: { spec_id: { type: "string" } },
      required: ["spec_id"],
    },
  },
  {
    name: "list_specs",
    description: "List authoring specs available under specs/features.",
    inputSchema: { type: "object", properties: {} },
  },
];

const codingTools = [
  {
    name: "get_spec",
    description:
      "Read-only fetch of a canonical spec by id. No write method exists.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "report_build_note",
    description:
      "Log an ambiguity-handling build note tagged to an Acceptance Criterion (§3).",
    inputSchema: {
      type: "object",
      properties: {
        spec_id: { type: "string" },
        ac_id: { type: "string" },
        rationale: { type: "string" },
        build_id: { type: "string" },
      },
      required: ["spec_id", "ac_id", "rationale"],
    },
  },
  {
    name: "report_retry_attempt",
    description: "Record a retry attempt outcome for a build (§5).",
    inputSchema: {
      type: "object",
      properties: {
        build_id: { type: "string" },
        attempt_number: { type: "number" },
        status: { type: "string", enum: ["pass", "fail"] },
        failure_detail: { type: "object" },
        rationale: { type: "string" },
      },
      required: ["build_id", "attempt_number", "status"],
    },
  },
  {
    name: "check_edit_scope",
    description:
      "Verify a file path is within the spec's governed paths before editing (§3/§12).",
    inputSchema: {
      type: "object",
      properties: {
        spec_id: { type: "string" },
        path: { type: "string" },
      },
      required: ["spec_id", "path"],
    },
  },
];

const tools = role === "ideation" ? ideationTools : codingTools;

const main = async () => {
  const server = new Server(
    { name: "blume", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    try {
      if (name === "list_specs") {
        const specs = loadAll().map((s) => ({
          id: s.id,
          title: s.title,
          layer: s.layer,
          version: s.version,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(specs, null, 2) }],
        };
      }

      if (name === "evaluate_spec_completeness") {
        const spec = loadSpec(String(args.spec_id));
        const related = loadAll().filter((s) =>
          spec.related_specs.includes(s.id)
        );
        const result = evaluateCompleteness(spec, related);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "get_spec") {
        const spec = loadSpec(String(args.id));
        return {
          content: [{ type: "text", text: JSON.stringify(spec, null, 2) }],
        };
      }

      if (name === "report_build_note") {
        const id = randomUUID();
        await db.insert(buildNotes).values({
          id,
          specId: String(args.spec_id),
          buildId: args.build_id ? String(args.build_id) : null,
          acRef: String(args.ac_id),
          rationale: String(args.rationale),
        });
        return {
          content: [
            { type: "text", text: JSON.stringify({ ok: true, id }, null, 2) },
          ],
        };
      }

      if (name === "report_retry_attempt") {
        const id = randomUUID();
        await db.insert(retryAttempts).values({
          id,
          buildId: String(args.build_id),
          attemptNumber: Number(args.attempt_number),
          status: args.status === "pass" ? "pass" : "fail",
          failureDetail:
            (args.failure_detail as Record<string, unknown>) ?? null,
          rationale: args.rationale ? String(args.rationale) : null,
        });
        return {
          content: [
            { type: "text", text: JSON.stringify({ ok: true, id }, null, 2) },
          ],
        };
      }

      if (name === "check_edit_scope") {
        const specId = String(args.spec_id);
        const path = String(args.path).replace(/^\.\//, "");
        const governed = governedPathsFor(specId);
        const allowed = governed.some(
          (g) =>
            path === g ||
            path.startsWith(g.replace(/\/$/, "") + "/") ||
            path.startsWith(g)
        );
        const forbidden =
          path.startsWith("tests/") ||
          path.startsWith("specs/compiled/") ||
          path.includes("playwright.config");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { path, allowed: allowed && !forbidden, forbidden, governed },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: err instanceof Error ? err.message : String(err),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
