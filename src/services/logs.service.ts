import { readFileSync, existsSync } from "fs";

const LOG_FILE = process.env.PROXY_LOG_FILE ?? "";

export function readProxyLogTail(lines = 100): string[] {
  if (!LOG_FILE || !existsSync(LOG_FILE)) {
    return ["(No log file configured. Set PROXY_LOG_FILE to a Caddy or Traefik log path.)"];
  }
  try {
    const content = readFileSync(LOG_FILE, "utf-8");
    const all = content.split("\n").filter(Boolean);
    return all.slice(-lines);
  } catch {
    return ["(Failed to read log file.)"];
  }
}
