import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { configHistory } from "../db/schema";
import type { ProxyConfig } from "../proxy/types";
import { randomUUID } from "crypto";

export interface ConfigHistoryEntry {
  id: string;
  createdAt: string;
  payload: ProxyConfig;
  provider: string;
  comment: string | null;
}

export async function saveToHistory(
  payload: ProxyConfig,
  provider: string,
  comment?: string
): Promise<string> {
  const id = randomUUID();
  await db.insert(configHistory).values({
    id,
    payload,
    provider,
    comment: comment ?? null,
  });
  return id;
}

export async function listHistory(): Promise<ConfigHistoryEntry[]> {
  const rows = await db
    .select({
      id: configHistory.id,
      createdAt: configHistory.createdAt,
      payload: configHistory.payload,
      provider: configHistory.provider,
      comment: configHistory.comment,
    })
    .from(configHistory)
    .orderBy(desc(configHistory.createdAt))
    .limit(50);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload as ProxyConfig,
    provider: row.provider,
    comment: row.comment,
  }));
}

export async function getLatest(): Promise<ProxyConfig | null> {
  const rows = await db
    .select({ payload: configHistory.payload })
    .from(configHistory)
    .orderBy(desc(configHistory.createdAt))
    .limit(1);
  const row = rows[0];
  return row ? (row.payload as ProxyConfig) : null;
}

export async function getById(id: string): Promise<ConfigHistoryEntry | null> {
  const rows = await db
    .select({
      id: configHistory.id,
      createdAt: configHistory.createdAt,
      payload: configHistory.payload,
      provider: configHistory.provider,
      comment: configHistory.comment,
    })
    .from(configHistory)
    .where(eq(configHistory.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload as ProxyConfig,
    provider: row.provider,
    comment: row.comment,
  };
}
