import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Domain } from "../../types/domain";
import { createDomain, fetchDomainLookup, updateDomain, useDomain } from "../hooks/useDomains";

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

function DomainFormFields({
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

function NewDomainForm() {
  const navigate = useNavigate();
  const [hostname, setHostname] = useState("");
  const [registrarName, setRegistrarName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipPublicLookup, setSkipPublicLookup] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  async function handlePrefetch() {
    setLookupMessage(null);
    const h = hostname.trim();
    if (!h) {
      setLookupMessage("Enter a hostname first.");
      return;
    }
    setLookupLoading(true);
    const result = await fetchDomainLookup(h);
    setLookupLoading(false);
    if (!result.ok) {
      setLookupMessage(result.error);
      return;
    }
    const sug = result.enrichment.suggested;
    if (sug?.registrarName) setRegistrarName(sug.registrarName);
    if (sug?.expiresAt) setExpiresAt(isoToDateInput(sug.expiresAt));
    const errs = result.enrichment.errors?.length
      ? ` Some steps reported issues: ${result.enrichment.errors.join("; ")}`
      : "";
    setLookupMessage(`Loaded public suggestions.${errs}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSaving(true);
    const expiresIso = dateInputToIso(expiresAt);
    if (expiresAt.trim() && expiresIso === null) {
      setSubmitError("Invalid expiry date.");
      setSaving(false);
      return;
    }

    const result = await createDomain({
      hostname: hostname.trim(),
      registrarName: registrarName.trim() === "" ? null : registrarName.trim(),
      expiresAt: expiresIso,
      notes: notes === "" ? null : notes,
      skipPublicLookup,
    });
    setSaving(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    navigate(`/domains/${result.domain.id}`, { replace: true });
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>Add domain</h1>
        <p className="text-light">
          <Link to="/domains">← Portfolio</Link>
        </p>
      </header>
      <form className="card p-4" onSubmit={(e) => void handleSubmit(e)}>
        {submitError && (
          <div role="alert" data-variant="danger" style={{ marginBlockEnd: "var(--space-4)" }}>
            {submitError}
          </div>
        )}
        <p className="text-light" style={{ marginBlockEnd: "var(--space-4)" }}>
          By default, saving runs a live <strong>RDAP</strong>, <strong>DNS</strong>, and <strong>TLS</strong> check
          and fills empty registrar / expiry fields from registry data. A snapshot is stored on the domain for the
          detail view.
        </p>
        <div className="hstack gap-2" style={{ marginBlockEnd: "var(--space-4)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="outline"
            disabled={lookupLoading || saving}
            onClick={() => void handlePrefetch()}
          >
            {lookupLoading ? "Fetching…" : "Prefetch public records"}
          </button>
        </div>
        {lookupMessage ? (
          <p className="text-light" role="status" style={{ marginBlockEnd: "var(--space-4)" }}>
            {lookupMessage}
          </p>
        ) : null}
        <label className="hstack gap-2" style={{ marginBlockEnd: "var(--space-4)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={skipPublicLookup}
            onChange={(e) => setSkipPublicLookup(e.target.checked)}
          />
          <span className="text-light">Save without public lookup (offline / privacy)</span>
        </label>
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
            {saving ? "Saving…" : "Create"}
          </button>
          <Link to="/domains" className="button outline">
            Cancel
          </Link>
        </footer>
      </form>
    </>
  );
}

function EditDomainForm({ domain }: { domain: Domain }) {
  const navigate = useNavigate();
  const [hostname, setHostname] = useState(() => domain.hostname);
  const [registrarName, setRegistrarName] = useState(() => domain.registrarName ?? "");
  const [expiresAt, setExpiresAt] = useState(() => isoToDateInput(domain.expiresAt));
  const [notes, setNotes] = useState(() => domain.notes ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSaving(true);
    const expiresIso = dateInputToIso(expiresAt);
    if (expiresAt.trim() && expiresIso === null) {
      setSubmitError("Invalid expiry date.");
      setSaving(false);
      return;
    }

    const patch: Parameters<typeof updateDomain>[1] = {
      hostname: hostname.trim(),
      registrarName: registrarName.trim() === "" ? null : registrarName.trim(),
      expiresAt: expiresIso,
      notes: notes === "" ? null : notes,
    };
    const result = await updateDomain(domain.id, patch);
    setSaving(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    navigate(`/domains/${domain.id}`, { replace: true });
  }

  return (
    <>
      <header className="pd-page-header">
        <h1>Edit domain</h1>
        <p className="text-light">
          <Link to={`/domains/${domain.id}`}>← {domain.hostname}</Link>
        </p>
      </header>
      <form className="card p-4" onSubmit={(e) => void handleSubmit(e)}>
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

export function DomainForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { domain, loading, error: loadError } = useDomain(id);

  if (isEdit && loading) {
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

  if (isEdit && loadError) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Edit domain</h1>
        </header>
        <div className="card p-4" role="alert" data-variant="danger">
          <p>{loadError}</p>
          <p className="mt-4" style={{ marginBlockEnd: 0 }}>
            <Link to="/domains">Back to list</Link>
          </p>
        </div>
      </>
    );
  }

  if (isEdit && domain) {
    return <EditDomainForm key={domain.id} domain={domain} />;
  }

  return <NewDomainForm />;
}
