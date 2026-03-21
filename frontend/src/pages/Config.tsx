import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Preview {
  provider: string | null;
  raw: string;
}

interface HistoryEntry {
  id: string;
  createdAt: string;
  provider: string;
  comment: string | null;
}

export function Config() {
  const [preview, setPreview] = useState<Preview>({ provider: null, raw: "" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackResult, setRollbackResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/config/preview", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/config/history", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([p, h]) => {
        setPreview(p);
        setHistory(Array.isArray(h) ? h : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const rollback = (id: string) => {
    setRollbackResult(null);
    fetch("/api/config/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    })
      .then((r) => r.json())
      .then((r) => {
        setRollbackResult(r);
        if (r.ok) load();
      })
      .catch((e) => setRollbackResult({ ok: false, error: e.message }));
  };

  if (loading) {
    return (
      <>
        <header className="mb-6">
          <h1>Config</h1>
          <p className="text-light">Proxy — preview generated config and rollback history.</p>
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
        <h1>Config</h1>
        <p className="text-light">
          Proxy — preview of the config that will be applied. Edit and apply from <Link to="/proxy/sites">Sites</Link>.
        </p>
        <p className="hstack gap-2 mt-2">
          <Link to="/proxy/sites" className="button outline small" style={{ textDecoration: "none" }}>
            Edit & apply on Sites
          </Link>
        </p>
      </header>
      <article className="card">
        {preview.provider ? (
          <>
            <p className="hstack gap-2 mb-4">
              <span style={{ fontWeight: 600, marginBlockEnd: 0 }}>Preview</span>
              <span className="badge secondary">{preview.provider}</span>
            </p>
            <pre style={{ margin: 0, overflow: "auto" }}>
              <code>{preview.raw || "(empty)"}</code>
            </pre>
          </>
        ) : (
          <p className="text-light">No proxy detected. Config preview unavailable.</p>
        )}
        {rollbackResult && (
          <div role="alert" data-variant={rollbackResult.ok ? "success" : "danger"} className="mt-4">
            {rollbackResult.ok ? "Rolled back successfully." : rollbackResult.error}
          </div>
        )}
      </article>
      {history.length > 0 && (
        <section className="card mt-6" aria-labelledby="config-history-heading">
          <h2 id="config-history-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>History</h2>
          <p className="text-light mb-4">Roll back to a previous configuration.</p>
          <ul className="unstyled vstack gap-2" style={{ padding: 0, margin: 0 }}>
            {history.map((entry) => (
              <li key={entry.id} className="hstack gap-2" style={{ alignItems: "center", padding: "var(--space-3)", background: "var(--faint)", borderRadius: "var(--radius-medium)" }}>
                <span style={{ fontSize: "var(--text-7)" }}>{new Date(entry.createdAt).toLocaleString()}</span>
                <span className="badge secondary">{entry.provider}</span>
                <button type="button" className="outline small" onClick={() => rollback(entry.id)}>
                  Rollback
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
