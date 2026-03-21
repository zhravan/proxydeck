import type { DomainEnrichment } from "../domains/enrichment/types";
import type { DomainRow } from "../repositories/domain.repository";

export function domainRowToJson(row: DomainRow) {
  return {
    id: row.id,
    userId: row.userId,
    hostname: row.hostname,
    registrarName: row.registrarName,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    notes: row.notes,
    enrichment: row.enrichment ?? null,
    enrichedAt: row.enrichedAt ? row.enrichedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function enrichmentToStorable(e: DomainEnrichment): DomainEnrichment {
  return JSON.parse(JSON.stringify(e, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) as DomainEnrichment;
}

export function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

export function parseOptionalExpiresAt(
  value: unknown
): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  if (typeof value !== "string") return { ok: false, error: "expiresAt must be an ISO date string or null" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { ok: false, error: "expiresAt is not a valid date" };
  return { ok: true, date: d };
}
