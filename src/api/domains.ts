import { Elysia } from "elysia";
import { and, asc, eq } from "drizzle-orm";
import { getSession } from "../auth/middleware";
import { db } from "../db/client";
import { domains } from "../db/schema";
import {
  hostnameLimits,
  isValidHostname,
  normalizeHostname,
  validateNotes,
  validateRegistrarName,
} from "../domains/hostname";
import type { DomainEnrichment } from "../domains/enrichment/types";
import { enrichDomain } from "../domains/enrichment/service";
import { rateLimitDomainLookup } from "../domains/enrichment/ratelimit";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getUserId(session: Awaited<ReturnType<typeof getSession>>): string | null {
  if (!session?.user || typeof session.user !== "object" || !("id" in session.user)) return null;
  const id = (session.user as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

/** Clone for JSON/Postgres — avoids BigInt etc. breaking serialization. */
function enrichmentToStorable(e: DomainEnrichment): DomainEnrichment {
  return JSON.parse(JSON.stringify(e, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) as DomainEnrichment;
}

function dbFailureResponse(err: unknown): Response {
  const msg = err instanceof Error ? err.message : "Database error";
  const migrateHint =
    /column|does not exist|relation .domains|undefined_(column|table)/i.test(msg)
      ? " Run `bun run db:migrate` with the same DATABASE_URL the app uses."
      : "";
  return jsonResponse({ error: `${msg}${migrateHint}` }, 500);
}

function parseOptionalDate(value: unknown): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  if (typeof value !== "string") return { ok: false, error: "expiresAt must be an ISO date string or null" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { ok: false, error: "expiresAt is not a valid date" };
  return { ok: true, date: d };
}

type DomainRow = typeof domains.$inferSelect;

function rowToJson(row: DomainRow) {
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

async function readJsonBody(request: Request): Promise<unknown | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const domainRoutes = new Elysia().group("/api/domains", (app) =>
  app
    .get("/", async ({ request }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      try {
        const rows = await db
          .select()
          .from(domains)
          .where(eq(domains.userId, userId))
          .orderBy(asc(domains.hostname));

        return jsonResponse({ domains: rows.map(rowToJson) });
      } catch (e) {
        return dbFailureResponse(e);
      }
    })
    .get("/lookup", async ({ request }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const url = new URL(request.url);
      const raw = url.searchParams.get("hostname") ?? url.searchParams.get("domain") ?? "";
      const hostname = normalizeHostname(raw);
      if (!hostname || !isValidHostname(hostname)) {
        return jsonResponse(
          { error: "Query ?hostname= (or ?domain=) must be a valid hostname" },
          400
        );
      }

      const limited = rateLimitDomainLookup(userId);
      if (!limited.ok) {
        return jsonResponse(
          { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
          429
        );
      }

      try {
        const enrichment = await enrichDomain(hostname);
        return jsonResponse({ enrichment });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lookup failed";
        return jsonResponse({ error: `Public lookup failed: ${msg}` }, 503);
      }
    })
    .post("/", async ({ request }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const body = await readJsonBody(request);
      if (body === null || typeof body !== "object" || body === null) {
        return jsonResponse({ error: "Expected application/json body" }, 400);
      }

      const hostnameRaw = "hostname" in body ? (body as { hostname: unknown }).hostname : undefined;
      if (typeof hostnameRaw !== "string") {
        return jsonResponse({ error: "hostname is required and must be a string" }, 400);
      }
      const hostname = normalizeHostname(hostnameRaw);
      if (!isValidHostname(hostname)) {
        return jsonResponse(
          {
            error: "Invalid hostname",
            limits: { maxLength: hostnameLimits.hostnameMaxLen },
          },
          400
        );
      }

      const registrarRaw =
        "registrarName" in body ? (body as { registrarName: unknown }).registrarName : undefined;
      const registrarName =
        typeof registrarRaw === "string" || registrarRaw === null || registrarRaw === undefined
          ? (registrarRaw as string | null | undefined)
          : undefined;
      if (registrarName !== undefined && registrarName !== null && typeof registrarName !== "string") {
        return jsonResponse({ error: "registrarName must be a string or null" }, 400);
      }
      const regErr = validateRegistrarName(registrarName ?? null);
      if (regErr) return jsonResponse({ error: regErr }, 400);

      const notesRaw = "notes" in body ? (body as { notes: unknown }).notes : undefined;
      if (notesRaw !== undefined && notesRaw !== null && typeof notesRaw !== "string") {
        return jsonResponse({ error: "notes must be a string or null" }, 400);
      }
      const notesErr = validateNotes(typeof notesRaw === "string" ? notesRaw : null);
      if (notesErr) return jsonResponse({ error: notesErr }, 400);

      const expiresParsed = parseOptionalDate(
        "expiresAt" in body ? (body as { expiresAt: unknown }).expiresAt : undefined
      );
      if (!expiresParsed.ok) return jsonResponse({ error: expiresParsed.error }, 400);

      const skipPublicLookup =
        "skipPublicLookup" in body && (body as { skipPublicLookup: unknown }).skipPublicLookup === true;

      let nextRegistrar =
        registrarName === undefined || registrarName === null || registrarName.trim() === ""
          ? null
          : registrarName.trim();
      let nextExpires = expiresParsed.date;

      let enrichmentPayload: (typeof domains.$inferInsert)["enrichment"] = null;
      let enrichedAt: Date | null = null;

      let publicLookupWarning: string | undefined;
      if (!skipPublicLookup) {
        const limited = rateLimitDomainLookup(userId);
        if (!limited.ok) {
          return jsonResponse(
            { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
            429
          );
        }
        try {
          const enrichment = enrichmentToStorable(await enrichDomain(hostname));
          enrichmentPayload = enrichment;
          enrichedAt = new Date();
          const sug = enrichment.suggested;
          if (nextRegistrar === null && sug?.registrarName) {
            const regErr = validateRegistrarName(sug.registrarName);
            if (!regErr) nextRegistrar = sug.registrarName;
          }
          if (nextExpires === null && sug?.expiresAt) {
            const d = new Date(sug.expiresAt);
            if (!Number.isNaN(d.getTime())) nextExpires = d;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Public lookup failed";
          publicLookupWarning = msg;
          enrichmentPayload = null;
          enrichedAt = null;
        }
      }

      const id = crypto.randomUUID();
      const now = new Date();
      try {
        const [inserted] = await db
          .insert(domains)
          .values({
            id,
            userId,
            hostname,
            registrarName: nextRegistrar,
            expiresAt: nextExpires,
            notes:
              notesRaw === undefined || notesRaw === null || notesRaw === ""
                ? null
                : notesRaw,
            enrichment: enrichmentPayload,
            enrichedAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!inserted) return jsonResponse({ error: "Insert failed" }, 500);
        return jsonResponse(
          {
            domain: rowToJson(inserted),
            ...(publicLookupWarning ? { publicLookupWarning } : {}),
          },
          201
        );
      } catch (e) {
        if (isUniqueViolation(e)) {
          return jsonResponse({ error: "A domain with this hostname already exists" }, 409);
        }
        const msg = e instanceof Error ? e.message : "Database error";
        return jsonResponse({ error: msg }, 500);
      }
    })
    .get("/:id", async ({ request, params }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const id = params.id;
      if (!id) return jsonResponse({ error: "Not found" }, 404);

      try {
        const rows = await db
          .select()
          .from(domains)
          .where(and(eq(domains.id, id), eq(domains.userId, userId)))
          .limit(1);
        const row = rows[0];
        if (!row) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse({ domain: rowToJson(row) });
      } catch (e) {
        return dbFailureResponse(e);
      }
    })
    .patch("/:id", async ({ request, params }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const id = params.id;
      if (!id) return jsonResponse({ error: "Not found" }, 404);

      const body = await readJsonBody(request);
      if (body === null || typeof body !== "object" || body === null) {
        return jsonResponse({ error: "Expected application/json body" }, 400);
      }

      let existing: (typeof domains.$inferSelect) | undefined;
      try {
        const existingRows = await db
          .select()
          .from(domains)
          .where(and(eq(domains.id, id), eq(domains.userId, userId)))
          .limit(1);
        existing = existingRows[0];
      } catch (e) {
        return dbFailureResponse(e);
      }
      if (!existing) return jsonResponse({ error: "Not found" }, 404);

      let nextHostname = existing.hostname;
      if ("hostname" in body) {
        const hostnameRaw = (body as { hostname: unknown }).hostname;
        if (typeof hostnameRaw !== "string") {
          return jsonResponse({ error: "hostname must be a string" }, 400);
        }
        const hostname = normalizeHostname(hostnameRaw);
        if (!isValidHostname(hostname)) {
          return jsonResponse(
            {
              error: "Invalid hostname",
              limits: { maxLength: hostnameLimits.hostnameMaxLen },
            },
            400
          );
        }
        nextHostname = hostname;
      }

      let nextRegistrar = existing.registrarName;
      if ("registrarName" in body) {
        const v = (body as { registrarName: unknown }).registrarName;
        if (v !== null && v !== undefined && typeof v !== "string") {
          return jsonResponse({ error: "registrarName must be a string or null" }, 400);
        }
        const regErr = validateRegistrarName(typeof v === "string" ? v : null);
        if (regErr) return jsonResponse({ error: regErr }, 400);
        nextRegistrar =
          v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? null : v.trim();
      }

      let nextNotes = existing.notes;
      if ("notes" in body) {
        const v = (body as { notes: unknown }).notes;
        if (v !== null && v !== undefined && typeof v !== "string") {
          return jsonResponse({ error: "notes must be a string or null" }, 400);
        }
        const notesErr = validateNotes(typeof v === "string" ? v : null);
        if (notesErr) return jsonResponse({ error: notesErr }, 400);
        nextNotes = v === null || v === undefined || v === "" ? null : v;
      }

      let nextExpires = existing.expiresAt;
      if ("expiresAt" in body) {
        const parsed = parseOptionalDate((body as { expiresAt: unknown }).expiresAt);
        if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);
        nextExpires = parsed.date;
      }

      const fetchPublicData =
        "fetchPublicData" in body && (body as { fetchPublicData: unknown }).fetchPublicData === true;

      let enrichmentPayload: (typeof domains.$inferInsert)["enrichment"] | undefined;
      let enrichedAt: Date | null | undefined;

      if (fetchPublicData) {
        const limited = rateLimitDomainLookup(userId);
        if (!limited.ok) {
          return jsonResponse(
            { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
            429
          );
        }
        try {
          const enrichment = enrichmentToStorable(await enrichDomain(nextHostname));
          enrichmentPayload = enrichment;
          enrichedAt = new Date();
          const sug = enrichment.suggested;
          if (sug?.registrarName) {
            const regErr = validateRegistrarName(sug.registrarName);
            if (!regErr) nextRegistrar = sug.registrarName;
          }
          if (sug?.expiresAt) {
            const d = new Date(sug.expiresAt);
            if (!Number.isNaN(d.getTime())) nextExpires = d;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Public lookup failed";
          return jsonResponse({ error: `Refresh failed: ${msg}` }, 503);
        }
      }

      const now = new Date();
      try {
        const [updated] = await db
          .update(domains)
          .set({
            hostname: nextHostname,
            registrarName: nextRegistrar,
            notes: nextNotes,
            expiresAt: nextExpires,
            ...(fetchPublicData ? { enrichment: enrichmentPayload ?? null, enrichedAt: enrichedAt ?? null } : {}),
            updatedAt: now,
          })
          .where(and(eq(domains.id, id), eq(domains.userId, userId)))
          .returning();

        if (!updated) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse({ domain: rowToJson(updated) });
      } catch (e) {
        if (isUniqueViolation(e)) {
          return jsonResponse({ error: "A domain with this hostname already exists" }, 409);
        }
        const msg = e instanceof Error ? e.message : "Database error";
        return jsonResponse({ error: msg }, 500);
      }
    })
    .delete("/:id", async ({ request, params }) => {
      const userId = getUserId(await getSession(request));
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const id = params.id;
      if (!id) return jsonResponse({ error: "Not found" }, 404);

      try {
        const deleted = await db
          .delete(domains)
          .where(and(eq(domains.id, id), eq(domains.userId, userId)))
          .returning({ id: domains.id });

        if (!deleted.length) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse({ ok: true });
      } catch (e) {
        return dbFailureResponse(e);
      }
    })
);
