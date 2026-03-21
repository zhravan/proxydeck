import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { domains } from "../db/schema";

export type DomainRow = typeof domains.$inferSelect;
export type DomainInsert = typeof domains.$inferInsert;

export async function findDomainsByUserId(userId: string): Promise<DomainRow[]> {
  return db.select().from(domains).where(eq(domains.userId, userId)).orderBy(asc(domains.hostname));
}

export async function findDomainByIdForUser(
  domainId: string,
  userId: string
): Promise<DomainRow | undefined> {
  const rows = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function insertDomain(values: DomainInsert): Promise<DomainRow | undefined> {
  const [row] = await db.insert(domains).values(values).returning();
  return row;
}

export async function updateDomainForUser(
  domainId: string,
  userId: string,
  patch: Partial<{
    hostname: string;
    registrarName: string | null;
    notes: string | null;
    expiresAt: Date | null;
    enrichment: DomainInsert["enrichment"];
    enrichedAt: Date | null;
    updatedAt: Date;
  }>
): Promise<DomainRow | undefined> {
  const [row] = await db
    .update(domains)
    .set(patch)
    .where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
    .returning();
  return row;
}

export async function deleteDomainForUser(domainId: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(domains)
    .where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
    .returning({ id: domains.id });
  return deleted.length > 0;
}
