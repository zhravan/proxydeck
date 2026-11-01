const WINDOW_MS = 60_000;
const MAX_REQUESTS = 24;
const DOMAIN_WINDOW_MS = 60_000;
const MAX_DOMAIN_REQUESTS = 1;

const lookupHits = new Map<string, number[]>();
const checkHits = new Map<string, number[]>();
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
  return consume(lookupHits, userId, MAX_REQUESTS, WINDOW_MS);
}

/** Limit explicit checks per user and per domain to keep outbound lookups bounded. */
export function rateLimitDomainCheck(userId: string, domainId: string) {
  const user = consume(checkHits, userId, MAX_REQUESTS, WINDOW_MS);
  if (!user.ok) return user;
  return consume(domainHits, `${userId}:${domainId}`, MAX_DOMAIN_REQUESTS, DOMAIN_WINDOW_MS);
}
