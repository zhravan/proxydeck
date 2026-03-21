import type { ApiResult } from "../types/api";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function toResponse(result: ApiResult): Response {
  return jsonResponse(result.body, result.status);
}

export function dbFailureBody(err: unknown): { status: number; body: unknown } {
  const msg = err instanceof Error ? err.message : "Database error";
  const migrateHint =
    /column|does not exist|relation .domains|undefined_(column|table)/i.test(msg)
      ? " Run `bun run db:migrate` with the same DATABASE_URL the app uses."
      : "";
  return { status: 500, body: { error: `${msg}${migrateHint}` } };
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}
