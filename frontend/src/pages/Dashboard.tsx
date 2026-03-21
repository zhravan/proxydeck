import { Link } from "react-router-dom";
import { useDashboard } from "./hooks/useDashboard";

const quickActions: { to: string; title: string; description: string }[] = [
  { to: "/proxy/sites", title: "Sites", description: "Hosts, routes, upstreams." },
  { to: "/proxy/config", title: "Config", description: "Preview and apply config." },
  { to: "/proxy/logs", title: "Logs", description: "Tail proxy logs." },
  { to: "/proxy/certificates", title: "Certificates", description: "Manage TLS certificates." },
];

export function Dashboard() {
  const { status } = useDashboard();

  const hasProxy = status?.provider != null;
  const providerLabel = status?.provider ?? "None detected";

  return (
    <>
      <header className="pd-page-header">
        <h1>Proxy dashboard</h1>
        <p className="text-light">Reverse proxy (Caddy / Traefik) status and quick actions. Domain portfolio lives under Domains.</p>
      </header>

      <section className="card pd-section-stack" aria-labelledby="proxy-status-heading">
        <h2 id="proxy-status-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
          Proxy status
        </h2>
        <p className="hstack gap-2">
          <span className={hasProxy ? "pd-status-connected" : "pd-status-idle"}>
            {hasProxy ? "Connected" : "Not connected"}
          </span>
          <span className={hasProxy ? "badge pd-signal-active" : "badge secondary"}>{providerLabel}</span>
        </p>
        {!hasProxy && (
          <p className="text-light mt-2" style={{ fontSize: "var(--text-7)", marginBlockEnd: 0 }}>
            {status?.message ?? "Set CADDY_ADMIN or TRAEFIK_API_URL in your environment to manage a proxy."}
          </p>
        )}
      </section>

      <section className="pd-section-stack" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
          Quick actions
        </h2>
        <div className="row pd-quick-actions">
          {quickActions.map(({ to, title, description }) => (
            <Link
              key={to}
              to={to}
              className="card pd-action-card pd-action-col col-3 flex flex-col gap-2"
            >
              <h3>{title}</h3>
              <p className="text-light">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
