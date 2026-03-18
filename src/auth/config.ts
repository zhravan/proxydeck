import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { pool } from "../../db/pool";

const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
const secret = process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production";

export const auth = betterAuth({
  database: pool as any,
  basePath: "/api/auth",
  baseURL,
  secret,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async ({ data }) => {
          const r = await pool.query<{ count: string }>('SELECT COUNT(*)::text FROM "user"');
          const count = parseInt(r.rows[0]?.count ?? "0", 10);
          
          if (count === 0) {
            (data as any).role = "admin";
            return;
          }

          // Check if there's a valid invitation for this email
          const inviteRes = await pool.query<{ id: string, role: string }>(
            'SELECT id, role FROM "invitation" WHERE email = $1 AND status = \'pending\' AND "expiresAt" > NOW()',
            [data.email]
          );
          
          if (inviteRes.rows.length === 0) {
            throw new Error("Signup disabled: valid invitation required for this email.");
          }
          
          // Use the role from the invitation
          (data as any).role = inviteRes.rows[0].role;
        },
        after: async ({ user }) => {
          await pool.query(
            'UPDATE "invitation" SET status = \'accepted\', "updatedAt" = NOW() WHERE email = $1 AND status = \'pending\'',
            [user.email]
          );
        }
      },
    },
  },
});
