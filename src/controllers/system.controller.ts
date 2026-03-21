import { Elysia } from "elysia";
import { jsonResponse } from "../http/json";
import { allowSignup } from "../auth/allow-signup";
import { getProxyStatusSafe } from "../services/proxyStatus.service";
import { readProxyLogTail } from "../services/logs.service";

export const systemRoutes = new Elysia()
  .get("/api/health", () => jsonResponse({ ok: true }))
  .get("/api/allow-signup", async () => jsonResponse({ allowSignup: await allowSignup() }))
  .get("/api/proxy/status", async () => jsonResponse(await getProxyStatusSafe()))
  .get("/api/certificates", () => jsonResponse([]))
  .get("/api/logs", () => jsonResponse({ lines: readProxyLogTail() }));
