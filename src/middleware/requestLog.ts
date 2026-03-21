import { Elysia } from "elysia";

export type RequestLogFormat = "simple" | "dev" | "combined";

const ANSI_RESET = "\x1b[0m";

function parseFormat(raw: string | undefined): RequestLogFormat {
  if (raw === "dev" || raw === "combined") return raw;
  // Previously documented Morgan-style names → same one-line shape as `simple`
  if (raw === "list" || raw === "tiny" || raw === "short" || raw === "common") return "simple";
  return "simple";
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

function resolveStatus(set: { status?: number | string }, responseValue: unknown): number {
  if (responseValue instanceof Response) {
    return responseValue.status;
  }
  if (typeof set.status === "number") {
    return set.status;
  }
  return 200;
}

function responseHeaders(
  set: { headers?: Record<string, unknown> },
  responseValue: unknown,
): Headers {
  if (responseValue instanceof Response) {
    return responseValue.headers;
  }
  const h = new Headers();
  const raw = set.headers ?? {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        h.append(key, String(v));
      }
    } else {
      h.set(key, String(value));
    }
  }
  return h;
}

function elapsedMs(startAt: [number, number]): string {
  const [s, ns] = process.hrtime(startAt);
  const ms = s * 1e3 + ns * 1e-6;
  return ms.toFixed(3);
}

function statusColorCode(status: number): number {
  if (status >= 500) return 31;
  if (status >= 400) return 33;
  if (status >= 300) return 36;
  if (status >= 200) return 32;
  return 0;
}

function clfDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(d.getUTCDate())}/${months[d.getUTCMonth()]}/${d.getUTCFullYear()}:${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`;
}

function escapeClfField(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatLine(
  format: RequestLogFormat,
  ctx: {
    request: Request;
    set: { status?: number | string; headers?: Record<string, unknown> };
    responseValue: unknown;
    _requestLogStartAt: [number, number];
  },
): string {
  const { request, set, responseValue, _requestLogStartAt: startAt } = ctx;
  const url = new URL(request.url);
  const pathWithQuery = `${url.pathname}${url.search}`;
  const status = resolveStatus(set, responseValue);
  const resHeaders = responseHeaders(set, responseValue);
  const len = resHeaders.get("content-length") ?? "-";
  const ms = elapsedMs(startAt);

  if (format === "combined") {
    const ip = clientIp(request) ?? "-";
    const referer = request.headers.get("referer") ?? "-";
    const ua = request.headers.get("user-agent") ?? "-";
    return `${ip} - - [${clfDate()}] "${escapeClfField(request.method)} ${escapeClfField(pathWithQuery)} HTTP/1.1" ${status} ${len} "${escapeClfField(referer)}" "${escapeClfField(ua)}" ${ms}ms`;
  }

  const base = `${request.method} ${pathWithQuery} ${status} ${len} - ${ms} ms`;

  if (format === "dev") {
    const c = statusColorCode(status);
    const colored =
      c === 0 ? String(status) : `${ANSI_RESET}\x1b[${c}m${status}${ANSI_RESET}`;
    return `${ANSI_RESET}${request.method} ${pathWithQuery} ${colored} ${ms} ms - ${len}`;
  }

  return base;
}

/**
 * HTTP access log via Elysia lifecycle hooks (no Express middleware).
 * REQUEST_LOG_FORMAT: simple (default), dev (colored status), combined (CLF-style + timing).
 */
export function requestLogPlugin() {
  const format = parseFormat(process.env.REQUEST_LOG_FORMAT);
  const stream = process.stdout;

  // Local hooks on a `.use()`'d instance do not run for routes registered on the parent;
  // `as: "global"` applies logging to the whole app (see Elysia LifeCycleType).
  return new Elysia({ name: "request-log" })
    .derive({ as: "global" }, () => ({
      _requestLogStartAt: process.hrtime(),
    }))
    .onAfterResponse({ as: "global" }, (ctx) => {
      const extended = ctx as typeof ctx & { _requestLogStartAt: [number, number] };
      const line = formatLine(format, extended);
      stream.write(`${line}\n`);
    });
}
