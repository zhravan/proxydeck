import { useEffect, useState } from "react";

export function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => setLines(Array.isArray(data.lines) ? data.lines : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <article className="card">
      <header>
        <h2>Logs</h2>
        <p>Proxy log output. Set PROXY_LOG_FILE to a log file path.</p>
      </header>
      <pre style={{ maxHeight: "60vh", overflow: "auto" }}>
        <code>{lines.join("\n")}</code>
      </pre>
    </article>
  );
}
