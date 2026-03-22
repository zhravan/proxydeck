/**
 * Optional IP geolocation. Off by default — set DOMAIN_ENRICH_GEO=1 to enable.
 * Uses ip-api.com free HTTP endpoint (see their fair-use policy).
 */

export type IpApiSummary = {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  org?: string;
  isp?: string;
};

function geoEnabled(): boolean {
  const v = process.env.DOMAIN_ENRICH_GEO?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function fetchIpGeo(ip: string): Promise<IpApiSummary | null> {
  if (!geoEnabled()) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed.includes(":")) {
    /* ip-api IPv6 may need different handling; skip for simplicity */
    return null;
  }
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(trimmed)}?fields=status,message,country,regionName,city,isp,org,query`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status !== "success") return null;
    return {
      ip: typeof data.query === "string" ? data.query : trimmed,
      country: typeof data.country === "string" ? data.country : undefined,
      region: typeof data.regionName === "string" ? data.regionName : undefined,
      city: typeof data.city === "string" ? data.city : undefined,
      org: typeof data.org === "string" ? data.org : undefined,
      isp: typeof data.isp === "string" ? data.isp : undefined,
    };
  } catch {
    return null;
  }
}
