import { validateConfig } from "./validate";
import { detectProxy } from "../proxy/detect";
import * as caddy from "../proxy/caddy";
import * as traefik from "../proxy/traefik";
import type { ProxyConfig } from "../proxy/types";

export async function applyConfig(config: ProxyConfig): Promise<{ ok: boolean; error?: string }> {
  const validation = await validateConfig(config);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }
  const { provider } = await detectProxy();
  if (provider === "caddy") {
    const caddyfile = caddy.configToCaddyfile(config);
    return caddy.load(caddyfile);
  }
  if (provider === "traefik") {
    const yaml = traefik.configToYaml(config);
    traefik.writeDynamicConfig(yaml);
    return { ok: true };
  }
  return { ok: false, error: "No proxy detected" };
}
