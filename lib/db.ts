import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

export type AppDb = NeonHttpDatabase<typeof schema>;

export const hasDatabaseUrl = (): boolean =>
  Boolean(process.env.DATABASE_URL?.trim());

let cached: AppDb | undefined;

/**
 * Lazy Neon client. Returns null when DATABASE_URL is unset so portal
 * pages can render an empty state instead of crashing on import.
 */
export const getDb = (): AppDb | null => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!cached) {
    cached = drizzle(neon(url), { schema });
  }
  return cached;
};

/**
 * Script/CLI accessor — throws when DATABASE_URL is missing.
 * Prefer `getDb()` in portal server components and API routes.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    if (!instance) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
      );
    }
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
