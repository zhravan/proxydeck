/**
 * Per-hostname DNS + optional geo (first IPv4) for names discovered under the apex zone.
 */
export type EnrichmentResolvedHost = {
  hostname: string;
  ipv4: string[];
  ipv6: string[];
  geo: {
    country?: string;
    region?: string;
    city?: string;
    org?: string;
    isp?: string;
  } | null;
};

/**
 * Serializable snapshot from public sources (RDAP, DNS, TLS, optional IP API).
 * Stored as JSON on `domains.enrichment`.
 */
export type DomainEnrichment = {
  fetchedAt: string;
  errors?: string[];
  suggested?: {
    registrarName: string | null;
    expiresAt: string | null;
  };
  rdap?: {
    sourceUrl?: string;
    domainStatus?: string[];
    registrarName?: string | null;
    expiresAt?: string | null;
    events?: { action: string; date: string }[];
  } | null;
  dns?: {
    ipv4: string[];
    ipv6: string[];
    mx: { exchange: string; priority: number }[];
    txt: string[];
    ns: string[];
  };
  ssl?: {
    validFrom?: string;
    validTo?: string;
    subjectCN?: string;
    issuerO?: string;
    issuerC?: string;
    fingerprint?: string;
    serialNumber?: string;
  } | null;
  host?: {
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
    org?: string;
    isp?: string;
  } | null;
  /** Apex + in-zone names from MX/NS/TLS/www; A/AAAA resolved per name; geo per first IPv4 when enabled. */
  resolvedHosts?: EnrichmentResolvedHost[];
  /** Which external services supplied registration / subdomain hints for this snapshot. */
  enrichmentMetadata?: {
    registrationSource?: "whois-json" | "rdap" | "whoisxml";
    subdomainSources?: string[];
  };
};
