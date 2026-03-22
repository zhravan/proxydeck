import { PencilSimple, SquaresFour, Table, Trash } from "@phosphor-icons/react";
import type { Site, Route, Upstream } from "../types/proxy";
import { useSites } from "./hooks/useSites";

export function Sites() {
  const {
    config,
    loading,
    applying,
    viewMode,
    setViewMode,
    validateResult,
    applyResult,
    addSite,
    removeSite,
    updateSite,
    validate,
    apply,
  } = useSites();

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Sites</h1>
          <p className="text-light">
            Reverse proxy (Caddy/Traefik): add or remove sites anytime. Removing a site applies immediately. Use
            Apply with no sites to clear all proxy routes. The app on port 3000 is unchanged.
          </p>
        </header>
        <div className="card p-4">
          <p className="text-light align-center p-4">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>Sites</h1>
        <p className="text-light">
          Reverse proxy (Caddy/Traefik): add or remove sites anytime. Removing a site applies immediately. Use
          Apply with no sites to clear all proxy routes. The app on port 3000 is unchanged.
        </p>
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
            <p className="text-light">
              No sites in this list. Add a site below, or click <strong>Apply config</strong> to push an empty
              config and remove all proxy routes from Caddy/Traefik.
            </p>
            <button type="button" className="mt-4" onClick={addSite} disabled={applying}>
              Add site
            </button>
          </div>
        ) : viewMode === "table" ? (
          <SitesTable
            sites={config.sites}
            applying={applying}
            onSwitchToCards={() => setViewMode("cards")}
            onRemove={removeSite}
          />
        ) : (
          <ul className="pd-site-list">
            {config.sites.map((site, i) => (
              <li key={i}>
                <SiteEditor
                  site={site}
                  applying={applying}
                  onChange={(s) => updateSite(i, s)}
                  onRemove={() => void removeSite(i)}
                />
              </li>
            ))}
          </ul>
        )}
        <footer className="hstack gap-2 pd-footer-actions">
          <button type="button" className="outline" onClick={addSite} disabled={applying}>
            Add site
          </button>
          <button type="button" className="outline" onClick={validate} disabled={applying}>
            Validate
          </button>
          <button type="button" onClick={apply} disabled={applying}>
            Apply config
          </button>
        </footer>
      </article>
    </>
  );
}

function SitesTable({
  sites,
  applying,
  onSwitchToCards,
  onRemove,
}: {
  sites: Site[];
  applying: boolean;
  onSwitchToCards: () => void;
  onRemove: (index: number) => void | Promise<void>;
}) {
  return (
    <div className="table pd-table-gridless" style={{ overflowX: "auto" }}>
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
              <td>{site.hostnames.filter(Boolean).join(", ") || ":"}</td>
              <td>{site.routes.map((r) => r.match).filter(Boolean).join(", ") || ":"}</td>
              <td>{site.routes.map((r) => r.upstreams.map((u) => u.address).join(", ")).filter(Boolean).join(" | ") || ":"}</td>
              <td style={{ textAlign: "right" }}>
                <span className="hstack gap-2 justify-end">
                  <button type="button" className="outline small" onClick={onSwitchToCards} title="Edit" aria-label="Edit site">
                    <PencilSimple size={18} weight="duotone" />
                  </button>
                  <button
                    type="button"
                    className="outline small"
                    data-variant="danger"
                    disabled={applying}
                    onClick={() => void onRemove(i)}
                    title="Remove"
                    aria-label="Remove site"
                  >
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
  applying,
  onChange,
  onRemove,
}: {
  site: Site;
  applying: boolean;
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
        <button
          type="button"
          className="outline small"
          data-variant="danger"
          disabled={applying}
          onClick={onRemove}
          title="Remove site"
          aria-label="Remove site"
        >
          <Trash size={18} weight="duotone" />
        </button>
      </header>
      <div className="vstack gap-4 mt-4">
        <h3 style={{ fontSize: "var(--text-4)", marginBlockEnd: 0 }}>Routes</h3>
        {site.routes.map((route, ri) => (
          <div key={ri} className="vstack gap-4 pd-route-group">
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
            <div data-field className="pd-mono">
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
