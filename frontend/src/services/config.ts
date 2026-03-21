import { httpGet, httpPost } from "../utils/http";
import type { ProxyConfig } from "../types/proxy";

export function getConfigPreview(): Promise<Response> {
  return httpGet("/api/config/preview");
}

export function getConfigHistory(): Promise<Response> {
  return httpGet("/api/config/history");
}

export function postConfigRollback(id: string): Promise<Response> {
  return httpPost("/api/config/rollback", { json: { id } });
}

export function getConfigCurrent(): Promise<Response> {
  return httpGet("/api/config/current");
}

export function postConfigValidate(config: ProxyConfig): Promise<Response> {
  return httpPost("/api/config/validate", { json: config });
}

export function postConfigApply(config: ProxyConfig): Promise<Response> {
  return httpPost("/api/config/apply", { json: config });
}
