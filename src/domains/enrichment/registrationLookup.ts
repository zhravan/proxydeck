import whois from "whois-json";
import { fetchRdapSummary, type RdapSummary } from "./rdap";

const WHOIS_JSON_TIMEOUT_MS = 8000;
const WHOISXML_TIMEOUT_MS = 15_000;

export type RegistrationMeta = {
  source: "whois-json" | "rdap" | "whoisxml";
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function parseLooseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** whois-json may return a plain object or an array of { data } from multi-step lookups. */
function normalizeWhoisJsonPayload(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first && typeof first === "object" && "data" in first) {
      const inner = (first as { data: unknown }).data;
      if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
    }
    if (first && typeof first === "object") return first as Record<string, unknown>;
    return null;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  return null;
}

function whoisRecordToSummary(hostname: string, o: Record<string, unknown>): RdapSummary {
  const registrarName = pickString(o, [
    "registrarName",
    "registrar",
    "sponsoringRegistrar",
    "registrarOrganization",
    "registrarUrl",
  ]);

  const expRaw = pickString(o, [
    "registryExpirydDate",
    "registryExpiryDate",
    "expirationDate",
    "expiresOn",
    "paidTill",
    "expiryDate",
  ]);
  const expiresAt = parseLooseDate(expRaw);

  const statusRaw = pickString(o, ["domainStatus", "status"]);
  const domainStatus = statusRaw
    ? statusRaw
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const events: { action: string; date: string }[] = [];
  const created = pickString(o, ["creationDate", "createdDate", "registeredOn", "creation date"]);
  const updated = pickString(o, ["updatedDate", "updated date", "lastUpdated"]);
  const cdt = parseLooseDate(created);
  if (cdt) events.push({ action: "registration", date: cdt.toISOString() });
  const udt = parseLooseDate(updated);
  if (udt) events.push({ action: "last update", date: udt.toISOString() });

  return {
    sourceUrl: `whois-json:${hostname}`,
    registrarName: registrarName ?? null,
    expiresAt,
    domainStatus,
    events,
  };
}

async function tryWhoisJson(hostname: string, onNote: (msg: string) => void): Promise<RdapSummary | null> {
  try {
    const raw = await Promise.race([
      whois(hostname, { follow: 2 }),
      new Promise<never>((_, rej) => {
        setTimeout(() => rej(new Error("timeout")), WHOIS_JSON_TIMEOUT_MS);
      }),
    ]);
    const o = normalizeWhoisJsonPayload(raw);
    if (!o || Object.keys(o).length === 0) {
      onNote("WHOIS (whois-json): empty result");
      return null;
    }
    return whoisRecordToSummary(hostname, o);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onNote(`WHOIS (whois-json): ${msg}`);
    return null;
  }
}

function readWhoisXmlExpiry(record: Record<string, unknown>): Date | null {
  const direct = pickString(record, ["expiresDate", "expiryDate"]);
  const d0 = parseLooseDate(direct);
  if (d0) return d0;
  const reg = record.registryData;
  if (reg && typeof reg === "object") {
    const r = reg as Record<string, unknown>;
    return parseLooseDate(pickString(r, ["expiresDate", "expiryDate", "registryExpiryDate"]));
  }
  return null;
}

async function tryWhoisXml(hostname: string, onNote: (msg: string) => void): Promise<RdapSummary | null> {
  const key = process.env.WHOISXML_API_KEY?.trim();
  if (!key) return null;
  try {
    const url = new URL("https://www.whoisxmlapi.com/whoisserver/WhoisService");
    url.searchParams.set("apiKey", key);
    url.searchParams.set("domainName", hostname);
    url.searchParams.set("outputFormat", "JSON");
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(WHOISXML_TIMEOUT_MS) });
    if (!res.ok) {
      onNote(`WHOIS (WhoisXML): HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const rec = body.WhoisRecord;
    if (!rec || typeof rec !== "object") {
      onNote("WHOIS (WhoisXML): missing WhoisRecord");
      return null;
    }
    const o = rec as Record<string, unknown>;
    const registrarName = pickString(o, ["registrarName", "registrar"]);
    const expiresAt = readWhoisXmlExpiry(o);
    const events: { action: string; date: string }[] = [];
    const created = parseLooseDate(pickString(o, ["createdDate", "creationDate"]));
    if (created) events.push({ action: "registration", date: created.toISOString() });
    const updated = parseLooseDate(pickString(o, ["updatedDate"]));
    if (updated) events.push({ action: "last update", date: updated.toISOString() });

    return {
      sourceUrl: "whoisxmlapi.com",
      registrarName: registrarName ?? null,
      expiresAt,
      domainStatus: [],
      events,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onNote(`WHOIS (WhoisXML): ${msg}`);
    return null;
  }
}

/**
 * Registration data: whois-json (8s cap) → RDAP (IANA bootstrap) → WhoisXML (WHOISXML_API_KEY).
 */
export async function fetchRegistrationSummary(
  hostname: string,
  onNote: (msg: string) => void
): Promise<{ summary: RdapSummary; meta: RegistrationMeta } | null> {
  const w = await tryWhoisJson(hostname, onNote);
  if (w && (w.registrarName || w.expiresAt || w.domainStatus.length || w.events.length)) {
    return { summary: w, meta: { source: "whois-json" } };
  }

  const rdap = await fetchRdapSummary(hostname);
  if (rdap) return { summary: rdap, meta: { source: "rdap" } };

  const x = await tryWhoisXml(hostname, onNote);
  if (x) return { summary: x, meta: { source: "whoisxml" } };

  return null;
}
