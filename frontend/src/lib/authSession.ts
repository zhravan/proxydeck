/**
 * Normalize better-auth JSON shapes from sign-in/sign-up and get-session into a user object, or null.
 */
export function userFromAuthPayload(data: unknown): Record<string, unknown> | null {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return null;

  const o = data as Record<string, unknown>;

  const direct = o.user;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }

  const nested = o.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    const u = inner.user;
    if (u && typeof u === "object" && !Array.isArray(u)) {
      return u as Record<string, unknown>;
    }
  }

  const sess = o.session;
  if (sess && typeof sess === "object" && !Array.isArray(sess)) {
    const su = (sess as Record<string, unknown>).user;
    if (su && typeof su === "object" && !Array.isArray(su)) {
      return su as Record<string, unknown>;
    }
  }

  return null;
}

export function parseGetSessionUser(text: string): Record<string, unknown> | null {
  if (!text.trim()) return null;
  let d: unknown;
  try {
    d = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  return userFromAuthPayload(d);
}
