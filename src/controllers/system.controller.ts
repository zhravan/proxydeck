import { Elysia } from "elysia";
import { jsonResponse } from "../http/json";
import { allowSignup } from "../auth/allow-signup";
import { getProxyStatusSafe } from "../services/proxyStatus.service";
import { readProxyLogTail } from "../services/logs.service";

const systemOpenapi = {
  tags: ["system"],
};

export const systemRoutes = new Elysia()
  .get("/api/health", () => jsonResponse({ ok: true }), {
    detail: {
      ...systemOpenapi,
      summary: "Health check",
    },
  })
  .get("/api/allow-signup", async () => jsonResponse({ allowSignup: await allowSignup() }), {
    detail: {
      ...systemOpenapi,
      summary: "Signup allowed?",
      description: "Whether new account registration is permitted.",
    },
  })
  .get("/api/proxy/status", async () => jsonResponse(await getProxyStatusSafe()), {
    detail: {
      ...systemOpenapi,
      summary: "Proxy detection status",
    },
  })
  .get("/api/certificates", () => jsonResponse([]), {
    detail: {
      ...systemOpenapi,
      summary: "Certificates (stub)",
      description: "Placeholder; returns an empty list until implemented.",
    },
  })
  .get("/api/logs", () => jsonResponse({ lines: readProxyLogTail() }), {
    detail: {
      ...systemOpenapi,
      summary: "Recent proxy log lines",
    },
  });
