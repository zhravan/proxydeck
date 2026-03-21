/** API paths that skip session checks (see `middleware/apiAuthGuard`). */
export const PUBLIC_API_PATHS = [
  "/api/auth",
  "/api/docs",
  "/api/health",
  "/api/allow-signup",
  "/api/proxy/status",
] as const;
