import type { ApiResult } from "../types/api";
import { dbFailureBody } from "../http/json";
import { parseCsv, stringifyCsv } from "../portfolio/csv";
import { isValidHostname, normalizeHostname, validateNotes, validateRegistrarName } from "../domains/hostname";
import { enrichmentToStorable, isPgUniqueViolation, parseOptionalExpiresAt } from "../models/domain.model";
import type { DomainInsert } from "../repositories/domain.repository";
import {
  findDomainByHostnameForUser,
  findDomainByIdForUser,
  findDomainsByUserId,
  insertDomain,
  updateDomainForUser,
} from "../repositories/domain.repository";
const MAX_ROWS = 5000;

export type DuplicateHostnamePolicy = "error" | "skip" | "update";

export type DomainExportRecord = {
  id: string;
  hostname: string;
  registrarName: string | null;
  expiresAt: string | null;
  notes: string | null;
  enrichment: DomainInsert["enrichment"];
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function unauthorized(): ApiResult {
  return { status: 401, body: { error: "Unauthorized" } };
}

function uuidOk(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function parseIsoOptional(raw: unknown): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, date: null };
  if (typeof raw !== "string") return { ok: false, error: "Must be an ISO date string or empty" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date" };
  return { ok: true, date: d };
}

function rowToExportRecord(row: unknown, index: number):
  | { ok: true; value: DomainExportRecord }
  | { ok: false; error: string } {
  const rowNum = index + 1;
  if (row === null || typeof row !== "object") {
    return { ok: false, error: `Row ${rowNum}: expected object` };
  }
  const o = row as Record<string, unknown>;

  const idRaw = o.id;
  const id = typeof idRaw === "string" && uuidOk(idRaw.trim()) ? idRaw.trim() : "";

  const hostnameRaw = o.hostname;
  if (typeof hostnameRaw !== "string") {
    return { ok: false, error: `Row ${rowNum}: hostname is required` };
  }
  const hostname = normalizeHostname(hostnameRaw);
  if (!isValidHostname(hostname)) {
    return { ok: false, error: `Row ${rowNum}: invalid hostname` };
  }

  const registrarRaw = o.registrarName;
  const registrarName =
    registrarRaw === undefined || registrarRaw === null
      ? null
      : typeof registrarRaw === "string"
        ? registrarRaw
        : undefined;
  if (registrarName !== undefined && registrarName !== null && typeof registrarName !== "string") {
    return { ok: false, error: `Row ${rowNum}: registrarName must be a string or null` };
  }
  const regErr = validateRegistrarName(registrarName ?? null);
  if (regErr) return { ok: false, error: `Row ${rowNum}: ${regErr}` };

  const notesRaw = o.notes;
  if (notesRaw !== undefined && notesRaw !== null && typeof notesRaw !== "string") {
    return { ok: false, error: `Row ${rowNum}: notes must be a string or null` };
  }
  const notesErr = validateNotes(typeof notesRaw === "string" ? notesRaw : null);
  if (notesErr) return { ok: false, error: `Row ${rowNum}: ${notesErr}` };

  const expiresParsed = parseOptionalExpiresAt(o.expiresAt);
  if (!expiresParsed.ok) return { ok: false, error: `Row ${rowNum}: ${expiresParsed.error}` };

  let enrichment: DomainInsert["enrichment"] = null;
  if ("enrichment" in o && o.enrichment !== undefined && o.enrichment !== null) {
    try {
      enrichment = enrichmentToStorable(o.enrichment as never);
    } catch {
      return { ok: false, error: `Row ${rowNum}: enrichment is not valid JSON` };
    }
  }

  const enrichedParsed = parseIsoOptional(o.enrichedAt);
  if (!enrichedParsed.ok) return { ok: false, error: `Row ${rowNum}: ${enrichedParsed.error}` };

  const createdParsed = parseIsoOptional(o.createdAt);
  if (!createdParsed.ok) return { ok: false, error: `Row ${rowNum}: createdAt ${createdParsed.error}` };

  const updatedParsed = parseIsoOptional(o.updatedAt);
  if (!updatedParsed.ok) return { ok: false, error: `Row ${rowNum}: updatedAt ${updatedParsed.error}` };

  const now = new Date().toISOString();
  return {
    ok: true,
    value: {
      id: id || crypto.randomUUID(),
      hostname,
      registrarName:
        registrarName === undefined || registrarName === null || registrarName.trim() === ""
          ? null
          : registrarName.trim(),
      expiresAt: expiresParsed.date ? expiresParsed.date.toISOString() : null,
      notes:
        notesRaw === undefined || notesRaw === null || notesRaw === ""
          ? null
          : (notesRaw as string),
      enrichment,
      enrichedAt: enrichedParsed.date ? enrichedParsed.date.toISOString() : null,
      createdAt: createdParsed.date ? createdParsed.date.toISOString() : now,
      updatedAt: updatedParsed.date ? updatedParsed.date.toISOString() : now,
    },
  };
}

export async function exportDomainsPortfolioResponse(
  userId: string | null,
  formatRaw: string | null
): Promise<Response | ApiResult> {
  if (!userId) return unauthorized();
  const format = (formatRaw ?? "json").toLowerCase();
  if (format !== "json" && format !== "csv") {
    return { status: 400, body: { error: "Use ?format=json or ?format=csv" } };
  }

  try {
    const rows = await findDomainsByUserId(userId);
    const exportedAt = new Date().toISOString();
    const payload = {
      version: 1,
      kind: "domains" as const,
      exportedAt,
      domains: rows.map((r) => ({
        id: r.id,
        hostname: r.hostname,
        registrarName: r.registrarName,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        notes: r.notes,
        enrichment: r.enrichment ?? null,
        enrichedAt: r.enrichedAt ? r.enrichedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };

    if (format === "json") {
      const filename = `domains-export-${exportedAt.slice(0, 10)}.json`;
      return new Response(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const header = [
      "id",
      "hostname",
      "registrarName",
      "expiresAt",
      "notes",
      "enrichedAt",
      "createdAt",
      "updatedAt",
      "enrichmentJson",
    ];
    const csvRows: string[][] = [header];
    for (const d of payload.domains) {
      csvRows.push([
        d.id,
        d.hostname,
        d.registrarName ?? "",
        d.expiresAt ?? "",
        d.notes ?? "",
        d.enrichedAt ?? "",
        d.createdAt,
        d.updatedAt,
        d.enrichment ? JSON.stringify(d.enrichment) : "",
      ]);
    }
    const csv = stringifyCsv(csvRows);
    const filename = `domains-export-${exportedAt.slice(0, 10)}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return dbFailureBody(e);
  }
}

type ImportBody = {
  format?: unknown;
  dryRun?: unknown;
  onDuplicateHostname?: unknown;
  domains?: unknown;
  csv?: unknown;
};

export async function importDomainsPortfolio(userId: string | null, body: unknown): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (body === null || typeof body !== "object") {
    return { status: 400, body: { error: "Expected application/json body" } };
  }
  const b = body as ImportBody;
  const format = typeof b.format === "string" ? b.format.toLowerCase() : "";
  if (format !== "json" && format !== "csv") {
    return { status: 400, body: { error: "format must be json or csv" } };
  }
  const dryRun = b.dryRun === true;
  const dupPolicy: DuplicateHostnamePolicy =
    b.onDuplicateHostname === "skip" || b.onDuplicateHostname === "update" ? b.onDuplicateHostname : "error";

  let records: DomainExportRecord[] = [];

  if (format === "json") {
    if (!Array.isArray(b.domains)) {
      return { status: 400, body: { error: "domains must be an array" } };
    }
    if (b.domains.length > MAX_ROWS) {
      return { status: 400, body: { error: `At most ${MAX_ROWS} domains per import` } };
    }
    for (let i = 0; i < b.domains.length; i++) {
      const parsed = rowToExportRecord(b.domains[i], i);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      records.push(parsed.value);
    }
  } else {
    if (typeof b.csv !== "string") {
      return { status: 400, body: { error: "csv must be a string when format is csv" } };
    }
    const table = parseCsv(b.csv.trim());
    if (table.length < 2) {
      return { status: 400, body: { error: "CSV must include a header row and at least one data row" } };
    }
    const header = table[0]!.map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    const colId = idx("id");
    const colHost = idx("hostname");
    const colReg = idx("registrarname");
    const colExp = idx("expiresat");
    const colNotes = idx("notes");
    const colEnrAt = idx("enrichedat");
    const colCreated = idx("createdat");
    const colUpdated = idx("updatedat");
    const colEnrJson = idx("enrichmentjson");

    if (colHost < 0) {
      return { status: 400, body: { error: 'CSV header must include a "hostname" column' } };
    }

    const dataRows = table.slice(1);
    if (dataRows.length > MAX_ROWS) {
      return { status: 400, body: { error: `At most ${MAX_ROWS} domains per import` } };
    }

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r]!;
      const cell = (c: number) => (c >= 0 && c < row.length ? row[c] : "");

      let enrichment: unknown = null;
      if (colEnrJson >= 0 && cell(colEnrJson).trim() !== "") {
        try {
          enrichment = JSON.parse(cell(colEnrJson));
        } catch {
          return { status: 400, body: { error: `Row ${r + 2}: enrichmentJson is not valid JSON` } };
        }
      }

      const obj: Record<string, unknown> = {
        id: colId >= 0 ? cell(colId) : "",
        hostname: cell(colHost),
        registrarName: colReg >= 0 ? cell(colReg) || null : null,
        expiresAt: colExp >= 0 ? cell(colExp) || null : null,
        notes: colNotes >= 0 ? cell(colNotes) || null : null,
        enrichedAt: colEnrAt >= 0 ? cell(colEnrAt) || null : null,
        createdAt: colCreated >= 0 ? cell(colCreated) || null : null,
        updatedAt: colUpdated >= 0 ? cell(colUpdated) || null : null,
        enrichment,
      };

      const parsed = rowToExportRecord(obj, r);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      records.push(parsed.value);
    }
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]!;
      const rowNum = i + 1;
      const byHostname = await findDomainByHostnameForUser(rec.hostname, userId);
      let byId = rec.id ? await findDomainByIdForUser(rec.id, userId) : undefined;

      if (byId && byHostname && byId.id !== byHostname.id) {
        errors.push({
          row: rowNum,
          message: "Import id and hostname refer to different existing records",
        });
        continue;
      }

      const existing = byId ?? byHostname;

      if (existing) {
        if (dupPolicy === "skip") {
          skipped += 1;
          continue;
        }
        if (dupPolicy === "error") {
          errors.push({ row: rowNum, message: "Duplicate hostname (or id) already exists" });
          continue;
        }
        if (dryRun) {
          updated += 1;
          continue;
        }
        const now = new Date();
        const updatedRow = await updateDomainForUser(existing.id, userId, {
          hostname: rec.hostname,
          registrarName: rec.registrarName,
          notes: rec.notes,
          expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : null,
          enrichment: rec.enrichment ?? null,
          enrichedAt: rec.enrichedAt ? new Date(rec.enrichedAt) : null,
          updatedAt: now,
        });
        if (!updatedRow) {
          errors.push({ row: rowNum, message: "Update failed" });
          continue;
        }
        updated += 1;
        continue;
      }

      if (dryRun) {
        created += 1;
        continue;
      }

      const now = new Date();
      try {
        const inserted = await insertDomain({
          id: rec.id,
          userId,
          hostname: rec.hostname,
          registrarName: rec.registrarName,
          expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : null,
          notes: rec.notes,
          enrichment: rec.enrichment ?? null,
          enrichedAt: rec.enrichedAt ? new Date(rec.enrichedAt) : null,
          createdAt: rec.createdAt ? new Date(rec.createdAt) : now,
          updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : now,
        });
        if (!inserted) {
          errors.push({ row: rowNum, message: "Insert failed" });
          continue;
        }
        created += 1;
      } catch (e) {
        if (isPgUniqueViolation(e)) {
          errors.push({ row: rowNum, message: "Duplicate hostname or id" });
        } else {
          const msg = e instanceof Error ? e.message : "Database error";
          errors.push({ row: rowNum, message: msg });
        }
      }
    }

    return {
      status: 200,
      body: {
        dryRun,
        created,
        updated,
        skipped,
        errors,
      },
    };
  } catch (e) {
    return dbFailureBody(e);
  }
}
