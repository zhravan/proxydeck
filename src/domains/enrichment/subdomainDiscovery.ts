const SHODAN_TIMEOUT_MS = 20_000;
const DNSDUMPSTER_TIMEOUT_MS = 25_000;
const BETWEEN_SOURCES_MS = 2100;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHostLabel(raw: string): string | null {
  const s = raw.trim().replace(/\.$/, "").toLowerCase();
  if (!s || s.includes("..") || s.startsWith(".")) return null;
  return s;
}

function isUnderZone(host: string, apex: string): boolean {
  const h = host.toLowerCase();
  const a = apex.toLowerCase();
  return h === a || h.endsWith(`.${a}`);
}

function addHost(set: Set<string>, apex: string, raw: unknown) {
  if (typeof raw !== "string") return;
  const n = normalizeHostLabel(raw);
  if (n && isUnderZone(n, apex)) set.add(n);
}

/** Extract hostnames from DNSDumpster JSON (A / CNAME / etc.). */
function collectFromDnsDumpsterPayload(apex: string, data: unknown, into: Set<string>) {
  if (!data || typeof data !== "object") return;
  const o = data as Record<string, unknown>;
  const arrays = ["a", "cname", "mx", "ns", "txt"] as const;
  for (const key of arrays) {
    const arr = o[key];
    if (!Array.isArray(arr)) continue;
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      addHost(into, apex, r.host);
      addHost(into, apex, r.target);
      addHost(into, apex, r.exchange);
      addHost(into, apex, r.nameserver);
    }
  }
}

export type SubdomainDiscoveryResult = {
  hostnames: string[];
  sources: string[];
  errors: string[];
};

/**
 * Optional subdomain hints: Shodan (`SHODAN_TOKEN`) and DNSDumpster (`DNS_DUMPSTER_TOKEN`).
 * Respects DNSDumpster rate guidance (~1 req / 2s) when both run.
 */
export async function discoverSubdomains(apex: string): Promise<SubdomainDiscoveryResult> {
  const seen = new Set<string>();
  const sources: string[] = [];
  const errors: string[] = [];
  const al = apex.toLowerCase();

  const shodanKey = process.env.SHODAN_TOKEN?.trim();
  if (shodanKey) {
    try {
      const url = `https://api.shodan.io/dns/domain/${encodeURIComponent(al)}?key=${encodeURIComponent(shodanKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(SHODAN_TIMEOUT_MS) });
      if (!res.ok) {
        errors.push(`Shodan: HTTP ${res.status}`);
      } else {
        const j = (await res.json()) as { subdomains?: unknown };
        if (Array.isArray(j.subdomains)) {
          for (const s of j.subdomains) {
            if (typeof s !== "string" || !s.trim()) continue;
            const fq = normalizeHostLabel(`${s.trim()}.${al}`);
            if (fq && isUnderZone(fq, al)) seen.add(fq);
          }
          sources.push("shodan");
        }
      }
    } catch (e) {
      errors.push(`Shodan: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const ddKey = process.env.DNS_DUMPSTER_TOKEN?.trim();
  if (ddKey) {
    if (shodanKey) await delay(BETWEEN_SOURCES_MS);
    try {
      const res = await fetch(`https://api.dnsdumpster.com/domain/${encodeURIComponent(al)}`, {
        headers: { "X-API-Key": ddKey },
        signal: AbortSignal.timeout(DNSDUMPSTER_TIMEOUT_MS),
      });
      if (!res.ok) {
        errors.push(`DNSDumpster: HTTP ${res.status}`);
      } else {
        const data = (await res.json()) as unknown;
        collectFromDnsDumpsterPayload(al, data, seen);
        sources.push("dnsdumpster");
      }
    } catch (e) {
      errors.push(`DNSDumpster: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    hostnames: [...seen].sort((a, b) => a.localeCompare(b)),
    sources,
    errors,
  };
}
