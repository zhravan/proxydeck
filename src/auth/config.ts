import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { pool } from "../db/pool";

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
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const r = await pool.query<{ count: string }>('SELECT COUNT(*)::text FROM "user"');
          const count = parseInt(r.rows[0]?.count ?? "0", 10);
          if (count >= 1) {
            throw new Error("Signup disabled: only one user allowed.");
          }
        },
      },
    },
  },
});
