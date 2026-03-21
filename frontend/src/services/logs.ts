import { httpGet } from "../utils/http";

export function getLogs(): Promise<Response> {
  return httpGet("/api/logs");
}
