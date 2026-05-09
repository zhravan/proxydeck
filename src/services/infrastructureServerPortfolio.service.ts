import type { ApiResult } from "../types/api";
import { dbFailureBody } from "../http/json";
import { parseCsv, stringifyCsv } from "../portfolio/csv";
import { normalizeHostname } from "../domains/hostname";
import type { InfrastructureServerInsert } from "../repositories/infrastructureServer.repository";
import {
  findInfrastructureServerByIdForUser,
  findInfrastructureServersByUserId,
  insertInfrastructureServer,
  updateInfrastructureServerForUser,
} from "../repositories/infrastructureServer.repository";
import { findDomainsByUserId } from "../repositories/domain.repository";

const MAX_ROWS = 5000;

const LIMITS = {
  providerMax: 64,
  nameMax: 200,
  regionMax: 128,
  roleMax: 128,
  environmentMax: 64,
  notesMax: 10000,
  urlMax: 2048,
  tagsMaxCount: 32,
  tagMaxLen: 64,
  linkedDomainIdsMax: 50,
} as const;

function unauthorized(): ApiResult {
  return { status: 401, body: { error: "Unauthorized" } };
}

function trimOrNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseHttpsUrl(raw: unknown, field: string): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${field} must be a string or null` };
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (t.length > LIMITS.urlMax) return { ok: false, error: `${field} is too long` };
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { ok: false, error: `${field} must be a valid URL` };
  }
  if (u.protocol !== "https:") {
    return { ok: false, error: `${field} must use https` };
  }
  return { ok: true, value: t };
}

function parseTags(raw: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "tags must be an array of strings" };
  if (raw.length > LIMITS.tagsMaxCount) {
    return { ok: false, error: `At most ${LIMITS.tagsMaxCount} tags` };
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return { ok: false, error: "Each tag must be a string" };
    const t = item.trim();
    if (t === "") continue;
    if (t.length > LIMITS.tagMaxLen) {
      return { ok: false, error: `Each tag must be at most ${LIMITS.tagMaxLen} characters` };
    }
    out.push(t);
  }
  return { ok: true, value: out };
}

function uuidOk(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function resolveLinkedDomainIds(
  userId: string,
  linkedDomainIds: unknown,
  linkedHostnames: unknown
): Promise<{ ok: true; value: string[] } | { ok: false; error: string }> {
  const domains = await findDomainsByUserId(userId);
  const allowed = new Set(domains.map((d) => d.id));
  const byHost = new Map(domains.map((d) => [normalizeHostname(d.hostname), d.id]));

  const ids: string[] = [];
  if (linkedDomainIds !== undefined && linkedDomainIds !== null) {
    if (!Array.isArray(linkedDomainIds)) return { ok: false, error: "linkedDomainIds must be an array of strings" };
    if (linkedDomainIds.length > LIMITS.linkedDomainIdsMax) {
      return { ok: false, error: `At most ${LIMITS.linkedDomainIdsMax} linked domains` };
    }
    for (const id of linkedDomainIds) {
      if (typeof id !== "string" || id.trim() === "") {
        return { ok: false, error: "Each linkedDomainId must be a non-empty string" };
      }
      const tid = id.trim();
      if (!allowed.has(tid)) {
        return { ok: false, error: "linkedDomainIds must reference your portfolio domains only" };
      }
      ids.push(tid);
    }
  }

  if (linkedHostnames !== undefined && linkedHostnames !== null) {
    if (!Array.isArray(linkedHostnames)) {
      return { ok: false, error: "linkedHostnames must be an array of strings" };
    }
    for (const h of linkedHostnames) {
      if (typeof h !== "string") return { ok: false, error: "Each linkedHostname must be a string" };
      const hn = normalizeHostname(h);
      if (!hn) continue;
      const did = byHost.get(hn);
      if (!did) {
        return { ok: false, error: `Unknown hostname in linkedHostnames: ${h}` };
      }
      ids.push(did);
    }
  }

  const unique = [...new Set(ids)];
  if (unique.length > LIMITS.linkedDomainIdsMax) {
    return { ok: false, error: `At most ${LIMITS.linkedDomainIdsMax} linked domains after merge` };
  }
  return { ok: true, value: unique };
}

type ServerImportRecord = {
  id: string;
  provider: string;
  region: string | null;
  name: string;
  role: string | null;
  environment: string | null;
  notes: string | null;
  consoleUrl: string | null;
  runbookUrl: string | null;
  tags: string[];
  linkedDomainIds: string[];
  createdAt: string;
  updatedAt: string;
};

async function rowToServerRecord(
  userId: string,
  row: unknown,
  index: number
): Promise<{ ok: true; value: ServerImportRecord } | { ok: false; error: string }> {
  const rowNum = index + 1;
  if (row === null || typeof row !== "object") {
    return { ok: false, error: `Row ${rowNum}: expected object` };
  }
  const o = row as Record<string, unknown>;

  const idRaw = o.id;
  const id =
    typeof idRaw === "string" && uuidOk(idRaw.trim()) ? idRaw.trim() : crypto.randomUUID();

  const providerRaw = o.provider;
  if (typeof providerRaw !== "string" || providerRaw.trim() === "") {
    return { ok: false, error: `Row ${rowNum}: provider is required` };
  }
  const provider = providerRaw.trim();
  if (provider.length > LIMITS.providerMax) {
    return { ok: false, error: `Row ${rowNum}: provider is too long` };
  }

  const nameRaw = o.name;
  if (typeof nameRaw !== "string" || nameRaw.trim() === "") {
    return { ok: false, error: `Row ${rowNum}: name is required` };
  }
  const name = nameRaw.trim();
  if (name.length > LIMITS.nameMax) {
    return { ok: false, error: `Row ${rowNum}: name is too long` };
  }

  const region = trimOrNull(typeof o.region === "string" ? o.region : null);
  if (region && region.length > LIMITS.regionMax) {
    return { ok: false, error: `Row ${rowNum}: region is too long` };
  }

  const role = trimOrNull(typeof o.role === "string" ? o.role : null);
  if (role && role.length > LIMITS.roleMax) {
    return { ok: false, error: `Row ${rowNum}: role is too long` };
  }

  const environment = trimOrNull(typeof o.environment === "string" ? o.environment : null);
  if (environment && environment.length > LIMITS.environmentMax) {
    return { ok: false, error: `Row ${rowNum}: environment is too long` };
  }

  let notes: string | null = null;
  if ("notes" in o && o.notes !== undefined && o.notes !== null) {
    if (typeof o.notes !== "string") return { ok: false, error: `Row ${rowNum}: notes must be a string or null` };
    notes = trimOrNull(o.notes);
  }
  if (notes && notes.length > LIMITS.notesMax) {
    return { ok: false, error: `Row ${rowNum}: notes is too long` };
  }

  const consoleParsed = parseHttpsUrl(o.consoleUrl, "consoleUrl");
  if (!consoleParsed.ok) return { ok: false, error: `Row ${rowNum}: ${consoleParsed.error}` };

  const runbookParsed = parseHttpsUrl(o.runbookUrl, "runbookUrl");
  if (!runbookParsed.ok) return { ok: false, error: `Row ${rowNum}: ${runbookParsed.error}` };

  const tagsParsed = parseTags(o.tags);
  if (!tagsParsed.ok) return { ok: false, error: `Row ${rowNum}: ${tagsParsed.error}` };

  const linkedParsed = await resolveLinkedDomainIds(userId, o.linkedDomainIds, o.linkedHostnames);
  if (!linkedParsed.ok) return { ok: false, error: `Row ${rowNum}: ${linkedParsed.error}` };

  const now = new Date().toISOString();
  const createdAt =
    typeof o.createdAt === "string" && !Number.isNaN(new Date(o.createdAt).getTime())
      ? new Date(o.createdAt).toISOString()
      : now;
  const updatedAt =
    typeof o.updatedAt === "string" && !Number.isNaN(new Date(o.updatedAt).getTime())
      ? new Date(o.updatedAt).toISOString()
      : now;

  return {
    ok: true,
    value: {
      id,
      provider,
      region,
      name,
      role,
      environment,
      notes,
      consoleUrl: consoleParsed.value,
      runbookUrl: runbookParsed.value,
      tags: tagsParsed.value,
      linkedDomainIds: linkedParsed.value,
      createdAt,
      updatedAt,
    },
  };
}

export async function exportInfrastructureServersResponse(
  userId: string | null,
  formatRaw: string | null
): Promise<Response | ApiResult> {
  if (!userId) return unauthorized();
  const format = (formatRaw ?? "json").toLowerCase();
  if (format !== "json" && format !== "csv") {
    return { status: 400, body: { error: "Use ?format=json or ?format=csv" } };
  }

  try {
    const [servers, domains] = await Promise.all([
      findInfrastructureServersByUserId(userId),
      findDomainsByUserId(userId),
    ]);
    const domainHostById = new Map(domains.map((d) => [d.id, d.hostname]));
    const exportedAt = new Date().toISOString();

    const serversOut = servers.map((s) => {
      const linked = Array.isArray(s.linkedDomainIds) ? s.linkedDomainIds : [];
      const linkedHostnames = linked
        .map((id) => domainHostById.get(id))
        .filter((h): h is string => !!h);
      return {
        id: s.id,
        provider: s.provider,
        region: s.region,
        name: s.name,
        role: s.role,
        environment: s.environment,
        notes: s.notes,
        consoleUrl: s.consoleUrl,
        runbookUrl: s.runbookUrl,
        tags: Array.isArray(s.tags) ? s.tags : [],
        linkedDomainIds: linked,
        linkedHostnames,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });

    const payload = {
      version: 1,
      kind: "servers" as const,
      exportedAt,
      servers: serversOut,
    };

    if (format === "json") {
      const filename = `servers-export-${exportedAt.slice(0, 10)}.json`;
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
      "provider",
      "region",
      "name",
      "role",
      "environment",
      "notes",
      "consoleUrl",
      "runbookUrl",
      "tagsJson",
      "linkedDomainIdsJson",
      "linkedHostnames",
      "createdAt",
      "updatedAt",
    ];
    const csvRows: string[][] = [header];
    for (const s of serversOut) {
      csvRows.push([
        s.id,
        s.provider,
        s.region ?? "",
        s.name,
        s.role ?? "",
        s.environment ?? "",
        s.notes ?? "",
        s.consoleUrl ?? "",
        s.runbookUrl ?? "",
        JSON.stringify(s.tags),
        JSON.stringify(s.linkedDomainIds),
        s.linkedHostnames.join("|"),
        s.createdAt,
        s.updatedAt,
      ]);
    }
    const csv = stringifyCsv(csvRows);
    const filename = `servers-export-${exportedAt.slice(0, 10)}.csv`;
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
  onDuplicateId?: unknown;
  servers?: unknown;
  csv?: unknown;
};

export async function importInfrastructureServersPortfolio(userId: string | null, body: unknown): Promise<ApiResult> {
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
  const dupPolicy =
    b.onDuplicateId === "skip" || b.onDuplicateId === "update" ? b.onDuplicateId : "error";

  let records: ServerImportRecord[] = [];

  if (format === "json") {
    if (!Array.isArray(b.servers)) {
      return { status: 400, body: { error: "servers must be an array" } };
    }
    if (b.servers.length > MAX_ROWS) {
      return { status: 400, body: { error: `At most ${MAX_ROWS} servers per import` } };
    }
    for (let i = 0; i < b.servers.length; i++) {
      const parsed = await rowToServerRecord(userId, b.servers[i], i);
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
    const colProv = idx("provider");
    const colRegion = idx("region");
    const colName = idx("name");
    const colRole = idx("role");
    const colEnv = idx("environment");
    const colNotes = idx("notes");
    const colConsole = idx("consoleurl");
    const colRunbook = idx("runbookurl");
    const colTags = idx("tagsjson");
    const colLinked = idx("linkeddomainidsjson");
    const colLinkedHosts = idx("linkedhostnames");
    const colCreated = idx("createdat");
    const colUpdated = idx("updatedat");

    if (colProv < 0 || colName < 0) {
      return { status: 400, body: { error: 'CSV header must include "provider" and "name" columns' } };
    }

    const dataRows = table.slice(1);
    if (dataRows.length > MAX_ROWS) {
      return { status: 400, body: { error: `At most ${MAX_ROWS} servers per import` } };
    }

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r]!;
      const cell = (c: number) => (c >= 0 && c < row.length ? row[c] : "");

      let tags: unknown = [];
      if (colTags >= 0 && cell(colTags).trim() !== "") {
        try {
          tags = JSON.parse(cell(colTags));
        } catch {
          return { status: 400, body: { error: `Row ${r + 2}: tagsJson is not valid JSON` } };
        }
      }

      let linkedDomainIds: unknown = [];
      if (colLinked >= 0 && cell(colLinked).trim() !== "") {
        try {
          linkedDomainIds = JSON.parse(cell(colLinked));
        } catch {
          return { status: 400, body: { error: `Row ${r + 2}: linkedDomainIdsJson is not valid JSON` } };
        }
      }

      let linkedHostnames: unknown = [];
      if (colLinkedHosts >= 0 && cell(colLinkedHosts).trim() !== "") {
        linkedHostnames = cell(colLinkedHosts)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const obj: Record<string, unknown> = {
        id: colId >= 0 ? cell(colId) : "",
        provider: cell(colProv),
        region: colRegion >= 0 ? cell(colRegion) || null : null,
        name: cell(colName),
        role: colRole >= 0 ? cell(colRole) || null : null,
        environment: colEnv >= 0 ? cell(colEnv) || null : null,
        notes: colNotes >= 0 ? cell(colNotes) || null : null,
        consoleUrl: colConsole >= 0 ? cell(colConsole) || null : null,
        runbookUrl: colRunbook >= 0 ? cell(colRunbook) || null : null,
        tags,
        linkedDomainIds,
        linkedHostnames,
        createdAt: colCreated >= 0 ? cell(colCreated) || null : null,
        updatedAt: colUpdated >= 0 ? cell(colUpdated) || null : null,
      };

      const parsed = await rowToServerRecord(userId, obj, r);
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
      const existing = await findInfrastructureServerByIdForUser(rec.id, userId);

      if (existing) {
        if (dupPolicy === "skip") {
          skipped += 1;
          continue;
        }
        if (dupPolicy === "error") {
          errors.push({ row: rowNum, message: "Server id already exists" });
          continue;
        }
        if (dryRun) {
          updated += 1;
          continue;
        }
        const now = new Date();
        const updatedRow = await updateInfrastructureServerForUser(rec.id, userId, {
          provider: rec.provider,
          region: rec.region,
          name: rec.name,
          role: rec.role,
          environment: rec.environment,
          notes: rec.notes,
          consoleUrl: rec.consoleUrl,
          runbookUrl: rec.runbookUrl,
          tags: rec.tags,
          linkedDomainIds: rec.linkedDomainIds,
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
      const insert: InfrastructureServerInsert = {
        id: rec.id,
        userId,
        provider: rec.provider,
        region: rec.region,
        name: rec.name,
        role: rec.role,
        environment: rec.environment,
        notes: rec.notes,
        consoleUrl: rec.consoleUrl,
        runbookUrl: rec.runbookUrl,
        tags: rec.tags,
        linkedDomainIds: rec.linkedDomainIds,
        createdAt: rec.createdAt ? new Date(rec.createdAt) : now,
        updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : now,
      };

      const inserted = await insertInfrastructureServer(insert);
      if (!inserted) {
        errors.push({ row: rowNum, message: "Insert failed" });
        continue;
      }
      created += 1;
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
