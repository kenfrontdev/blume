import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Prefer the direct (unpooled) URL for migrations; fall back to the pooled app URL.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. Copy .env.example to .env."
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
