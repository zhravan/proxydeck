const WINDOW_MS = 60_000;
const MAX_REQUESTS = 24;

const hits = new Map<string, number[]>();

export function rateLimitDomainLookup(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const prev = hits.get(userId) ?? [];
  const fresh = prev.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_REQUESTS) {
    const oldest = Math.min(...fresh);
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  fresh.push(now);
  hits.set(userId, fresh);
  return { ok: true };
}
