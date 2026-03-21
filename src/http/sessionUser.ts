import { getSession } from "../auth/middleware";

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const session = await getSession(request);
  if (!session?.user || typeof session.user !== "object" || !("id" in session.user)) return null;
  const id = (session.user as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}
