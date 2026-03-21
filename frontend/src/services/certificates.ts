import { httpGet } from "../utils/http";

export function getCertificates(): Promise<Response> {
  return httpGet("/api/certificates");
}
