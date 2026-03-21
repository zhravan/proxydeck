const IANA_RDAP_DNS = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 86_400_000;

type BootstrapFile = {
  services: [string[], string[]][];
};

let bootstrapCache: { data: BootstrapFile; at: number } | null = null;

async function loadBootstrap(): Promise<BootstrapFile> {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCache.at < BOOTSTRAP_TTL_MS) {
    return bootstrapCache.data;
  }
  const res = await fetch(IANA_RDAP_DNS, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RDAP bootstrap HTTP ${res.status}`);
  const data = (await res.json()) as BootstrapFile;
  if (!data?.services || !Array.isArray(data.services)) {
    throw new Error("RDAP bootstrap: invalid JSON");
  }
  bootstrapCache = { data, at: now };
  return data;
}

function suffixCandidates(hostname: string): string[] {
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length < 2) return [];
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    out.push(labels.slice(i).join(".").toLowerCase());
  }
  out.push(labels[labels.length - 1].toLowerCase());
  return [...new Set(out)];
}

function normalizeBaseUrl(base: string): string {
  return base.replace(/\/?$/, "/");
}

function rdapDomainUrls(base: string, hostname: string): string[] {
  const b = normalizeBaseUrl(base);
  const enc = encodeURIComponent(hostname);
  return [`${b}domain/${enc}`];
}

export async function findRdapBasesForHost(hostname: string): Promise<string[]> {
  const boot = await loadBootstrap();
  const want = new Set(suffixCandidates(hostname));
  const bases: string[] = [];
  for (const entry of boot.services) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const tlds = entry[0];
    const urls = entry[1];
    if (!Array.isArray(tlds) || !Array.isArray(urls)) continue;
    for (const tld of tlds) {
      if (typeof tld !== "string") continue;
      if (!want.has(tld.toLowerCase())) continue;
      for (const u of urls) {
        if (typeof u === "string" && u.startsWith("http")) bases.push(u);
      }
    }
  }
  return [...new Set(bases)];
}

function extractVcardFn(vcardArray: unknown): string | null {
  if (!Array.isArray(vcardArray) || vcardArray[0] !== "vcard" || !Array.isArray(vcardArray[1])) {
    return null;
  }
  for (const row of vcardArray[1]) {
    if (!Array.isArray(row) || row[0] !== "fn") continue;
    const last = row[row.length - 1];
    if (typeof last === "string" && last.trim()) return last.trim();
  }
  return null;
}

function registrarFromEntities(entities: unknown): string | null {
  if (!Array.isArray(entities)) return null;
  for (const ent of entities) {
    if (!ent || typeof ent !== "object") continue;
    const roles = (ent as { roles?: unknown }).roles;
    if (!Array.isArray(roles) || !roles.includes("registrar")) continue;
    const fn = extractVcardFn((ent as { vcardArray?: unknown }).vcardArray);
    if (fn) return fn;
    const nested = (ent as { entities?: unknown }).entities;
    const inner = registrarFromEntities(nested);
    if (inner) return inner;
  }
  return null;
}

function parseExpiry(data: Record<string, unknown>): Date | null {
  const events = data.events;
  if (!Array.isArray(events)) return null;
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const action = (ev as { eventAction?: unknown }).eventAction;
    const dateStr = (ev as { eventDate?: unknown }).eventDate;
    if (typeof action !== "string" || typeof dateStr !== "string") continue;
    if (action.toLowerCase() !== "expiration") continue;
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function parseEvents(data: Record<string, unknown>): { action: string; date: string }[] {
  const events = data.events;
  if (!Array.isArray(events)) return [];
  const out: { action: string; date: string }[] = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const action = (ev as { eventAction?: unknown }).eventAction;
    const dateStr = (ev as { eventDate?: unknown }).eventDate;
    if (typeof action !== "string" || typeof dateStr !== "string") continue;
    out.push({ action, date: dateStr });
  }
  return out;
}

export type RdapSummary = {
  sourceUrl: string;
  registrarName: string | null;
  expiresAt: Date | null;
  domainStatus: string[];
  events: { action: string; date: string }[];
};

export async function fetchRdapSummary(hostname: string): Promise<RdapSummary | null> {
  const bases = await findRdapBasesForHost(hostname);
  for (const base of bases) {
    const urls = rdapDomainUrls(base, hostname);
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/rdap+json" },
          signal: AbortSignal.timeout(14_000),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        if (data.objectClassName !== "domain") continue;
        const status = Array.isArray(data.status)
          ? data.status.filter((s): s is string => typeof s === "string")
          : [];
        const registrarName = registrarFromEntities(data.entities);
        const expiresAt = parseExpiry(data);
        return {
          sourceUrl: url,
          registrarName,
          expiresAt,
          domainStatus: status,
          events: parseEvents(data),
        };
      } catch {
        /* try next */
      }
    }
  }
  return null;
}
