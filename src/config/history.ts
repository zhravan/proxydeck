import { pool } from "../db/pool";
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
  await pool.query(
    'INSERT INTO config_history (id, payload, provider, comment) VALUES ($1, $2, $3, $4)',
    [id, JSON.stringify(payload), provider, comment ?? null]
  );
  return id;
}

export async function listHistory(): Promise<ConfigHistoryEntry[]> {
  const r = await pool.query<{
    id: string;
    createdAt: Date;
    payload: unknown;
    provider: string;
    comment: string | null;
  }>('SELECT id, "createdAt", payload, provider, comment FROM config_history ORDER BY "createdAt" DESC LIMIT 50');
  return r.rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload as ProxyConfig,
    provider: row.provider,
    comment: row.comment,
  }));
}

export async function getLatest(): Promise<ProxyConfig | null> {
  const r = await pool.query<{ payload: unknown }>(
    'SELECT payload FROM config_history ORDER BY "createdAt" DESC LIMIT 1'
  );
  const row = r.rows[0];
  return row ? (row.payload as ProxyConfig) : null;
}

export async function getById(id: string): Promise<ConfigHistoryEntry | null> {
  const r = await pool.query<{
    id: string;
    createdAt: Date;
    payload: unknown;
    provider: string;
    comment: string | null;
  }>('SELECT id, "createdAt", payload, provider, comment FROM config_history WHERE id = $1', [id]);
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload as ProxyConfig,
    provider: row.provider,
    comment: row.comment,
  };
}
