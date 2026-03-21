/**
 * Same-origin API client: cookies included, optional JSON body helpers.
 */

export type HttpJsonBody = unknown;

function mergeHeaders(a?: HeadersInit, b?: HeadersInit): Headers {
  const out = new Headers(a);
  if (b) {
    new Headers(b).forEach((value, key) => {
      out.set(key, value);
    });
  }
  return out;
}

export type HttpRequestOptions = RequestInit & { json?: HttpJsonBody };

/**
 * Low-level request with credentials and optional JSON serialization.
 */
export function httpRequest(path: string, method: string, options: HttpRequestOptions = {}): Promise<Response> {
  const { json, headers: hdrs, body, ...rest } = options;
  const headers = mergeHeaders(hdrs);
  let finalBody: BodyInit | null | undefined = body;

  if (json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    finalBody = JSON.stringify(json);
  }

  const init: RequestInit = {
    credentials: "include",
    ...rest,
    method,
    headers,
  };

  if (finalBody !== undefined && finalBody !== null) {
    init.body = finalBody;
  }

  return fetch(path, init);
}

export function httpGet(path: string, init: Omit<RequestInit, "body" | "method"> = {}): Promise<Response> {
  return httpRequest(path, "GET", { ...init, body: undefined, json: undefined });
}

export function httpPost(path: string, options: HttpRequestOptions = {}): Promise<Response> {
  return httpRequest(path, "POST", options);
}

export function httpPut(path: string, options: HttpRequestOptions = {}): Promise<Response> {
  return httpRequest(path, "PUT", options);
}

export function httpPatch(path: string, options: HttpRequestOptions = {}): Promise<Response> {
  return httpRequest(path, "PATCH", options);
}

export function httpDelete(path: string, options: HttpRequestOptions = {}): Promise<Response> {
  return httpRequest(path, "DELETE", options);
}
