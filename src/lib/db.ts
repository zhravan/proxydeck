import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/proxydeck";

export const pool = new Pool({ connectionString });

export function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
}
