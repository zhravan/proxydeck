import { useEffect, useState } from "react";
import type { ProxyConfig, Site, Route, Upstream } from "../proxy/types";

const emptyConfig: ProxyConfig = { sites: [] };

export function Sites() {
  const [config, setConfig] = useState<ProxyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/current")
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

  const apply = () => {
    setApplyResult(null);
    fetch("/api/config/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setApplyResult)
      .catch((e) => setApplyResult({ ok: false, error: e.message }));
  };

  if (loading) return <p>Loading…</p>;

  return (
    <article className="card">
      <header>
        <h2>Sites</h2>
        <p>Configure hostnames and reverse proxy routes.</p>
      </header>
      {applyResult && (
        <div role="alert" data-variant={applyResult.ok ? "success" : "error"}>
          {applyResult.ok ? "Config applied." : applyResult.error}
        </div>
      )}
      {config.sites.length === 0 ? (
        <p>No sites. Add one below.</p>
      ) : (
        <ul className="unstyled">
          {config.sites.map((site, i) => (
            <li key={i} style={{ marginBottom: "1rem" }}>
              <SiteEditor
                site={site}
                onChange={(s) => updateSite(i, s)}
                onRemove={() => removeSite(i)}
              />
            </li>
          ))}
        </ul>
      )}
      <footer className="hstack" style={{ gap: "0.5rem" }}>
        <button type="button" className="outline" onClick={addSite}>
          Add site
        </button>
        <button type="button" onClick={apply}>
          Apply config
        </button>
      </footer>
    </article>
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
    <article className="card">
      <header className="hstack" style={{ justifyContent: "space-between" }}>
        <div>
          <label data-field>
            Hostnames (comma-separated)
            <input
              type="text"
              value={site.hostnames.join(", ")}
              onChange={(e) => {
                const v = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                setHostnames(v.length ? v : [""]);
              }}
            />
          </label>
        </div>
        <button type="button" className="outline small" data-variant="danger" onClick={onRemove}>
          Remove
        </button>
      </header>
      <div>
        <strong>Routes</strong>
        {site.routes.map((route, ri) => (
          <div key={ri} style={{ marginTop: "0.5rem" }}>
            <label data-field>
              Match path
              <input
                type="text"
                value={route.match}
                onChange={(e) =>
                  setRoutes(
                    site.routes.map((r, i) =>
                      i === ri ? { ...r, match: e.target.value } : r
                    )
                  )
                }
              />
            </label>
            <label data-field>
              Upstreams (one per line: host:port)
              <textarea
                value={route.upstreams.map((u) => u.address).join("\n")}
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
            </label>
          </div>
        ))}
      </div>
    </article>
  );
}
