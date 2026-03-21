import type { DomainEnrichment } from "./types";
import { resolveDns } from "./dns";
import { fetchRdapSummary } from "./rdap";
import { fetchTlsSummary } from "./tls";
import { fetchIpGeo } from "./geo";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Gather registrar/expiry (RDAP), DNS, TLS, and optional IP metadata for a hostname.
 * Best-effort: partial data with `errors` when individual steps fail.
 */
export async function enrichDomain(hostname: string): Promise<DomainEnrichment> {
  const errors: string[] = [];
  const nowIso = new Date().toISOString();

  const [rdap, dns, ssl] = await Promise.all([
    fetchRdapSummary(hostname).catch((e: Error) => {
      errors.push(`RDAP: ${e.message}`);
      return null;
    }),
    resolveDns(hostname, (msg) => errors.push(msg)),
    fetchTlsSummary(hostname).catch(() => null),
  ]);

  let registrarName = rdap?.registrarName ?? null;
  let expiresAt = rdap?.expiresAt ?? null;

  if (expiresAt) {
    const expStr = expiresAt.toISOString().slice(0, 10);
    if (expStr === todayIsoDate()) {
      errors.push("RDAP expiry equals today — ignored as likely parse noise");
      expiresAt = null;
    }
  }

  const firstV4 = dns.ipv4[0];
  const host = firstV4 ? await fetchIpGeo(firstV4) : null;

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
    host: host && (host.country || host.org || host.isp) ? host : null,
  };

  return enrichment;
}
