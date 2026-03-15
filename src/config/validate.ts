import { detectProxy } from "../proxy/detect";
import * as caddy from "../proxy/caddy";
import * as traefik from "../proxy/traefik";
import type { ProxyConfig } from "../proxy/types";

export async function validateConfig(config: ProxyConfig): Promise<{ valid: boolean; error?: string }> {
  const { provider } = await detectProxy();
  if (provider === "caddy") {
    const caddyfile = caddy.configToCaddyfile(config);
    return caddy.adapt(caddyfile);
  }
  if (provider === "traefik") {
    const yaml = traefik.configToYaml(config);
    return traefik.validateYaml(yaml);
  }
  return { valid: false, error: "No proxy detected" };
}
