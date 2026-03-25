import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

/**
 * Applies pending SQL migrations (same set as `bun run db:migrate`).
 * Call once at process startup; throws on failure so the process can exit.
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

/**
 * Runs migrations and exits the process with code 1 on any failure (fail-fast boot).
 */
export async function runMigrationsOrExit(): Promise<void> {
  try {
    await runMigrations();
    console.log("[db] migrations applied (or already up to date)");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[db] FATAL: migration failed - server will not start:", msg);
    process.exit(1);
  }
}
