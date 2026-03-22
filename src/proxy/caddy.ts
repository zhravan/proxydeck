import type { ProxyConfig, Site } from "./types";

const CADDY_ADMIN = process.env.CADDY_ADMIN ?? "http://localhost:2019";

/** Listen address for the global `admin` directive (Caddyfile), derived from `CADDY_ADMIN`. */
function adminListenForCaddyfile(): string {
  try {
    const u = new URL(CADDY_ADMIN);
    const host = u.hostname === "0.0.0.0" ? "127.0.0.1" : u.hostname;
    const port = u.port || "2019";
    return `${host}:${port}`;
  } catch {
    return "localhost:2019";
  }
}

/**
 * Valid Caddyfile with no HTTP sites: replaces the running config and drops all reverse_proxy routes
 * while keeping the admin API reachable (POST /load replaces the full config).
 */
function emptyProxyCaddyfile(): string {
  const admin = adminListenForCaddyfile();
  return `{\n\tadmin ${admin}\n}\n`;
}

function siteToCaddyfile(site: Site): string {
  const host = site.hostnames.join(", ") || "localhost";
  const lines: string[] = [];
  if (site.tls?.provider === "acme" && site.tls.email) {
    lines.push(`tls ${site.tls.email}`);
  }
  for (const route of site.routes) {
    const backends = route.upstreams.map((u) => u.address).join(" ");
    if (route.matchType === "path" && route.match && route.match !== "/") {
      const path = route.match.endsWith("/") ? route.match + "*" : route.match + "/*";
      lines.push(`handle_path ${path} {`, `  reverse_proxy ${backends}`, `}`);
    } else {
      lines.push(`handle {`, `  reverse_proxy ${backends}`, `}`);
    }
  }
  if (lines.length === 0) return `${host} {}`;
  return `${host} {\n  ${lines.join("\n  ")}\n}`;
}

export function configToCaddyfile(config: ProxyConfig): string {
  if (config.sites.length === 0) {
    return emptyProxyCaddyfile();
  }
  return config.sites.map(siteToCaddyfile).join("\n\n");
}

export async function getConfig(): Promise<unknown> {
  const res = await fetch(`${CADDY_ADMIN}/config/`);
  if (!res.ok) throw new Error(`Caddy config get failed: ${res.status}`);
  return res.json();
}

export async function adapt(caddyfile: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${CADDY_ADMIN}/adapt`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile" },
      body: caddyfile,
    });
    if (!res.ok) {
      const text = await res.text();
      return { valid: false, error: text || res.statusText };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function load(caddyfile: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${CADDY_ADMIN}/load`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile" },
      body: caddyfile,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
