import type { ApiResult } from "../types/api";
import { dbFailureBody } from "../http/json";
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
import {
  domainRowToJson,
  enrichmentToStorable,
  isPgUniqueViolation,
  parseOptionalExpiresAt,
} from "../models/domain.model";
import type { DomainInsert } from "../repositories/domain.repository";
import {
  deleteDomainForUser,
  findDomainByIdForUser,
  findDomainsByUserId,
  insertDomain,
  updateDomainForUser,
} from "../repositories/domain.repository";

function unauthorized(): ApiResult {
  return { status: 401, body: { error: "Unauthorized" } };
}

function notFound(): ApiResult {
  return { status: 404, body: { error: "Not found" } };
}

export async function listDomainsForUser(userId: string | null): Promise<ApiResult> {
  if (!userId) return unauthorized();
  try {
    const rows = await findDomainsByUserId(userId);
    return { status: 200, body: { domains: rows.map(domainRowToJson) } };
  } catch (e) {
    return dbFailureBody(e);
  }
}

export async function lookupDomainForUser(
  userId: string | null,
  hostnameRaw: string
): Promise<ApiResult> {
  if (!userId) return unauthorized();
  const hostname = normalizeHostname(hostnameRaw);
  if (!hostname || !isValidHostname(hostname)) {
    return {
      status: 400,
      body: { error: "Query ?hostname= (or ?domain=) must be a valid hostname" },
    };
  }
  const limited = rateLimitDomainLookup(userId);
  if (!limited.ok) {
    return {
      status: 429,
      body: { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
    };
  }
  try {
    const enrichment = await enrichDomain(hostname);
    return { status: 200, body: { enrichment } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    return { status: 503, body: { error: `Public lookup failed: ${msg}` } };
  }
}

export async function createDomainForUser(userId: string | null, body: unknown): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (body === null || typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "Expected application/json body" } };
  }

  const hostnameRaw = "hostname" in body ? (body as { hostname: unknown }).hostname : undefined;
  if (typeof hostnameRaw !== "string") {
    return { status: 400, body: { error: "hostname is required and must be a string" } };
  }
  const hostname = normalizeHostname(hostnameRaw);
  if (!isValidHostname(hostname)) {
    return {
      status: 400,
      body: { error: "Invalid hostname", limits: { maxLength: hostnameLimits.hostnameMaxLen } },
    };
  }

  const registrarRaw =
    "registrarName" in body ? (body as { registrarName: unknown }).registrarName : undefined;
  const registrarName =
    typeof registrarRaw === "string" || registrarRaw === null || registrarRaw === undefined
      ? (registrarRaw as string | null | undefined)
      : undefined;
  if (registrarName !== undefined && registrarName !== null && typeof registrarName !== "string") {
    return { status: 400, body: { error: "registrarName must be a string or null" } };
  }
  const regErr = validateRegistrarName(registrarName ?? null);
  if (regErr) return { status: 400, body: { error: regErr } };

  const notesRaw = "notes" in body ? (body as { notes: unknown }).notes : undefined;
  if (notesRaw !== undefined && notesRaw !== null && typeof notesRaw !== "string") {
    return { status: 400, body: { error: "notes must be a string or null" } };
  }
  const notesErr = validateNotes(typeof notesRaw === "string" ? notesRaw : null);
  if (notesErr) return { status: 400, body: { error: notesErr } };

  const expiresParsed = parseOptionalExpiresAt(
    "expiresAt" in body ? (body as { expiresAt: unknown }).expiresAt : undefined
  );
  if (!expiresParsed.ok) return { status: 400, body: { error: expiresParsed.error } };

  const skipPublicLookup =
    "skipPublicLookup" in body && (body as { skipPublicLookup: unknown }).skipPublicLookup === true;

  let nextRegistrar =
    registrarName === undefined || registrarName === null || registrarName.trim() === ""
      ? null
      : registrarName.trim();
  let nextExpires = expiresParsed.date;

  let enrichmentPayload: DomainInsert["enrichment"] = null;
  let enrichedAt: Date | null = null;
  let publicLookupWarning: string | undefined;

  if (!skipPublicLookup) {
    const limited = rateLimitDomainLookup(userId);
    if (!limited.ok) {
      return {
        status: 429,
        body: { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
      };
    }
    try {
      const enrichment = enrichmentToStorable(await enrichDomain(hostname));
      enrichmentPayload = enrichment;
      enrichedAt = new Date();
      const sug = enrichment.suggested;
      if (nextRegistrar === null && sug?.registrarName) {
        const e = validateRegistrarName(sug.registrarName);
        if (!e) nextRegistrar = sug.registrarName;
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
    const inserted = await insertDomain({
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
    });

    if (!inserted) return { status: 500, body: { error: "Insert failed" } };
    return {
      status: 201,
      body: {
        domain: domainRowToJson(inserted),
        ...(publicLookupWarning ? { publicLookupWarning } : {}),
      },
    };
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      return { status: 409, body: { error: "A domain with this hostname already exists" } };
    }
    const msg = e instanceof Error ? e.message : "Database error";
    return { status: 500, body: { error: msg } };
  }
}

export async function getDomainForUser(userId: string | null, domainId: string): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (!domainId) return notFound();
  try {
    const row = await findDomainByIdForUser(domainId, userId);
    if (!row) return notFound();
    return { status: 200, body: { domain: domainRowToJson(row) } };
  } catch (e) {
    return dbFailureBody(e);
  }
}

