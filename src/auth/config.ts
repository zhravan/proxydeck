import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { count } from "drizzle-orm";
import { db } from "../db/client";
import { authSchema, user } from "../db/schema";

const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
const secret = process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    camelCase: true,
    schema: authSchema,
  }),
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
          const [row] = await db.select({ c: count() }).from(user);
          const n = Number(row?.c ?? 0);
          if (n >= 1) {
            throw new Error("Signup disabled: only one user allowed.");
          }
        },
      },
    },
  },
});
