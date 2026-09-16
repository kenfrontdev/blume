/**
 * Resolve Neon connection URLs.
 *
 * Vercel’s Neon integration prefixes vars with the store name (`BLUMEDB_`).
 * Local `.env` can still use the unprefixed names.
 */
export const getDatabaseUrl = (): string | undefined => {
  const url =
    process.env.BLUMEDB_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  return url || undefined;
};

/** Prefer the direct (unpooled) URL for migrations; fall back to pooled. */
export const getDatabaseUrlUnpooled = (): string | undefined => {
  const url =
    process.env.BLUMEDB_DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    getDatabaseUrl();
  return url || undefined;
};

export const hasDatabaseUrl = (): boolean => Boolean(getDatabaseUrl());
