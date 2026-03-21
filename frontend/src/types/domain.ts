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
};

export type Domain = {
  id: string;
  userId: string;
  hostname: string;
  registrarName: string | null;
  expiresAt: string | null;
  notes: string | null;
  enrichment: DomainEnrichment | null;
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
