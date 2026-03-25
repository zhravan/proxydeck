import { useRef } from "react";
import { Link } from "react-router-dom";
import { Plus } from "@phosphor-icons/react";
import type { Domain } from "../../types/domain";
import type { AddDomainModalHandle } from "./AddDomainModal";
import { AddDomainModal } from "./AddDomainModal";
import { useDomains } from "../hooks/useDomains";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function tlsValidTo(d: Domain): string {
  const v = d.enrichment?.ssl?.validTo;
  if (!v) return "-";
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return v;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DomainList() {
  const { domains, loading, error } = useDomains();
  const addDomainModalRef = useRef<AddDomainModalHandle>(null);

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Domains</h1>
          <p className="text-light">Your domain portfolio (separate from proxy site configuration).</p>
        </header>
        <div className="card p-4">
          <p className="text-light align-center p-4">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AddDomainModal ref={addDomainModalRef} />
      <header className="pd-page-header">
        <h1>Domains</h1>
        <p className="text-light">Your domain portfolio (separate from proxy site configuration).</p>
        <div className="hstack gap-2 mt-4">
          <button
            type="button"
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            onClick={() => addDomainModalRef.current?.showModal()}
          >
            <Plus size={20} weight="duotone" aria-hidden />
            Add domain
          </button>
          <Link to="/domains/servers" className="outline button">
            Servers
          </Link>
        </div>
      </header>

      {error && (
        <div className="card mb-4" role="alert" data-variant="danger">
          {error}
        </div>
      )}

      <section className="card" aria-labelledby="domain-portfolio-heading">
        <h2 id="domain-portfolio-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
          Portfolio
        </h2>
        {domains.length === 0 ? (
          <p className="text-light" style={{ marginBlockEnd: 0 }}>
            No domains yet.{" "}
            <button
              type="button"
              className="unstyled"
              style={{ color: "var(--pd-primary-tint)", textDecoration: "underline", cursor: "pointer" }}
              onClick={() => addDomainModalRef.current?.showModal()}
            >
              Add your first domain
            </button>
            .
          </p>
        ) : (
          <div className="table pd-table-gridless" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Registrar</th>
                  <th>Expires</th>
                  <th>TLS valid to (443)</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/domains/${d.id}`}>{d.hostname}</Link>
                    </td>
                    <td>{d.registrarName ?? "-"}</td>
                    <td>{formatDate(d.expiresAt)}</td>
                    <td>{tlsValidTo(d)}</td>
                    <td>
                      <Link to={`/domains/${d.id}/edit`} className="small outline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
