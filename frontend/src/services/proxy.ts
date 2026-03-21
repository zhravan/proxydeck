import { httpGet } from "../utils/http";

export function getProxyStatus(): Promise<Response> {
  return httpGet("/api/proxy/status");
}
