import type { ApiResult } from "../types/api";
import type { DomainEnrichment } from "../domains/enrichment/types";
import { enrichDomain } from "../domains/enrichment/service";
import { enrichmentToStorable } from "../models/domain.model";
import { findDomainByIdForUser } from "../repositories/domain.repository";
import { findDomainCheckRunsForUser } from "../repositories/domainCheckRun.repository";
import { acquireDomainCheck, rateLimitDomainCheck } from "../domains/enrichment/ratelimit";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { domainCheckRuns, domains } from "../db/schema";

const HISTORY_LIMIT = 20;

function unauthorized(): ApiResult { return { status: 401, body: { error: "Unauthorized" } }; }
function notFound(): ApiResult { return { status: 404, body: { error: "Not found" } }; }


export async function refreshDomainCheckForUser(userId: string | null, domainId: string): Promise<ApiResult> {
  if (!userId) return unauthorized();
  if (!domainId) return notFound();

  let domain: Awaited<ReturnType<typeof findDomainByIdForUser>>;
  try {
    domain = await findDomainByIdForUser(domainId, userId);
  } catch (error) {
    return { status: 500, body: { error: error instanceof Error ? error.message : "Database error" } };
  }
  if (!domain) return notFound();

  const releaseCheck = acquireDomainCheck(userId, domainId);
  if (!releaseCheck) return { status: 409, body: { error: "A check for this domain is already running." } };
  const limited = rateLimitDomainCheck(userId, domainId);
  if (!limited.ok) {
    releaseCheck();
    return { status: 429, body: {
      error: "This domain was checked recently. Try again shortly.",
      retryAfter: limited.retryAfterSec,
    } };
  }

  const checkedAt = new Date();
  let result: DomainEnrichment;
  let errorMessage: string | null = null;
  try {
    result = enrichmentToStorable(await enrichDomain(domain.hostname));
  } catch {
    // Record only sanitized failure information; raw dependency errors may contain URLs or details.
    errorMessage = "Domain check failed";
    result = { fetchedAt: checkedAt.toISOString(), errors: [errorMessage] };
  }

  try {
    // The append-only history row and latest snapshot update commit or roll back together.
    const suggested = result.suggested;
    const suggestedExpiry = suggested?.expiresAt ? new Date(suggested.expiresAt) : null;
    const expiry = domain.expiresAt ?? (suggestedExpiry && !Number.isNaN(suggestedExpiry.getTime()) ? suggestedExpiry : null);
    const [run] = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(domainCheckRuns).values({
        id: crypto.randomUUID(), domainId, checkedAt, result, error: errorMessage,
      }).returning();
      await tx.update(domains).set({
        enrichment: result,
        enrichedAt: checkedAt,
        expiresAt: expiry,
        registrarName: domain.registrarName ?? suggested?.registrarName ?? null,
        updatedAt: checkedAt,
      }).where(and(eq(domains.id, domainId), eq(domains.userId, userId)));
      return [inserted];
    });

    return { status: 200, body: { run: {
      id: run.id, checkedAt: run.checkedAt.toISOString(), result: run.result, error: run.error,
    } } };
  } catch {
    return { status: 500, body: { error: "Could not persist domain check snapshot" } };
  } finally {
    releaseCheck();
  }
}

export async function listDomainCheckRunsForUser(
  userId: string | null, domainId: string, limitRaw?: string | null
): Promise<ApiResult> {
  if (!userId) return unauthorized();
  const limit = limitRaw ? Number(limitRaw) : HISTORY_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { status: 400, body: { error: "limit must be an integer between 1 and 100" } };
  }
  try {
    const runs = await findDomainCheckRunsForUser(domainId, userId, limit);
    if (!runs) return notFound();
    return { status: 200, body: { runs: runs.map((run) => ({
      id: run.id, checkedAt: run.checkedAt.toISOString(), result: run.result, error: run.error,
    })) } };
  } catch (error) {
    return { status: 500, body: { error: error instanceof Error ? error.message : "Database error" } };
  }
}
