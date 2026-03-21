import { useEffect, useState } from "react";
import { getProxyStatus } from "../../services/proxy";

export interface ProxyStatus {
  provider: "caddy" | "traefik" | null;
  message?: string;
}

export function useDashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null);

  useEffect(() => {
    getProxyStatus()
      .then(async (r) => {
        const text = await r.text();
        const data = (() => { try { return JSON.parse(text); } catch { return null; } })();
        if (!r.ok) {
          return { provider: null, message: data?.error ?? data?.message ?? `Request failed (${r.status})` };
        }
        return data ?? { provider: null, message: "Invalid response." };
      })
      .then(setStatus)
      .catch(() => setStatus({ provider: null, message: "Could not reach server." }));
  }, []);

  return { status };
}
