import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { auth } from "./auth/config";
import { getSession } from "./auth/middleware";
import { allowSignup } from "./auth/allow-signup";
import { detectProxy } from "./proxy/detect";
import { validateConfig } from "./config/validate";
import { applyConfig } from "./config/apply";
import { listHistory, getById, getLatest } from "./config/history";
import * as caddy from "./proxy/caddy";
import * as traefik from "./proxy/traefik";
import type { ProxyConfig } from "./proxy/types";
import { getLogs } from "./api/logs";
import { listInvites, createInvite, deleteInvite, getInviteByToken } from "./api/invites";

const PORT = process.env.PORT ?? "3000";
const FRONTEND_DIR = join(process.cwd(), "frontend", "dist");

const PUBLIC_API_PATHS = ["/api/auth", "/api/allow-signup", "/api/proxy/status", "/api/invites/check"];

async function apiAuthGuard({ request }: { request: Request }) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api")) return;
  const isPublic = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return;
  const session = await getSession(request);
  if (session) return;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function serveStatic(pathname: string): Response | null {
  if (pathname.includes("..")) return null;
  const path = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(FRONTEND_DIR, path.replace(/^\//, ""));
  if (!existsSync(filePath)) return null;
  const body = readFileSync(filePath);
  const ext = path.split(".").pop() ?? "";
  const types: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    ico: "image/x-icon",
    svg: "image/svg+xml",
  };
  const contentType = types[ext] ?? "application/octet-stream";
  return new Response(body, { headers: { "Content-Type": contentType } });
}

const app = new Elysia()
  .onBeforeHandle(apiAuthGuard)
  .get("/api/allow-signup", async () => ({ allowSignup: await allowSignup() }))
  .get("/api/proxy/status", async () => {
    try {
      return await detectProxy();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Detection failed";
      return { provider: null, message: msg };
    }
  })
  .post("/api/config/validate", async ({ body }) => {
    const config = (typeof body === "string" ? JSON.parse(body) : body) as ProxyConfig;
    if (!config?.sites) return { valid: false, error: "Invalid config: sites required" };
    return validateConfig(config);
  })
  .post("/api/config/apply", async ({ body }) => {
    const config = (typeof body === "string" ? JSON.parse(body) : body) as ProxyConfig;
    if (!config?.sites) return { ok: false, error: "Invalid config: sites required" };
    return applyConfig(config);
  })
  .get("/api/certificates", () => [])
  .get("/api/logs", () => ({ lines: getLogs() }))
  .get("/api/config/preview", async () => {
    const { provider } = await detectProxy();
    const config = await getLatest();
    const payload = config ?? { sites: [] };
    if (provider === "caddy") return { provider, raw: caddy.configToCaddyfile(payload) };
    if (provider === "traefik") return { provider, raw: traefik.configToYaml(payload) };
    return { provider: null, raw: "" };
  })
  .get("/api/config/current", async () => {
    const config = await getLatest();
    return config ?? { sites: [] };
  })
  .get("/api/config/history", () => listHistory())
  .post("/api/config/rollback", async ({ body }) => {
    const id = typeof body === "object" && body && "id" in body ? (body as { id: string }).id : null;
    if (!id) return { ok: false, error: "id required" };
    const entry = await getById(id);
    if (!entry) return { ok: false, error: "Config not found" };
    return applyConfig(entry.payload);
  })
  .get("/api/invites", async () => listInvites())
  .post("/api/invites", async ({ request, body }) => {
    const session = await getSession(request);
    if (session?.user?.role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    const { email, role } = (typeof body === "string" ? JSON.parse(body) : body) as { email: string, role: string };
    if (!email) return new Response(JSON.stringify({ error: "Email required" }), { status: 400 });
    return createInvite(email, role || "member", session.user.id);
  })
  .delete("/api/invites/:id", async ({ request, params }) => {
    const session = await getSession(request);
    if (session?.user?.role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    await deleteInvite(params.id);
    return { ok: true };
  })
  .get("/api/invites/check/:token", async ({ params }) => {
    const invite = await getInviteByToken(params.token);
    if (!invite) return new Response(JSON.stringify({ error: "Invalid or expired invite" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return invite;
  })
  .all("/api/auth/*", async ({ request }) => auth.handler(request))
  .get("/*", ({ request }) => {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api")) return;
    const res = serveStatic(pathname);
    if (res) return res;
    const indexRes = serveStatic("/index.html");
    return indexRes ?? new Response("Not Found", { status: 404 });
  })
  .listen(PORT);

console.log(`Server at http://localhost:${PORT}`);

export type App = typeof app;
