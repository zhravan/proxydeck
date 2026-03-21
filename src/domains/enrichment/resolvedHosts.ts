import type { DnsBundle } from "./dns";
import { resolveHostRecords } from "./dns";
import { fetchIpGeo } from "./geo";
import type { EnrichmentResolvedHost } from "./types";

const MAX_RESOLVED_HOSTNAMES = 50;
const GEO_STAGGER_MS = 160;

function geoEnabled(): boolean {
  const v = process.env.DOMAIN_ENRICH_GEO?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
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

/**
 * Hostnames under the registrable apex: apex, www, in-zone MX/NS, TLS CN when applicable.
 * Does not discover arbitrary third-level names without DNS hints.
 */
export function collectHostnameCandidates(
  apex: string,
  dns: DnsBundle,
  ssl: { subjectCN?: string } | null,
  discovered: string[] = []
): string[] {
  const seen = new Set<string>();
  const add = (raw: string) => {
    const n = normalizeHostLabel(raw);
    if (!n || !isUnderZone(n, apex)) return;
    seen.add(n);
  };

  for (const d of discovered) add(d);

  add(apex);
  add(`www.${apex}`);

  for (const m of dns.mx) add(m.exchange);
  for (const ns of dns.ns) add(ns);
  if (ssl?.subjectCN) add(ssl.subjectCN);

  const list = [...seen];
  const al = apex.toLowerCase();
  list.sort((a, b) => {
    if (a === al) return -1;
    if (b === al) return 1;
    return a.localeCompare(b);
  });
  return list.slice(0, MAX_RESOLVED_HOSTNAMES);
}

function geoToRow(
  raw: Awaited<ReturnType<typeof fetchIpGeo>>
): EnrichmentResolvedHost["geo"] {
  if (!raw) return null;
  if (!raw.country && !raw.org && !raw.isp && !raw.city && !raw.region) return null;
  return {
    country: raw.country,
    region: raw.region,
    city: raw.city,
    org: raw.org,
    isp: raw.isp,
  };
}

export async function buildResolvedHosts(
  apex: string,
  dns: DnsBundle,
  ssl: { subjectCN?: string } | null,
  discoveredHostnames: string[] = []
): Promise<EnrichmentResolvedHost[]> {
  const names = collectHostnameCandidates(apex, dns, ssl, discoveredHostnames);
  const out: EnrichmentResolvedHost[] = [];

  for (const hostname of names) {
    const { ipv4, ipv6 } = await resolveHostRecords(hostname);
    const firstV4 = ipv4[0];
    const rawGeo = firstV4 ? await fetchIpGeo(firstV4) : null;
    out.push({
      hostname,
      ipv4,
      ipv6,
      geo: geoToRow(rawGeo),
    });
    if (geoEnabled() && firstV4) {
      await new Promise((r) => setTimeout(r, GEO_STAGGER_MS));
    }
  }

  return out;
}
