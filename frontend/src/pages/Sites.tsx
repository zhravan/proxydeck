import { useEffect, useState } from "react";
import { PencilSimple, SquaresFour, Table, Trash } from "@phosphor-icons/react";
import type { ProxyConfig, Site, Route, Upstream } from "../types/proxy";

const emptyConfig: ProxyConfig = { sites: [] };

type ViewMode = "cards" | "table";

export function Sites() {
  const [config, setConfig] = useState<ProxyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/current", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setConfig(data?.sites ? data : emptyConfig))
      .catch(() => setConfig(emptyConfig))
      .finally(() => setLoading(false));
  }, []);

  const addSite = () => {
    const newSite: Site = {
      hostnames: [""],
      routes: [{ match: "/", matchType: "path", upstreams: [{ address: "localhost:8080" }] }],
    };
    setConfig({ sites: [...config.sites, newSite] });
  };

  const removeSite = (index: number) => {
    setConfig({ sites: config.sites.filter((_, i) => i !== index) });
  };

  const updateSite = (index: number, site: Site) => {
    const next = [...config.sites];
    next[index] = site;
    setConfig({ sites: next });
  };

  const validate = () => {
    setValidateResult(null);
    fetch("/api/config/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setValidateResult)
      .catch((e) => setValidateResult({ valid: false, error: e.message }));
  };

  const apply = () => {
    setApplyResult(null);
    setValidateResult(null);
    fetch("/api/config/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setApplyResult)
      .catch((e) => setApplyResult({ ok: false, error: e.message }));
  };

  if (loading) {
    return (
      <>
        <header className="mb-6">
          <h1>Sites</h1>
          <p className="text-light">Proxy — configure hostnames and routes for Caddy or Traefik.</p>
        </header>
        <div className="card p-4">
          <p className="text-light align-center p-4">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1>Sites</h1>
        <p className="text-light">Proxy — configure hostnames and routes for Caddy or Traefik.</p>
        <div className="hstack gap-2 mt-4">
          <span style={{ fontSize: "var(--text-7)" }}>View:</span>
          <button
            type="button"
            className={viewMode === "cards" ? "small" : "outline small"}
            onClick={() => setViewMode("cards")}
            title="Cards"
            aria-label="Cards view"
          >
            <SquaresFour size={20} weight="duotone" />
          </button>
          <button
            type="button"
            className={viewMode === "table" ? "small" : "outline small"}
            onClick={() => setViewMode("table")}
            title="Table"
            aria-label="Table view"
          >
            <Table size={20} weight="duotone" />
          </button>
        </div>
      </header>
      <article className="card">
        {validateResult && (
          <div role="alert" data-variant={validateResult.valid ? "success" : "danger"} style={{ marginBlockEnd: "var(--space-4)" }}>
            {validateResult.valid ? "Config is valid." : validateResult.error}
          </div>
        )}
        {applyResult && (
          <div role="alert" data-variant={applyResult.ok ? "success" : "danger"} style={{ marginBlockEnd: "var(--space-4)" }}>
            {applyResult.ok ? "Config applied successfully." : applyResult.error}
          </div>
        )}
        {config.sites.length === 0 ? (
          <div className="align-center p-4">
            <p className="text-light">No sites yet. Add your first site to get started.</p>
            <button type="button" className="mt-4" onClick={addSite}>
              Add site
            </button>
          </div>
        ) : viewMode === "table" ? (
          <SitesTable
            sites={config.sites}
            onSwitchToCards={() => setViewMode("cards")}
            onRemove={removeSite}
          />
        ) : (
          <ul className="unstyled vstack" style={{ padding: 0, margin: 0, gap: 0 }}>
            {config.sites.map((site, i) => (
              <li key={i} style={{ listStyle: "none", borderBottom: "1px solid var(--border)", paddingBlockEnd: "var(--space-6)", marginBlockEnd: "var(--space-6)" }}>
                <SiteEditor site={site} onChange={(s) => updateSite(i, s)} onRemove={() => removeSite(i)} />
              </li>
            ))}
          </ul>
        )}
        <footer className="hstack gap-2 mt-6" style={{ paddingBlockStart: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
          <button type="button" className="outline" onClick={addSite}>Add site</button>
          <button type="button" className="outline" onClick={validate} disabled={!config.sites.length}>Validate</button>
          <button type="button" onClick={apply} disabled={!config.sites.length}>Apply config</button>
        </footer>
      </article>
    </>
  );
}

function SitesTable({
  sites,
  onSwitchToCards,
  onRemove,
}: {
  sites: Site[];
  onSwitchToCards: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="table" style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>Hostnames</th>
            <th>Routes</th>
            <th>Upstreams</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site, i) => (
            <tr key={i}>
              <td>{site.hostnames.filter(Boolean).join(", ") || "—"}</td>
              <td>{site.routes.map((r) => r.match).filter(Boolean).join(", ") || "—"}</td>
              <td>{site.routes.map((r) => r.upstreams.map((u) => u.address).join(", ")).filter(Boolean).join(" | ") || "—"}</td>
              <td style={{ textAlign: "right" }}>
                <span className="hstack gap-2 justify-end">
                  <button type="button" className="outline small" onClick={onSwitchToCards} title="Edit" aria-label="Edit site">
                    <PencilSimple size={18} weight="duotone" />
                  </button>
                  <button type="button" className="outline small" data-variant="danger" onClick={() => onRemove(i)} title="Remove" aria-label="Remove site">
                    <Trash size={18} weight="duotone" />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SiteEditor({
  site,
  onChange,
  onRemove,
}: {
  site: Site;
  onChange: (s: Site) => void;
  onRemove: () => void;
}) {
  const setHostnames = (hostnames: string[]) => onChange({ ...site, hostnames });
  const setRoutes = (routes: Route[]) => onChange({ ...site, routes });

  return (
    <section>
      <header className="hstack justify-between" style={{ flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div data-field style={{ flex: "1 1 12rem", marginBlockEnd: 0 }}>
          <label>Hostnames (comma-separated)</label>
          <input
            type="text"
            value={site.hostnames.join(", ")}
            placeholder="example.com, www.example.com"
            onChange={(e) => {
              const v = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              setHostnames(v.length ? v : [""]);
            }}
          />
        </div>
        <button type="button" className="outline small" data-variant="danger" onClick={onRemove} title="Remove site" aria-label="Remove site">
          <Trash size={18} weight="duotone" />
        </button>
      </header>
      <div className="vstack gap-4 mt-4">
        <h3 style={{ fontSize: "var(--text-4)", marginBlockEnd: 0 }}>Routes</h3>
        {site.routes.map((route, ri) => (
          <div key={ri} className="vstack gap-4" style={{ paddingBlockStart: "var(--space-4)", borderBlockStart: "1px solid var(--border)" }}>
            <div data-field>
              <label>Match path</label>
              <input
                type="text"
                value={route.match}
                placeholder="/ or /api/*"
                onChange={(e) =>
                  setRoutes(
                    site.routes.map((r, i) => (i === ri ? { ...r, match: e.target.value } : r))
                  )
                }
              />
            </div>
            <div data-field>
              <label>Upstreams (one per line: host:port)</label>
              <textarea
                value={route.upstreams.map((u) => u.address).join("\n")}
                placeholder="localhost:8080"
                onChange={(e) =>
                  setRoutes(
                    site.routes.map((r, i) =>
                      i === ri
                        ? {
                            ...r,
                            upstreams: e.target.value
                              .split("\n")
                              .map((a) => a.trim())
                              .filter(Boolean)
                              .map((address): Upstream => ({ address })),
                          }
                        : r
                    )
                  )
                }
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
