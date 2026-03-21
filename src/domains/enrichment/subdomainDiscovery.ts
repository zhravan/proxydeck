const HACKERTARGET_TIMEOUT_MS = 20_000;
/** Space out calls after HackerTarget (their free tier: ~2 req/s per IP). */
const AFTER_HACKERTARGET_MS = 700;
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
function hackertargetHostsearchDisabled(): boolean {
  const v = process.env.HACKERTARGET_HOSTSEARCH?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off";
}

/** Plain-text lines: `host,ipv4` (HackerTarget hostsearch). */
function collectFromHostsearchBody(apex: string, text: string, into: Set<string>) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const tl = t.toLowerCase();
    if (tl.startsWith("error")) continue;
    const comma = t.indexOf(",");
    const hostPart = (comma >= 0 ? t.slice(0, comma) : t).trim().replace(/^["']+|["']+$/g, "");
    addHost(into, apex, hostPart);
  }
}

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
 * Subdomain hints: HackerTarget hostsearch (default, no key) → optional Shodan (`SHODAN_TOKEN`)
 * → optional DNSDumpster (`DNS_DUMPSTER_TOKEN`). Disable HT with `HACKERTARGET_HOSTSEARCH=0`.
 * Optional member key: `HACKERTARGET_API_KEY` (query param per HackerTarget docs).
 */
export async function discoverSubdomains(apex: string): Promise<SubdomainDiscoveryResult> {
  const seen = new Set<string>();
  const sources: string[] = [];
  const errors: string[] = [];
  const al = apex.toLowerCase();

  let attemptedHackertarget = false;
  if (!hackertargetHostsearchDisabled()) {
    attemptedHackertarget = true;
    try {
      const url = new URL("https://api.hackertarget.com/hostsearch/");
      url.searchParams.set("q", al);
      const htKey = process.env.HACKERTARGET_API_KEY?.trim();
      if (htKey) url.searchParams.set("apikey", htKey);
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(HACKERTARGET_TIMEOUT_MS),
        headers: {
          Accept: "text/plain, */*",
          "User-Agent": "ProxyDeck/1.0",
        },
      });
      if (res.status === 429) {
        errors.push("HackerTarget: rate limited (HTTP 429)");
      } else if (!res.ok) {
        errors.push(`HackerTarget: HTTP ${res.status}`);
      } else {
        const text = await res.text();
        const trimmed = text.trim();
        if (/^error\b/i.test(trimmed)) {
          errors.push(`HackerTarget: ${trimmed.slice(0, 240)}`);
        } else {
          collectFromHostsearchBody(al, text, seen);
          sources.push("hackertarget");
        }
      }
    } catch (e) {
      errors.push(`HackerTarget: ${e instanceof Error ? e.message : String(e)}`);
    }
    await delay(AFTER_HACKERTARGET_MS);
  }

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
    if (shodanKey || attemptedHackertarget) await delay(BETWEEN_SOURCES_MS);
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
