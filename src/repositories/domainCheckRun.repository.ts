import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { domainCheckRuns, domains } from "../db/schema";
import type { DomainEnrichment } from "../domains/enrichment/types";

export type DomainCheckRun = typeof domainCheckRuns.$inferSelect;

export async function findDomainCheckRunsForUser(domainId: string, userId: string, limit = 20) {
  const [owned] = await db.select({ id: domains.id }).from(domains)
    .where(and(eq(domains.id, domainId), eq(domains.userId, userId))).limit(1);
  if (!owned) return null;
  return db.select().from(domainCheckRuns)
    .where(eq(domainCheckRuns.domainId, domainId))
    .orderBy(desc(domainCheckRuns.checkedAt)).limit(limit);
}
