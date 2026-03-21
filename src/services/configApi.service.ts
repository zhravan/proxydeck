import type { ApiResult } from "../types/api";
import { validateConfig } from "../config/validate";
import { applyConfig } from "../config/apply";
import {
  getHistoryEntryById,
  getLatestConfigPayload,
  listHistory,
} from "../repositories/configHistory.repository";
import { detectProxy } from "../proxy/detect";
import * as caddy from "../proxy/caddy";
import * as traefik from "../proxy/traefik";
import type { ProxyConfig } from "../proxy/types";

function parseProxyConfigBody(body: unknown): ProxyConfig | null {
  const config = (typeof body === "string" ? JSON.parse(body) : body) as ProxyConfig;
  if (!config?.sites) return null;
  return config;
}

export async function validateConfigBody(body: unknown): Promise<ApiResult> {
  const config = parseProxyConfigBody(body);
  if (!config) {
    return { status: 200, body: { valid: false, error: "Invalid config: sites required" } };
  }
  const result = await validateConfig(config);
  return { status: 200, body: result };
}

export async function applyConfigBody(body: unknown): Promise<ApiResult> {
  const config = parseProxyConfigBody(body);
  if (!config) {
    return { status: 200, body: { ok: false, error: "Invalid config: sites required" } };
  }
  const result = await applyConfig(config);
  return { status: 200, body: result };
}

export async function getConfigPreview(): Promise<ApiResult> {
  const { provider } = await detectProxy();
  const config = await getLatestConfigPayload();
  const payload = config ?? { sites: [] };
  if (provider === "caddy") {
    return { status: 200, body: { provider, raw: caddy.configToCaddyfile(payload) } };
  }
  if (provider === "traefik") {
    return { status: 200, body: { provider, raw: traefik.configToYaml(payload) } };
  }
  return { status: 200, body: { provider: null, raw: "" } };
}

export async function getCurrentConfig(): Promise<ApiResult> {
  const config = await getLatestConfigPayload();
  return { status: 200, body: config ?? { sites: [] } };
}

export async function getConfigHistoryList(): Promise<ApiResult> {
  const entries = await listHistory();
  return { status: 200, body: entries };
}

export async function rollbackConfigBody(body: unknown): Promise<ApiResult> {
  const id =
    typeof body === "object" && body && "id" in body ? (body as { id: string }).id : null;
  if (!id) return { status: 200, body: { ok: false, error: "id required" } };
  const entry = await getHistoryEntryById(id);
  if (!entry) return { status: 200, body: { ok: false, error: "Config not found" } };
  const result = await applyConfig(entry.payload);
  return { status: 200, body: result };
}
