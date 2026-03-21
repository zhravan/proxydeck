import { getSession } from "../auth/middleware";
import { PUBLIC_API_PATHS } from "../http/constants";

export async function apiAuthGuard({ request }: { request: Request }): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api")) return;
  const isPublic = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return;
  const session = await getSession(request);
  if (session) return;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
