export function Domains() {
  return (
    <>
      <header className="mb-6">
        <h1>Domains</h1>
        <p className="text-light">
          Your domain name portfolio. This area is separate from reverse proxy configuration under{" "}
          <strong>Proxy</strong>.
        </p>
      </header>

      <section className="card" aria-labelledby="domains-placeholder-heading">
        <h2 id="domains-placeholder-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
          Portfolio
        </h2>
        <p className="text-light" style={{ marginBlockEnd: 0 }}>
          Domain list, add/edit, and API-backed storage will land here next (see{" "}
          <code>docs/domain-portfolio-phases.md</code>, Phase 1). For now, use <strong>Proxy → Sites</strong>{" "}
          to manage hostnames served by Caddy or Traefik.
        </p>
      </section>
    </>
  );
}
