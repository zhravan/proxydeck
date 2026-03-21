import { pool } from "../db/pool";

export async function allowSignup(): Promise<boolean> {
  const r = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "user"'
  );
  const count = parseInt(r.rows[0]?.count ?? "0", 10);
  return count === 0;
}
