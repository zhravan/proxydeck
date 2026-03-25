import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDomainBreadcrumbLabel } from "../../components/breadcrumbs/BreadcrumbContext";
import { ConfirmDialog, type ConfirmDialogHandle } from "../../components/ConfirmDialog";
import type { Domain } from "../../types/domain";
import { updateDomain, useDomain } from "../hooks/useDomains";

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function DomainFormFields({
  hostname,
  setHostname,
  registrarName,
  setRegistrarName,
  expiresAt,
  setExpiresAt,
  notes,
  setNotes,
}: {
  hostname: string;
  setHostname: (v: string) => void;
  registrarName: string;
  setRegistrarName: (v: string) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <div className="vstack gap-4">
      <div data-field>
        <label htmlFor="domain-hostname">Hostname</label>
        <input
          id="domain-hostname"
          name="hostname"
          type="text"
          required
          autoComplete="off"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="example.com"
        />
      </div>
      <div data-field>
        <label htmlFor="domain-registrar">Registrar (optional)</label>
        <input
          id="domain-registrar"
          name="registrarName"
          type="text"
          autoComplete="organization"
          value={registrarName}
          onChange={(e) => setRegistrarName(e.target.value)}
        />
      </div>
      <div data-field>
        <label htmlFor="domain-expires">Expiry date (optional)</label>
        <input
          id="domain-expires"
          name="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <div data-field>
        <label htmlFor="domain-notes">Notes (optional)</label>
        <textarea
          id="domain-notes"
          name="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}

function EditDomainForm({ domain }: { domain: Domain }) {
  const navigate = useNavigate();
  useDomainBreadcrumbLabel(domain.hostname);
  const [hostname, setHostname] = useState(() => domain.hostname);
  const [registrarName, setRegistrarName] = useState(() => domain.registrarName ?? "");
  const [expiresAt, setExpiresAt] = useState(() => isoToDateInput(domain.expiresAt));
  const [notes, setNotes] = useState(() => domain.notes ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveDialogRef = useRef<ConfirmDialogHandle>(null);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const expiresIso = dateInputToIso(expiresAt);
    if (expiresAt.trim() && expiresIso === null) {
      setSubmitError("Invalid expiry date.");
      return;
    }
    saveDialogRef.current?.showModal();
  }

  async function performSave() {
    setSubmitError(null);
    setSaving(true);
    try {
      const expiresIso = dateInputToIso(expiresAt);
      if (expiresAt.trim() && expiresIso === null) {
        setSubmitError("Invalid expiry date.");
        return;
      }

      const patch: Parameters<typeof updateDomain>[1] = {
        hostname: hostname.trim(),
        registrarName: registrarName.trim() === "" ? null : registrarName.trim(),
        expiresAt: expiresIso,
        notes: notes === "" ? null : notes,
      };
      const result = await updateDomain(domain.id, patch);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      navigate(`/domains/${domain.id}`, { replace: true });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        ref={saveDialogRef}
        title="Save changes?"
        message="Update this domain in your portfolio?"
        confirmLabel="Save"
        onConfirm={() => void performSave()}
      />
      <header className="pd-page-header">
        <h1>Edit domain</h1>
      </header>
      <form className="card p-4" onSubmit={(e) => void handleFormSubmit(e)}>
        {submitError && (
          <div role="alert" data-variant="danger" style={{ marginBlockEnd: "var(--space-4)" }}>
            {submitError}
          </div>
        )}
        <DomainFormFields
          hostname={hostname}
          setHostname={setHostname}
          registrarName={registrarName}
          setRegistrarName={setRegistrarName}
          expiresAt={expiresAt}
          setExpiresAt={setExpiresAt}
          notes={notes}
          setNotes={setNotes}
        />
        <footer className="hstack gap-2 pd-footer-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <Link to={`/domains/${domain.id}`} className="button outline">
            Cancel
          </Link>
        </footer>
      </form>
    </>
  );
}

/** Edit flow only; add domain uses `AddDomainModal` on the portfolio list. */
export function DomainForm() {
  const { id } = useParams<{ id: string }>();
  const { domain, loading, error: loadError } = useDomain(id);

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Edit domain</h1>
        </header>
        <div className="card p-4">
          <p className="text-light">Loading…</p>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Edit domain</h1>
        </header>
        <div className="card p-4" role="alert" data-variant="danger">
          <p style={{ marginBlockEnd: 0 }}>{loadError}</p>
        </div>
      </>
    );
  }

  if (domain) {
    return <EditDomainForm key={domain.id} domain={domain} />;
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>Edit domain</h1>
      </header>
      <div className="card p-4" role="alert" data-variant="danger">
        <p style={{ marginBlockEnd: 0 }}>Domain not found.</p>
        <Link to="/domains" className="button outline mt-4">
          Back to portfolio
        </Link>
      </div>
    </>
  );
}
