import type { Domain, DomainEnrichment, EnrichmentResolvedHost } from "../../types/domain";

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Human-readable months until date, or null if unknown / past. */
export function monthsUntilExpiryLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  if (end <= now) return null;
  const months = Math.round((end.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
  if (months <= 0) return "< 1 month";
  if (months === 1) return "1 month";
  return `${months} months`;
}

/** RDAP `eventAction` values vary by registry; match common patterns. */
export const REG_ACTIONS = /registration|^registered$|^creation$/i;
export const RENEW_ACTIONS = /last update|last changed|redelegation/i;

export function pickRdapEventDate(
  events: { action: string; date: string }[] | undefined,
  matcher: RegExp
): string | null {
  if (!events?.length) return null;
  for (const e of events) {
    if (matcher.test(e.action.trim())) return e.date;
  }
  return null;
}

export function sortRdapEventsDesc(events: { action: string; date: string }[]): { action: string; date: string }[] {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function effectiveExpiry(domain: Domain): string | null {
  return domain.expiresAt ?? domain.enrichment?.rdap?.expiresAt ?? domain.enrichment?.suggested?.expiresAt ?? null;
}

export function effectiveRegistrar(domain: Domain): string {
  return (
    domain.registrarName ??
    domain.enrichment?.rdap?.registrarName ??
    domain.enrichment?.suggested?.registrarName ??
    "-"
  );
}

/** New enrichments include per-hostname rows; older snapshots fall back to apex DNS + single `host` geo. */
export function resolvedHostsForDisplay(domain: Domain, enrichment: DomainEnrichment | null): EnrichmentResolvedHost[] {
  if (enrichment?.resolvedHosts?.length) return enrichment.resolvedHosts;
  return [
    {
      hostname: domain.hostname,
      ipv4: enrichment?.dns?.ipv4 ?? [],
      ipv6: enrichment?.dns?.ipv6 ?? [],
      geo: enrichment?.host
        ? {
            country: enrichment.host.country,
            region: enrichment.host.region,
            city: enrichment.host.city,
            org: enrichment.host.org,
            isp: enrichment.host.isp,
          }
        : null,
    },
  ];
}

export function formatHostAddresses(ipv4: string[], ipv6: string[]): string {
  const lines: string[] = [];
  for (const ip of ipv4) lines.push(ip);
  for (const ip of ipv6) lines.push(ip);
  return lines.length ? lines.join("\n") : "-";
}

export function formatGeoAddress(geo: EnrichmentResolvedHost["geo"]): string {
  if (!geo) return "-";
  const line = [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
  return line || "-";
}
