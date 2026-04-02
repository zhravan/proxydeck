import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { count } from "drizzle-orm";
import { db } from "../db/client";
import { authSchema, user } from "../db/schema";
import {
  getAppSettingsRowFresh,
  handleSendPasswordResetEmail,
  handleSendVerificationEmail,
} from "../services/appSettings.service";

/**
 * Constructs Better Auth with DB-backed email hooks and verification policy.
 */
export async function buildBetterAuth() {
  const row = await getAppSettingsRowFresh();
  const requireEmailVerification = row.requireVerifiedSignIn && row.emailVerificationEnabled;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      camelCase: true,
      schema: authSchema,
    }),
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`,
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",
    emailVerification: {
      sendVerificationEmail: async (data, request) => {
        await handleSendVerificationEmail(data, request);
      },
      sendOnSignUp: true,
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async (data, request) => {
        await handleSendPasswordResetEmail(data, request);
      },
      requireEmailVerification,
    },
    plugins: [username()],
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const [cRow] = await db.select({ c: count() }).from(user);
            const n = Number(cRow?.c ?? 0);
            if (n >= 1) {
              throw new Error("Signup disabled: only one user allowed.");
            }
          },
        },
      },
    },
  });
}
