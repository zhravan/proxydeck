import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { session, user } from "../db/schema";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/allow-signup"];
const STATIC_PREFIX = "/assets";
const SESSION_COOKIE_NAME = "better-auth.session_token";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith(STATIC_PREFIX)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get("cookie") ?? headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/** Resolve session from DB using cookie token. */
async function getSessionFromDb(cookieValue: string): Promise<{ user: unknown } | null> {
  const tokenPart = cookieValue.split(".")[0];
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(
      and(
        or(eq(session.token, cookieValue), eq(session.token, tokenPart)),
        gt(session.expiresAt, sql`now()`)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
    },
  };
}

export async function getSession(requestOrHeaders: Request | Headers) {
  const headers = requestOrHeaders instanceof Request ? requestOrHeaders.headers : requestOrHeaders;
  const cookieValue = getCookie(headers, SESSION_COOKIE_NAME);
  if (!cookieValue) return null;
  return getSessionFromDb(cookieValue);
}

export function isProtectedPath(pathname: string): boolean {
  return !isPublicPath(pathname);
}
