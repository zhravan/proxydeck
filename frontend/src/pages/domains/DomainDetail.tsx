import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowsClockwise, PencilSimple, Trash } from "@phosphor-icons/react";
import { deleteDomain, refreshDomainPublic, useDomain } from "../hooks/useDomains";
import { DomainEnrichmentPanel } from "./DomainEnrichmentPanel";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { domain, loading, error, reload } = useDomain(id);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshPublic() {
    if (!id) return;
    setRefreshError(null);
    setRefreshing(true);
    const result = await refreshDomainPublic(id);
    setRefreshing(false);
    if (!result.ok) {
      setRefreshError(result.error);
      return;
    }
    await reload();
  }

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm(`Remove ${domain?.hostname ?? "this domain"} from your portfolio?`)) return;
    setDeleteError(null);
    setDeleting(true);
    const result = await deleteDomain(id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error);
      await reload();
      return;
    }
    navigate("/domains", { replace: true });
  }

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Domain</h1>
        </header>
        <div className="card p-4">
          <p className="text-light">Loading…</p>
        </div>
      </>
    );
  }

  if (error || !domain) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Domain</h1>
          <p className="text-light">
            <Link to="/domains">← Portfolio</Link>
          </p>
        </header>
        <div className="card" role="alert" data-variant="danger">
          {error ?? "Not found"}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>{domain.hostname}</h1>
        <p className="text-light">
          <Link to="/domains">← Portfolio</Link>
        </p>
        <div className="hstack gap-2 mt-4">
          <Link
            to={`/domains/${domain.id}/edit`}
            className="button small"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <PencilSimple size={18} weight="duotone" aria-hidden />
            Edit
          </Link>
          <button
            type="button"
            className="outline small"
            disabled={refreshing}
            onClick={() => void handleRefreshPublic()}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <ArrowsClockwise size={18} weight="duotone" aria-hidden />
            {refreshing ? "Refreshing…" : "Refresh public records"}
          </button>
          <button
            type="button"
            className="outline small"
            data-variant="danger"
            disabled={deleting}
            onClick={() => void handleDelete()}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Trash size={18} weight="duotone" aria-hidden />
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </header>

      {deleteError && (
        <div className="card mb-4" role="alert" data-variant="danger">
          {deleteError}
        </div>
      )}

      {refreshError && (
        <div className="card mb-4" role="alert" data-variant="danger">
          {refreshError}
        </div>
      )}

      <section className="card p-4">
        <div className="vstack gap-4">
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Registrar
            </div>
            <div>{domain.registrarName ?? "—"}</div>
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Expiry
            </div>
            <div>{formatDateTime(domain.expiresAt)}</div>
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Notes
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{domain.notes ?? "—"}</div>
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Created
            </div>
            <div>{formatDateTime(domain.createdAt)}</div>
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Updated
            </div>
            <div>{formatDateTime(domain.updatedAt)}</div>
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Public snapshot
            </div>
            <div>{formatDateTime(domain.enrichedAt)}</div>
          </div>
        </div>
      </section>

      <section className="card p-4 mt-4" aria-labelledby="domain-enrichment-heading">
        <h2 id="domain-enrichment-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
          DNS, TLS &amp; RDAP snapshot
        </h2>
        <DomainEnrichmentPanel enrichment={domain.enrichment} />
      </section>
    </>
  );
}
