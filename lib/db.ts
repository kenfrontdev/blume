import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { getDatabaseUrl, hasDatabaseUrl } from "@/lib/db-env";

export type AppDb = NeonHttpDatabase<typeof schema>;

export { hasDatabaseUrl, getDatabaseUrl } from "@/lib/db-env";

let cached: AppDb | undefined;

/**
 * Lazy Neon client. Returns null when no database URL is set so portal
 * pages can render an empty state instead of crashing on import.
 */
export const getDb = (): AppDb | null => {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!cached) {
    cached = drizzle(neon(url), { schema });
  }
  return cached;
};

/**
 * Script/CLI accessor — throws when the database URL is missing.
 * Prefer `getDb()` in portal server components and API routes.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    if (!instance) {
      throw new Error(
        "Database URL is not set. Set BLUMEDB_DATABASE_URL (Vercel/Neon) or DATABASE_URL locally. See .env.example."
      );
    }
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
