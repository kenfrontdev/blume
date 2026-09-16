/**
 * Dev-only Neon HTTP proxy.
 *
 * The app talks to Postgres through `@neondatabase/serverless` (neon-http),
 * which speaks Neon's SQL-over-HTTP protocol rather than the raw Postgres
 * wire protocol. In the cloud this is a hosted Neon endpoint; locally we
 * emulate that endpoint with this tiny proxy so the exact same application
 * code runs against a plain local Postgres.
 *
 * It implements the subset of the Neon HTTP protocol the driver uses:
 *   POST /sql  { query, params }                    -> single statement
 *   POST /sql  { queries: [{ query, params }, ...] } -> batched transaction
 * honouring the `Neon-Array-Mode` and `Neon-Raw-Text-Output` request headers.
 *
 * Not used in production — see .cursor/environment.json (local dev only).
 */
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// `pg` and `ws` are installed out-of-repo (see the environment install step)
// and made resolvable via NODE_PATH so they never pollute the app's deps.
const { Pool, types } = require("pg");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.BLUME_NEON_PROXY_PORT ?? 4444);
const PG_CONNECTION_STRING =
  process.env.BLUME_NEON_PROXY_PG_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/blume";

// Identity parser: hand every value back as raw Postgres text so the neon
// client can apply its own type parsers, exactly like the hosted service.
const rawTextTypes = {
  getTypeParser: () => (val) => val,
};

const pool = new Pool({ connectionString: PG_CONNECTION_STRING, max: 10 });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const runQuery = async (client, arrayMode, rawText, { query, params }) => {
  const result = await client.query({
    text: query,
    values: params ?? [],
    rowMode: arrayMode ? "array" : undefined,
    types: rawText ? rawTextTypes : types,
  });
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
    fields: (result.fields ?? []).map((f) => ({
      name: f.name,
      dataTypeID: f.dataTypeID,
      tableID: f.tableID,
      columnID: f.columnID,
      dataTypeSize: f.dataTypeSize,
      dataTypeModifier: f.dataTypeModifier,
      format: f.format,
    })),
    rowAsArray: Boolean(arrayMode),
  };
};

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end("Method Not Allowed");
    return;
  }

  const arrayMode = req.headers["neon-array-mode"] === "true";
  const rawText = req.headers["neon-raw-text-output"] === "true";

  try {
    const raw = await readBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const client = await pool.connect();
    try {
      if (Array.isArray(payload.queries)) {
        const results = [];
        await client.query("BEGIN");
        try {
          for (const q of payload.queries) {
            results.push(await runQuery(client, arrayMode, rawText, q));
          }
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ results }));
        return;
      }

      const result = await runQuery(client, arrayMode, rawText, payload);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } finally {
      client.release();
    }
  } catch (err) {
    // Mirror Neon's error envelope so the driver surfaces a real pg error.
    res.writeHead(400, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        message: err?.message ?? String(err),
        code: err?.code,
        severity: err?.severity,
        detail: err?.detail,
      }),
    );
  }
});

/**
 * WebSocket tunnel for the neon-http driver's Pool/Client path (used by
 * drizzle-kit migrations). The driver connects to `ws://host/v2?address=h:p`
 * and pipes the raw Postgres wire protocol; we just relay those bytes to a
 * TCP socket opened against the requested address.
 */
const wss = new WebSocketServer({ server, path: "/v2" });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const address = url.searchParams.get("address") ?? "127.0.0.1:5432";
  const [host, portStr] = address.split(":");
  const socket = net.connect(Number(portStr) || 5432, host || "127.0.0.1");

  socket.on("data", (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
  ws.on("message", (data) => socket.write(data));

  const close = () => {
    socket.destroy();
    if (ws.readyState === ws.OPEN) ws.close();
  };
  socket.on("close", close);
  socket.on("error", close);
  ws.on("close", close);
  ws.on("error", close);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[neon-http-proxy] http://127.0.0.1:${PORT}/sql + ws /v2 -> ${PG_CONNECTION_STRING.replace(
      /:[^:@/]*@/,
      ":***@",
    )}`,
  );
});
