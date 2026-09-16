import { defineConfig } from "drizzle-kit";
import "dotenv/config";
import { getDatabaseUrlUnpooled } from "./lib/db-env";

const migrationUrl = getDatabaseUrlUnpooled();

if (!migrationUrl) {
  throw new Error(
    "Database URL is not set. Set BLUMEDB_DATABASE_URL_UNPOOLED / BLUMEDB_DATABASE_URL (or DATABASE_URL*). See .env.example."
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
