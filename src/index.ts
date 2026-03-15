import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { auth } from "./auth/config";
import { getSession, isProtectedPath } from "./auth/middleware";
import { allowSignup } from "./auth/allow-signup";
import { detectProxy } from "./proxy/detect";
import { validateConfig } from "./config/validate";
import { applyConfig } from "./config/apply";
import { render } from "./ssr/render";
import { shell } from "./ssr/html";
import type { ProxyConfig } from "./proxy/types";

const PORT = process.env.PORT ?? "3000";
const ASSETS_DIR = join(process.cwd(), "dist", "assets");

async function authGuard({ request }: { request: Request }) {
  const pathname = new URL(request.url).pathname;
  if (!isProtectedPath(pathname)) return;
  const session = await getSession(request.headers);
  if (session) return;
  const allow = await allowSignup();
  return new Response(null, {
    status: 302,
    headers: { Location: allow ? "/signup" : "/login" },
  });
}

const loginHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Login</title></head>
<body>
  <h1>Login</h1>
  <form action="/api/auth/sign-in/username" method="POST">
    <label>Username <input name="username" required></label>
    <label>Password <input name="password" type="password" required></label>
    <button type="submit">Sign in</button>
  </form>
</body></html>
`;

const signupHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sign up</title></head>
<body>
  <h1>Sign up</h1>
  <form action="/api/auth/sign-up/email" method="POST">
    <label>Name <input name="name" required></label>
    <label>Email <input name="email" type="email" required></label>
    <label>Username <input name="username" required></label>
    <label>Password <input name="password" type="password" required></label>
    <button type="submit">Create account</button>
  </form>
</body></html>
`;

const app = new Elysia()
  .onBeforeHandle(authGuard)
  .get("/api/allow-signup", async () => ({ allowSignup: await allowSignup() }))
  .get("/api/proxy/status", async () => detectProxy())
  .post("/api/config/validate", async ({ body }) => {
    const config = body as ProxyConfig;
    return validateConfig(config);
  })
  .post("/api/config/apply", async ({ body }) => {
    const config = body as ProxyConfig;
    return applyConfig(config);
  })
  .all("/api/auth/*", async ({ request }) => auth.handler(request))
  .get("/login", () => new Response(loginHtml, { headers: { "Content-Type": "text/html" } }))
  .get("/signup", () => new Response(signupHtml, { headers: { "Content-Type": "text/html" } }))
  .get("/assets/*", ({ request }) => {
    const pathname = new URL(request.url).pathname;
    const sub = pathname.slice("/assets/".length) || "entry.js";
    if (sub.includes("..")) return new Response("Forbidden", { status: 403 });
    const filePath = join(ASSETS_DIR, sub);
    if (!existsSync(filePath)) return new Response("Not Found", { status: 404 });
    const body = readFileSync(filePath);
    const contentType = sub.endsWith(".js") ? "application/javascript" : sub.endsWith(".css") ? "text/css" : "application/octet-stream";
    return new Response(body, { headers: { "Content-Type": contentType } });
  })
  .get("/", () => {
    const ssrContent = render("/");
    const html = shell(ssrContent);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  })
  .listen(PORT);

console.log(`Server at http://localhost:${PORT}`);

export type App = typeof app;
