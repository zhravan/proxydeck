import { Elysia } from "elysia";
import { auth } from "../auth";
import { apiAuthGuard } from "../middleware/apiAuthGuard";
import { requestLogPlugin } from "../middleware/requestLog";
import { domainRoutes } from "../controllers/domain.controller";
import { configApiRoutes } from "../controllers/configApi.controller";
import { systemRoutes } from "../controllers/system.controller";
import { openapiDocsPlugin } from "../plugins/openapiDocs";
import { createSpaStaticHandler } from "../static/spaStatic";

/**
 * Composes HTTP middleware, API route plugins, auth catch-all, and SPA static fallback.
 */
export function createApp(frontendDistDir: string) {
  const serveStatic = createSpaStaticHandler(frontendDistDir);

  const forwardAuth = (request: Request) => auth.handler(request);

  return (
    new Elysia()
      .use(requestLogPlugin())
      .onBeforeHandle(apiAuthGuard)
      .use(domainRoutes)
      .use(configApiRoutes)
      .use(systemRoutes)
      .use(openapiDocsPlugin())
      // Elysia matches `.get("/*")` before `.all("/api/auth/*")` for GET requests, which
      // returned an empty body for get-session and broke the SPA session check. Register
      // auth paths with explicit methods so they win over the SPA catch-all.
      // `parse: "none"` keeps Elysia from consuming `request.json()` before Better Auth runs
      // (avoids ERR_BODY_ALREADY_USED on sign-in/sign-up POSTs).
      .get("/api/auth/*", ({ request }) => forwardAuth(request), { parse: "none" })
      .post("/api/auth/*", ({ request }) => forwardAuth(request), { parse: "none" })
      .options("/api/auth/*", ({ request }) => forwardAuth(request), { parse: "none" })
      .get("/*", ({ request }) => {
        const pathname = new URL(request.url).pathname;
        if (pathname.startsWith("/api")) return;
        const res = serveStatic(pathname);
        if (res) return res;
        const indexRes = serveStatic("/index.html");
        return indexRes ?? new Response("Not Found", { status: 404 });
      })
  );
}
