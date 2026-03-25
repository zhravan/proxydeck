import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, type ConfirmDialogHandle } from "../../components/ConfirmDialog";
import { OatFormModal, type OatFormModalHandle } from "../../components/OatFormModal";
import { createDomain, fetchDomainLookup } from "../hooks/useDomains";
import { DomainFormFields } from "./DomainForm";

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

function emptyFields() {
  return {
    hostname: "",
    registrarName: "",
    expiresAt: "",
    notes: "",
  };
}

export type AddDomainModalHandle = OatFormModalHandle;

/**
 * Add-domain flow in an Oat `<dialog>`; list page shows the table by default.
 */
export const AddDomainModal = forwardRef<AddDomainModalHandle, object>(function AddDomainModal(
  _props,
  forwardedRef
) {
  const navigate = useNavigate();
  const modalRef = useRef<OatFormModalHandle>(null);
  const saveDialogRef = useRef<ConfirmDialogHandle>(null);

  useImperativeHandle(forwardedRef, () => ({
    showModal: () => modalRef.current?.showModal(),
    close: () => modalRef.current?.close(),
  }));

  const [fields, setFields] = useState(emptyFields);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipPublicLookup, setSkipPublicLookup] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFields(emptyFields());
    setSubmitError(null);
    setSaving(false);
    setSkipPublicLookup(false);
    setLookupLoading(false);
    setLookupMessage(null);
  }, []);

  const handleModalClose = useCallback(() => {
    reset();
  }, [reset]);

  async function handlePrefetch() {
    setLookupMessage(null);
    const h = fields.hostname.trim();
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
    setFields((f) => ({
      ...f,
      registrarName: sug?.registrarName ?? f.registrarName,
      expiresAt: sug?.expiresAt ? isoToDateInput(sug.expiresAt) : f.expiresAt,
    }));
    const errs = result.enrichment.errors?.length
      ? ` Some steps reported issues: ${result.enrichment.errors.join("; ")}`
      : "";
    setLookupMessage(`Loaded public suggestions.${errs}`);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const expiresIso = dateInputToIso(fields.expiresAt);
    if (fields.expiresAt.trim() && expiresIso === null) {
      setSubmitError("Invalid expiry date.");
      return;
    }
    saveDialogRef.current?.showModal();
  }

  async function performCreate() {
    setSubmitError(null);
    setSaving(true);
    try {
      const expiresIso = dateInputToIso(fields.expiresAt);
      if (fields.expiresAt.trim() && expiresIso === null) {
        setSubmitError("Invalid expiry date.");
        return;
      }

      const result = await createDomain({
        hostname: fields.hostname.trim(),
        registrarName: fields.registrarName.trim() === "" ? null : fields.registrarName.trim(),
        expiresAt: expiresIso,
        notes: fields.notes === "" ? null : fields.notes,
        skipPublicLookup,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      modalRef.current?.close();
      reset();
      navigate(`/domains/${result.domain.id}`, { replace: true });
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
        title="Create domain?"
        message="Save this domain to your portfolio?"
        confirmLabel="Create"
        onConfirm={() => void performCreate()}
      />
      <OatFormModal
        ref={modalRef}
        title="Add domain"
        description={
          <>
            By default, saving runs a live <strong>RDAP</strong>, <strong>DNS</strong>, and <strong>TLS</strong>{" "}
            check and fills empty registrar / expiry fields from registry data.
          </>
        }
        onClose={handleModalClose}
        footer={
          <div className="hstack gap-2" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="outline" onClick={() => modalRef.current?.close()} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="pd-add-domain-form" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        }
      >
        <form id="pd-add-domain-form" className="vstack gap-4" onSubmit={(e) => void handleFormSubmit(e)}>
          {submitError && (
            <div role="alert" data-variant="danger">
              {submitError}
            </div>
          )}
          <div className="hstack gap-2" style={{ flexWrap: "wrap" }}>
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
            <p className="text-light" role="status" style={{ marginBlockEnd: 0 }}>
              {lookupMessage}
            </p>
          ) : null}
          <label className="hstack gap-2" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={skipPublicLookup}
              onChange={(e) => setSkipPublicLookup(e.target.checked)}
            />
            <span className="text-light">Save without public lookup (offline / privacy)</span>
          </label>
          <DomainFormFields
            hostname={fields.hostname}
            setHostname={(v) => setFields((f) => ({ ...f, hostname: v }))}
            registrarName={fields.registrarName}
            setRegistrarName={(v) => setFields((f) => ({ ...f, registrarName: v }))}
            expiresAt={fields.expiresAt}
            setExpiresAt={(v) => setFields((f) => ({ ...f, expiresAt: v }))}
            notes={fields.notes}
            setNotes={(v) => setFields((f) => ({ ...f, notes: v }))}
          />
        </form>
      </OatFormModal>
    </>
  );
});
