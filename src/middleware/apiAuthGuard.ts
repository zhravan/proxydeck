import { getSession } from "../auth/middleware";
import { hasPermission, permissionForApiRequest, type Permission, type UserRole } from "../auth/roles";
import { getAppSettingsRowCached, rowRequiresVerifiedSignIn } from "../services/appSettings.service";

const API_OK_BEFORE_EMAIL_VERIFIED = ["/api/auth","/api/health","/api/allow-signup","/api/auth-capabilities","/api/docs"] as const;
function jsonError(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), { status, headers: { "Content-Type": "application/json" } });
}
export async function apiAuthGuard({ request }: { request: Request }): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api")) return;
  const session = await getSession(request);
  if (!session) return jsonError(401, "Unauthorized", "UNAUTHORIZED");
  const currentUser = session.user as { emailVerified?: boolean; role?: unknown };
  const settings = await getAppSettingsRowCached();
  if (rowRequiresVerifiedSignIn(settings) && currentUser.emailVerified === false &&
      !API_OK_BEFORE_EMAIL_VERIFIED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return jsonError(403, "Verify your email to use this API.", "EMAIL_NOT_VERIFIED");
  }
  const permission = permissionForApiRequest(request.method, pathname);
  if (permission === null) return;
  if (permission === "admin:only") return jsonError(403, "No authorization policy is defined for this API route.", "ROLE_POLICY_MISSING");
  const role = currentUser.role;
  if (role !== "admin" && role !== "operator" && role !== "viewer") return jsonError(403, "User role is missing or invalid.", "INVALID_ROLE");
  if (!hasPermission(role as UserRole, permission as Permission)) return jsonError(403, "Your role does not allow this action.", "FORBIDDEN");
  return;
}
