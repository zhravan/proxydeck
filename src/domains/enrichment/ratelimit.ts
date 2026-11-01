const WINDOW_MS = 60_000;
const MAX_REQUESTS = 24;
const DOMAIN_WINDOW_MS = 60_000;
const MAX_DOMAIN_REQUESTS = 1;

const hits = new Map<string, number[]>();
const domainHits = new Map<string, number[]>();

function consume(map: Map<string, number[]>, key: string, max: number, windowMs: number):
  { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const fresh = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    const retryAfterSec = Math.ceil((windowMs - (now - Math.min(...fresh))) / 1000);
    map.set(key, fresh);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  fresh.push(now);
  map.set(key, fresh);
  return { ok: true };
}

export function rateLimitDomainLookup(userId: string) {
  return consume(hits, userId, MAX_REQUESTS, WINDOW_MS);
}

/** Keep explicit refreshes to one per domain per minute, in addition to the user-wide limit. */
export function rateLimitDomainCheck(userId: string, domainId: string) {
  const user = consume(hits, userId, MAX_REQUESTS, WINDOW_MS);
  if (!user.ok) return user;
  return consume(domainHits, `${userId}:${domainId}`, MAX_DOMAIN_REQUESTS, DOMAIN_WINDOW_MS);
}
