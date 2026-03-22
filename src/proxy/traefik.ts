import { writeFileSync, renameSync } from "fs";
import { join } from "path";
import type { ProxyConfig, Site } from "./types";

const TRAEFIK_API = process.env.TRAEFIK_API_URL ?? "http://localhost:8080";
const TRAEFIK_DYNAMIC_FILE =
  process.env.TRAEFIK_DYNAMIC_CONFIG ?? join(process.cwd(), "traefik-dynamic.yml");

export async function getRouters(): Promise<unknown> {
  const res = await fetch(`${TRAEFIK_API}/api/http/routers`);
  if (!res.ok) throw new Error(`Traefik routers get failed: ${res.status}`);
  return res.json();
}

export async function getServices(): Promise<unknown> {
  const res = await fetch(`${TRAEFIK_API}/api/http/services`);
  if (!res.ok) throw new Error(`Traefik services get failed: ${res.status}`);
  return res.json();
}

function siteToRoutersAndServices(site: Site): { routers: string[]; services: string[] } {
  const host = site.hostnames[0] ?? "localhost";
  const safe = (s: string) => s.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const routerName = `router-${safe(host)}`;
  const serviceName = `service-${safe(host)}`;
  const rule = `Host(\`${host}\`)`;
  const servers = site.routes.flatMap((r) =>
    r.upstreams.map((u) => `        - url: "http://${u.address}"`)
  );
  const routers = [
    `    ${routerName}:`,
    `      rule: ${rule}`,
    `      service: ${serviceName}`,
  ];
  const services = [
    `    ${serviceName}:`,
    `      loadBalancer:`,
    `        servers:`,
    ...servers,
  ];
  return { routers, services };
}

export function configToYaml(config: ProxyConfig): string {
  if (config.sites.length === 0) {
    return ["http:", "  routers: {}", "  services: {}"].join("\n");
  }
  const allRouters: string[] = [];
  const allServices: string[] = [];
  for (const site of config.sites) {
    const { routers, services } = siteToRoutersAndServices(site);
    allRouters.push(...routers);
    allServices.push(...services);
  }
  return [
    "http:",
    "  routers:",
    ...allRouters,
    "  services:",
    ...allServices,
  ].join("\n");
}

export function writeDynamicConfig(yaml: string): void {
  const staging = TRAEFIK_DYNAMIC_FILE + ".new";
  writeFileSync(staging, yaml, "utf-8");
  renameSync(staging, TRAEFIK_DYNAMIC_FILE);
}

export function validateYaml(_yaml: string): { valid: boolean; error?: string } {
  if (!_yaml.trim()) return { valid: false, error: "Empty config" };
  return { valid: true };
}
