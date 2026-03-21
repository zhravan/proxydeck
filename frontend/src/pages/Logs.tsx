import { useEffect, useState } from "react";

export function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setLines(Array.isArray(data.lines) ? data.lines : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <header className="mb-6">
          <h1>Logs</h1>
          <p className="text-light">Proxy — log output from your configured log file.</p>
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
        <h1>Logs</h1>
        <p className="text-light">Proxy — tail output when PROXY_LOG_FILE is set in the environment.</p>
      </header>
      <article className="card">
        {lines.length === 0 ? (
          <p className="text-light align-center p-4">No log lines. Set PROXY_LOG_FILE to a log file path.</p>
        ) : (
          <pre style={{ maxHeight: "60vh", overflow: "auto", margin: 0 }}>
            <code>{lines.join("\n")}</code>
          </pre>
        )}
      </article>
    </>
  );
}
