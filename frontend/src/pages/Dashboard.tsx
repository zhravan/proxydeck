import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface ProxyStatus {
  provider: "caddy" | "traefik" | null;
  message?: string;
}

export function Dashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null);

  useEffect(() => {
    fetch("/api/proxy/status", { credentials: "include" })
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

  const hasProxy = status?.provider != null;
  const providerLabel = status?.provider ?? "None detected";

  return (
    <>
      <header className="mb-6">
        <h1>Proxy dashboard</h1>
        <p className="text-light">Reverse proxy (Caddy / Traefik) status and quick actions. Domain portfolio lives under Domains.</p>
      </header>

      <section className="card mb-6" aria-labelledby="proxy-status-heading">
        <h2 id="proxy-status-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>Proxy status</h2>
        <p className="hstack gap-2">
          <span style={{ color: hasProxy ? "var(--success)" : "var(--muted-foreground)", fontWeight: 500 }}>
            {hasProxy ? "Connected" : "Not connected"}
          </span>
          <span className="badge secondary">{providerLabel}</span>
        </p>
        {!hasProxy && (
          <p className="text-light mt-2" style={{ fontSize: "var(--text-7)", marginBlockEnd: 0 }}>
            {status?.message ?? "Set CADDY_ADMIN or TRAEFIK_API_URL in your environment to manage a proxy."}
          </p>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>Quick actions</h2>
        <div className="row" style={{ gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))" }}>
          <Link to="/proxy/sites" className="card p-4" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <h3 style={{ marginBlockEnd: "var(--space-2)" }}>Sites</h3>
            <p className="text-light" style={{ marginBlockEnd: 0 }}>Add and edit hostnames, routes, and upstreams.</p>
          </Link>
          <Link to="/proxy/config" className="card p-4" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <h3 style={{ marginBlockEnd: "var(--space-2)" }}>Config</h3>
            <p className="text-light" style={{ marginBlockEnd: 0 }}>Preview, validate, and apply proxy configuration.</p>
          </Link>
          <Link to="/proxy/logs" className="card p-4" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <h3 style={{ marginBlockEnd: "var(--space-2)" }}>Logs</h3>
            <p className="text-light" style={{ marginBlockEnd: 0 }}>View proxy log output.</p>
          </Link>
          <Link to="/proxy/certificates" className="card p-4" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <h3 style={{ marginBlockEnd: "var(--space-2)" }}>Certificates</h3>
            <p className="text-light" style={{ marginBlockEnd: 0 }}>Manage TLS certificates.</p>
          </Link>
        </div>
      </section>
    </>
  );
}
