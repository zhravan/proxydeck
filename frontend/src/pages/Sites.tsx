import { PencilSimple, Plus, SquaresFour, Table, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog, type ConfirmDialogHandle } from "../components/ConfirmDialog";
import { OatFormModal, type OatFormModalHandle } from "../components/OatFormModal";
import type { Site, Route, Upstream } from "../types/proxy";
import type { PdDraftSiteLocationState } from "./domains/buildDraftSiteFromDomain";
import { createEmptySite, useSites } from "./hooks/useSites";

function readPdDraftFromLocationState(state: unknown) {
  if (state === null || typeof state !== "object" || !("pdDraftSite" in state)) return null;
  const raw = (state as PdDraftSiteLocationState).pdDraftSite;
  if (!raw || typeof raw !== "object" || !("site" in raw) || !("domainId" in raw)) return null;
  return raw;
}

export function Sites() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navDraft] = useState(() => readPdDraftFromLocationState(location.state));
  const clearedLocationRef = useRef(false);
  const removeDialogRef = useRef<ConfirmDialogHandle>(null);
  const pendingRemoveRef = useRef<number | null>(null);
  const applyDialogRef = useRef<ConfirmDialogHandle>(null);
  const addSiteModalRef = useRef<OatFormModalHandle>(null);
  const [draftSite, setDraftSite] = useState<Site>(() => createEmptySite());

  const {
    config,
    loading,
    applying,
    viewMode,
    setViewMode,
    validateResult,
    applyResult,
    draftHostnamesOverlap,
    appendSite,
    removeSite,
    updateSite,
    validate,
    apply,
  } = useSites({ pendingSite: navDraft?.site ?? null });

  const openAddSiteModal = useCallback(() => {
    setDraftSite(createEmptySite());
    addSiteModalRef.current?.showModal();
  }, []);

  const handleAddSiteModalClose = useCallback(() => {
    setDraftSite(createEmptySite());
  }, []);

  const submitDraftSite = useCallback(() => {
    appendSite(draftSite);
    addSiteModalRef.current?.close();
    setDraftSite(createEmptySite());
  }, [appendSite, draftSite]);

  const requestRemoveSite = useCallback((index: number) => {
    pendingRemoveRef.current = index;
    removeDialogRef.current?.showModal();
  }, []);

  const confirmRemoveSite = useCallback(() => {
    const i = pendingRemoveRef.current;
    pendingRemoveRef.current = null;
    if (i !== null) void removeSite(i);
  }, [removeSite]);

  useEffect(() => {
    if (loading || !navDraft || clearedLocationRef.current) return;
    clearedLocationRef.current = true;
    navigate(location.pathname, { replace: true, state: {} });
  }, [loading, location.pathname, navDraft, navigate]);

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
      <ConfirmDialog
        ref={removeDialogRef}
        title="Remove site?"
        message="This applies to the proxy immediately."
        confirmLabel="Remove"
        danger
        onConfirm={confirmRemoveSite}
      />
      <ConfirmDialog
        ref={applyDialogRef}
        title="Apply configuration?"
        message="Push the current site list to the proxy?"
        confirmLabel="Apply"
        onConfirm={() => void apply()}
      />
      <OatFormModal
        ref={addSiteModalRef}
        title="Add site"
        description="Define hostnames and at least one route with upstreams. Nothing is sent to the proxy until you use Apply config."
        onClose={handleAddSiteModalClose}
        footer={
          <div className="hstack gap-2" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="outline" onClick={() => addSiteModalRef.current?.close()}>
              Cancel
            </button>
            <button type="button" onClick={submitDraftSite} disabled={applying}>
              Add to list
            </button>
          </div>
        }
      >
        <SiteEditor
          site={draftSite}
          applying={applying}
          showRemove={false}
          onChange={setDraftSite}
          onRemove={() => {}}
        />
      </OatFormModal>
      <header className="pd-page-header">
        <h1>Sites</h1>
        <p className="text-light">
          Reverse proxy (Caddy/Traefik): add or remove sites anytime. Removing a site applies immediately. Use
          Apply with no sites to clear all proxy routes. The app on port 3000 is unchanged.
        </p>
        <div className="hstack gap-2 mt-4">
          <button
            type="button"
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            onClick={openAddSiteModal}
            disabled={applying}
          >
            <Plus size={20} weight="duotone" aria-hidden />
            Add site
          </button>
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
        {draftHostnamesOverlap ? (
          <div role="status" className="text-light" style={{ marginBlockEnd: "var(--space-4)" }}>
            Some hostnames from this draft may already be routed on another site. Review before Apply.
          </div>
        ) : null}
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
              No sites in this list. Use <strong>Add site</strong> to define hostnames and routes, or click{" "}
              <strong>Apply config</strong> to push an empty config and remove all proxy routes from Caddy/Traefik.
            </p>
            <button type="button" className="mt-4" onClick={openAddSiteModal} disabled={applying}>
              Add site
            </button>
          </div>
        ) : viewMode === "table" ? (
          <SitesTable
            sites={config.sites}
            applying={applying}
            onSwitchToCards={() => setViewMode("cards")}
            onRemove={requestRemoveSite}
          />
        ) : (
          <ul className="pd-site-list">
            {config.sites.map((site, i) => (
              <li key={i}>
                <SiteEditor
                  site={site}
                  applying={applying}
                  onChange={(s) => updateSite(i, s)}
                  onRemove={() => requestRemoveSite(i)}
                />
              </li>
            ))}
          </ul>
        )}
        <footer className="hstack gap-2 pd-footer-actions">
          <button type="button" className="outline" onClick={openAddSiteModal} disabled={applying}>
            Add site
          </button>
          <button type="button" className="outline" onClick={validate} disabled={applying}>
            Validate
          </button>
          <button type="button" onClick={() => applyDialogRef.current?.showModal()} disabled={applying}>
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
  showRemove = true,
}: {
  site: Site;
  applying: boolean;
  onChange: (s: Site) => void;
  onRemove: () => void;
  /** When false (e.g. add-site modal), the remove control is hidden. */
  showRemove?: boolean;
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
        {showRemove ? (
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
        ) : null}
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
