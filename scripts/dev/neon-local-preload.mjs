/**
 * Dev-only preload that points `@neondatabase/serverless` at the local
 * Neon HTTP proxy (scripts/dev/neon-http-proxy.mjs) instead of a hosted
 * Neon endpoint.
 *
 * Injected via NODE_OPTIONS="--import ./scripts/dev/neon-local-preload.mjs"
 * from the environment run commands, so no application source needs to know
 * about local development. Inert unless BLUME_LOCAL_NEON is set.
 *
 * We set the singleton on BOTH the ESM and CJS copies of the package so the
 * override applies whether the consumer `import`s or `require`s it.
 */
import { createRequire } from "node:module";

if (process.env.BLUME_LOCAL_NEON === "1") {
  const host = process.env.BLUME_NEON_PROXY_HOST ?? "127.0.0.1:4444";
  const endpoint =
    process.env.BLUME_NEON_PROXY_URL ?? `http://${host}/sql`;

  const apply = (neonConfig) => {
    if (!neonConfig) return;
    // HTTP path (neon() single/batch queries — app runtime + ingest).
    neonConfig.fetchEndpoint = () => endpoint;
    // WebSocket path (Pool/Client sessions — drizzle-kit migrations).
    neonConfig.wsProxy = () => `${host}/v2`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    neonConfig.poolQueryViaFetch = true;
  };

  try {
    const require = createRequire(import.meta.url);
    apply(require("@neondatabase/serverless").neonConfig);
  } catch {
    // ignore — ESM path below covers bundler-external usage
  }

  try {
    const mod = await import("@neondatabase/serverless");
    apply(mod.neonConfig);
  } catch {
    // ignore — CJS path above already applied
  }
}
