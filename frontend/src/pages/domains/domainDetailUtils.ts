import type { Domain, DomainEnrichment } from "../../types/domain";

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
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

export function buildHostnameOverview(hostname: string, enrichment: DomainEnrichment | null): string[] {
  const base = hostname.toLowerCase();
  const seen = new Set<string>();
  const add = (h: string) => {
    const t = h.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.add(key);
  };

  add(hostname);

  const sslCn = enrichment?.ssl?.subjectCN?.trim();
  if (sslCn) {
    const cn = sslCn.toLowerCase();
    if ((cn === base || cn.endsWith(`.${base}`)) && cn !== base) add(sslCn);
  }

  for (const m of enrichment?.dns?.mx ?? []) {
    const ex = m.exchange.replace(/\.$/, "").trim();
    if (!ex) continue;
    const low = ex.toLowerCase();
    if (low === base || low.endsWith(`.${base}`)) add(ex);
  }

  return [...seen];
}

export type TargetRow = { name: string; recordType: string; value: string };

export function buildTargetRows(hostname: string, enrichment: DomainEnrichment | null): TargetRow[] {
  const rows: TargetRow[] = [];
  const dns = enrichment?.dns;
  if (dns) {
    for (const ip of dns.ipv4) rows.push({ name: hostname, recordType: "A", value: ip });
    for (const ip of dns.ipv6) rows.push({ name: hostname, recordType: "AAAA", value: ip });
  }
  if (!rows.length) {
    rows.push({ name: hostname, recordType: "—", value: "No A/AAAA records in snapshot" });
  }
  return rows;
}

export function effectiveExpiry(domain: Domain): string | null {
  return domain.expiresAt ?? domain.enrichment?.rdap?.expiresAt ?? domain.enrichment?.suggested?.expiresAt ?? null;
}

export function effectiveRegistrar(domain: Domain): string {
  return (
    domain.registrarName ??
    domain.enrichment?.rdap?.registrarName ??
    domain.enrichment?.suggested?.registrarName ??
    "—"
  );
}
