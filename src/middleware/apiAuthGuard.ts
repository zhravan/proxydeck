import { getSession } from "../auth/middleware";
import { PUBLIC_API_PATHS } from "../http/constants";
import { getAppSettingsRowCached, rowRequiresVerifiedSignIn } from "../services/appSettings.service";

/** API prefixes reachable before email verification (when that policy is on). */
const API_OK_BEFORE_EMAIL_VERIFIED = [
  "/api/auth",
  "/api/health",
  "/api/allow-signup",
  "/api/auth-capabilities",
  "/api/docs",
  "/api/settings/app",
] as const;

function isOkBeforeEmailVerified(pathname: string): boolean {
  return API_OK_BEFORE_EMAIL_VERIFIED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function apiAuthGuard({ request }: { request: Request }): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api")) return;
  const isPublic = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return;
  const session = await getSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const settings = await getAppSettingsRowCached();
  if (rowRequiresVerifiedSignIn(settings)) {
    const u = session.user;
    if (u && typeof u === "object" && "emailVerified" in u && u.emailVerified === false) {
      if (!isOkBeforeEmailVerified(pathname)) {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            code: "EMAIL_NOT_VERIFIED",
            message: "Verify your email to use this API.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }
  }
  return;
}