export async function updateDomainForUserRequest(
  userId: string | null,
  domainId: string,
  body: unknown
): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (!domainId) return notFound();
  if (body === null || typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "Expected application/json body" } };
  }

  let existing: Awaited<ReturnType<typeof findDomainByIdForUser>>;
  try {
    existing = await findDomainByIdForUser(domainId, userId);
  } catch (e) {
    return dbFailureBody(e);
  }
  if (!existing) return notFound();

  let nextHostname = existing.hostname;
  if ("hostname" in body) {
    const hostnameRaw = (body as { hostname: unknown }).hostname;
    if (typeof hostnameRaw !== "string") {
      return { status: 400, body: { error: "hostname must be a string" } };
    }
    const hostname = normalizeHostname(hostnameRaw);
    if (!isValidHostname(hostname)) {
      return {
        status: 400,
        body: { error: "Invalid hostname", limits: { maxLength: hostnameLimits.hostnameMaxLen } },
      };
    }
    nextHostname = hostname;
  }

  let nextRegistrar = existing.registrarName;
  if ("registrarName" in body) {
    const v = (body as { registrarName: unknown }).registrarName;
    if (v !== null && v !== undefined && typeof v !== "string") {
      return { status: 400, body: { error: "registrarName must be a string or null" } };
    }
    const regErr = validateRegistrarName(typeof v === "string" ? v : null);
    if (regErr) return { status: 400, body: { error: regErr } };
    nextRegistrar =
      v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? null : v.trim();
  }

  let nextNotes = existing.notes;
  if ("notes" in body) {
    const v = (body as { notes: unknown }).notes;
    if (v !== null && v !== undefined && typeof v !== "string") {
      return { status: 400, body: { error: "notes must be a string or null" } };
    }
    const notesErr = validateNotes(typeof v === "string" ? v : null);
    if (notesErr) return { status: 400, body: { error: notesErr } };
    nextNotes = v === null || v === undefined || v === "" ? null : v;
  }

  let nextExpires = existing.expiresAt;
  if ("expiresAt" in body) {
    const parsed = parseOptionalExpiresAt((body as { expiresAt: unknown }).expiresAt);
    if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
    nextExpires = parsed.date;
  }

  const fetchPublicData =
    "fetchPublicData" in body && (body as { fetchPublicData: unknown }).fetchPublicData === true;

  let enrichmentPayload: DomainInsert["enrichment"] | undefined;
  let enrichedAt: Date | null | undefined;

  if (fetchPublicData) {
    const limited = rateLimitDomainLookup(userId);
    if (!limited.ok) {
      return {
        status: 429,
        body: { error: "Too many public lookups; try again shortly.", retryAfter: limited.retryAfterSec },
      };
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
      return { status: 503, body: { error: `Refresh failed: ${msg}` } };
    }
  }

  const now = new Date();
  try {
    const updated = await updateDomainForUser(domainId, userId, {
      hostname: nextHostname,
      registrarName: nextRegistrar,
      notes: nextNotes,
      expiresAt: nextExpires,
      ...(fetchPublicData ? { enrichment: enrichmentPayload ?? null, enrichedAt: enrichedAt ?? null } : {}),
      updatedAt: now,
    });

    if (!updated) return notFound();
    return { status: 200, body: { domain: domainRowToJson(updated) } };
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      return { status: 409, body: { error: "A domain with this hostname already exists" } };
    }
    const msg = e instanceof Error ? e.message : "Database error";
    return { status: 500, body: { error: msg } };
  }
}

export async function deleteDomainForUserRequest(
  userId: string | null,
  domainId: string
): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (!domainId) return notFound();
  try {
    const ok = await deleteDomainForUser(domainId, userId);
    if (!ok) return notFound();
    return { status: 200, body: { ok: true } };
  } catch (e) {
    return dbFailureBody(e);
  }
}
