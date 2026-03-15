import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { pool } from "../lib/db";

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
});
