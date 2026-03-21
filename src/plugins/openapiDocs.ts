import { swagger } from "@elysiajs/swagger";

/**
 * Scalar-based OpenAPI UI + JSON spec. Mounted under `/api/docs` (public; see `PUBLIC_API_PATHS`).
 * Route detail in the spec improves when handlers declare Elysia `body` / `response` schemas with `t.*`.
 */
export function openapiDocsPlugin() {
  return swagger({
    path: "/api/docs",
    /** Must be root-absolute: the plugin strips a leading slash for Scalar, which breaks resolution from `/api/docs`. */
    scalarConfig: {
      spec: {
        url: "/api/docs/json",
      },
    },
    documentation: {
      info: {
        title: "ProxyDeck API",
        version: "0.0.5",
        description:
          "HTTP API for ProxyDeck. Most `/api/*` routes require a signed-in session (Better Auth cookie). Try requests from the browser while logged in, or use credentials/cookies in your client.",
      },
      tags: [
        { name: "domains", description: "User-scoped domain portfolio" },
        { name: "config", description: "Reverse proxy configuration" },
        { name: "system", description: "Health, signup gate, proxy status, logs" },
        { name: "auth", description: "Better Auth (forwarded under `/api/auth/*`)" },
      ],
      /** Better Auth is not registered as Elysia routes; document the surface so the `auth` tag is populated. */
      paths: {
        "/api/auth": {
          get: {
            tags: ["auth"],
            summary: "Better Auth (GET)",
            description:
              "Forwarded to Better Auth. Typical GET paths include session checks under `/api/auth/*`.",
            responses: { 200: { description: "Varies by subpath" } },
          },
          post: {
            tags: ["auth"],
            summary: "Better Auth (POST)",
            description:
              "Forwarded to Better Auth (e.g. sign-in, sign-out). Inspect SPA network traffic for exact paths and bodies.",
            responses: {
              200: { description: "Varies by subpath" },
              422: { description: "Validation error" },
            },
          },
        },
      },
    },
  });
}
