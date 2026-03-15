import type { ProxyConfig, Site } from "./types";

const CADDY_ADMIN = process.env.CADDY_ADMIN ?? "http://localhost:2019";

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
