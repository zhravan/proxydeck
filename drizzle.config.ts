import { defineConfig } from "drizzle-kit";

/** Migrate uses real DATABASE_URL; generate falls back so CI/dev can run without env. */
const url =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/proxydeck";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
