import { pool } from "../../db/pool";
import { randomBytes, randomUUID } from "crypto";

export async function listInvites() {
  const r = await pool.query(`
    SELECT i.*, u.name as "inviterName"
    FROM "invitation" i
    JOIN "user" u ON i."inviterId" = u.id
    ORDER BY i."createdAt" DESC
  `);
  return r.rows;
}

export async function createInvite(email: string, role: string, inviterId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const id = randomUUID();
  
  await pool.query(
    `INSERT INTO "invitation" (id, email, role, token, "expiresAt", "inviterId")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, email, role, token, expiresAt, inviterId]
  );
  
  return { id, token, email, role, expiresAt };
}

export async function deleteInvite(id: string) {
  await pool.query('DELETE FROM "invitation" WHERE id = $1', [id]);
}

export async function getInviteByToken(token: string) {
  const r = await pool.query(
    'SELECT * FROM "invitation" WHERE token = $1 AND status = \'pending\' AND "expiresAt" > NOW()',
    [token]
  );
  return r.rows[0];
}
