import type { DomainEnrichment } from "./types";
import { resolveDns } from "./dns";
import { fetchTlsSummary } from "./tls";
import { buildResolvedHosts } from "./resolvedHosts";
import { fetchRegistrationSummary } from "./registrationLookup";
import { discoverSubdomains } from "./subdomainDiscovery";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Gather registrar/expiry (whois-json → RDAP → WhoisXML), DNS, TLS, optional IP geo,
 * optional subdomain hints (HackerTarget hostsearch, Shodan, DNSDumpster), and per-hostname resolution.
 * Best-effort: partial data with `errors` when individual steps fail.
 */
export async function enrichDomain(hostname: string): Promise<DomainEnrichment> {
  const errors: string[] = [];
  const nowIso = new Date().toISOString();

  const [regResult, dns, ssl, subDiscovery] = await Promise.all([
    fetchRegistrationSummary(hostname, (msg) => errors.push(msg)).catch((e: Error) => {
      errors.push(`Registration: ${e.message}`);
      return null;
    }),
    resolveDns(hostname, (msg) => errors.push(msg)),
    fetchTlsSummary(hostname).catch(() => null),
    discoverSubdomains(hostname).catch((e: Error) => ({
      hostnames: [] as string[],
      sources: [] as string[],
      errors: [e.message],
    })),
  ]);

  for (const se of subDiscovery.errors) errors.push(se);

  const rdap = regResult?.summary ?? null;
  const registrationSource = regResult?.meta.source;

  let registrarName = rdap?.registrarName ?? null;
  let expiresAt = rdap?.expiresAt ?? null;

  if (expiresAt) {
    const expStr = expiresAt.toISOString().slice(0, 10);
    if (expStr === todayIsoDate()) {
      errors.push("RDAP expiry equals today - ignored as likely parse noise");
      expiresAt = null;
    }
  }

  const resolvedHosts = await buildResolvedHosts(hostname, dns, ssl, subDiscovery.hostnames);
  const apexLower = hostname.toLowerCase();
  const apexRow = resolvedHosts.find((r) => r.hostname.toLowerCase() === apexLower);
  const hostIp = apexRow?.ipv4[0] ?? dns.ipv4[0];
  const hostGeo = apexRow?.geo;
  const apexHost =
    hostGeo && (hostGeo.country || hostGeo.org || hostGeo.isp)
      ? {
          ip: hostIp,
          country: hostGeo.country,
          region: hostGeo.region,
          city: hostGeo.city,
          org: hostGeo.org,
          isp: hostGeo.isp,
        }
      : null;

  const enrichment: DomainEnrichment = {
    fetchedAt: nowIso,
    errors: errors.length ? errors : undefined,
    suggested: {
      registrarName,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    },
    rdap: rdap
      ? {
          sourceUrl: rdap.sourceUrl,
          domainStatus: rdap.domainStatus,
          registrarName,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          events: rdap.events,
        }
      : null,
    dns,
    ssl: ssl
      ? {
          validFrom: ssl.validFrom,
          validTo: ssl.validTo,
          subjectCN: ssl.subjectCN,
          issuerO: ssl.issuerO,
          issuerC: ssl.issuerC,
          fingerprint: ssl.fingerprint,
          serialNumber: ssl.serialNumber,
        }
      : null,
    host: apexHost,
    resolvedHosts: resolvedHosts.length ? resolvedHosts : undefined,
    enrichmentMetadata:
      registrationSource || subDiscovery.sources.length
        ? {
            registrationSource,
            subdomainSources: subDiscovery.sources.length ? subDiscovery.sources : undefined,
          }
        : undefined,
  };

  return enrichment;
}
