/** Public API endpoints; keep the unauthenticated surface deliberately small. */
export const PUBLIC_API_PATHS = [
  "/api/auth", "/api/docs", "/api/health", "/api/allow-signup", "/api/auth-capabilities",
] as const;
