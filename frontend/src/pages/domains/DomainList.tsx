import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileArrowDown, Plus } from "@phosphor-icons/react";
import type { Domain } from "../../types/domain";
import {
  downloadPortfolioExport,
  postDomainsImport,
  type PortfolioImportSummary,
} from "../../lib/portfolioBackup";
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

function summarizeImport(s: PortfolioImportSummary): string {
  const bits = [
    s.dryRun ? "Dry run (no changes saved)." : "Done.",
    `created ${s.created}, updated ${s.updated}, skipped ${s.skipped}.`,
  ];
  if (s.errors.length) bits.push(`${s.errors.length} row(s) had errors.`);
  return bits.join(" ");
}

export function DomainList() {
  const { domains, loading, error, reload } = useDomains();
  const addDomainModalRef = useRef<AddDomainModalHandle>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [dupPolicy, setDupPolicy] = useState<"error" | "skip" | "update">("error");
  const [dryRunImport, setDryRunImport] = useState(true);

  const onExportJson = useCallback(async () => {
    setImportNote(null);
    const r = await downloadPortfolioExport("/api/domains/export?format=json");
    if (!r.ok) setImportNote(r.error);
  }, []);

  const onExportCsv = useCallback(async () => {
    setImportNote(null);
    const r = await downloadPortfolioExport("/api/domains/export?format=csv");
    if (!r.ok) setImportNote(r.error);
  }, []);

  const onImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setImportBusy(true);
      setImportNote(null);
      setImportErrors([]);
      try {
        const text = await file.text();
        const lower = file.name.toLowerCase();
        let body: Record<string, unknown>;
        if (lower.endsWith(".csv")) {
          body = {
            format: "csv",
            csv: text,
            dryRun: dryRunImport,
            onDuplicateHostname: dupPolicy,
          };
        } else {
          let parsed: unknown;
          try {
            parsed = JSON.parse(text) as unknown;
          } catch {
            setImportNote("Could not parse JSON.");
            return;
          }
          const arr = Array.isArray(parsed)
            ? parsed
            : parsed &&
                typeof parsed === "object" &&
                Array.isArray((parsed as { domains?: unknown }).domains)
              ? (parsed as { domains: unknown[] }).domains
              : null;
          if (!arr) {
            setImportNote('JSON must be an array of domains or an object with a "domains" array.');
            return;
          }
          body = {
            format: "json",
            domains: arr,
            dryRun: dryRunImport,
            onDuplicateHostname: dupPolicy,
          };
        }
        const r = await postDomainsImport(body);
        if (!r.ok) {
          setImportNote(r.error);
          return;
        }
        setImportErrors(r.summary.errors);
        setImportNote(summarizeImport(r.summary));
        if (!r.summary.dryRun && (r.summary.created > 0 || r.summary.updated > 0)) await reload();
      } finally {
        setImportBusy(false);
      }
    },
    [dryRunImport, dupPolicy, reload]
  );

  if (loading) {
    return (
      <>
        <header className="pd-page-header">
          <div className="pd-page-header__top">
            <div className="pd-page-header__intro">
              <h1>Domains</h1>
              <p className="text-light pd-page-header__lede">
                Your domain portfolio (separate from proxy site configuration).
              </p>
            </div>
          </div>
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
        <div className="hstack gap-2 mt-4" style={{ flexWrap: "wrap", alignItems: "center" }}>
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
          <button
            type="button"
            className="outline button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            onClick={() => void onExportJson()}
            title="Download JSON backup"
          >
            <FileArrowDown size={20} weight="duotone" aria-hidden />
            Export JSON
          </button>
          <button
            type="button"
            className="outline button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            onClick={() => void onExportCsv()}
            title="Download CSV backup"
          >
            <FileArrowDown size={20} weight="duotone" aria-hidden />
            Export CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            style={{ display: "none" }}
            aria-hidden
            tabIndex={-1}
            onChange={(ev) => void onImportFile(ev)}
          />
          <button
            type="button"
            className="outline button"
            disabled={importBusy}
            onClick={() => importInputRef.current?.click()}
            title="Import from JSON or CSV (validated)"
          >
            {importBusy ? "Importing…" : "Import…"}
          </button>
          <label className="hstack gap-1 text-light" style={{ fontSize: "var(--text-7)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dryRunImport}
              onChange={(e) => setDryRunImport(e.target.checked)}
            />
            Dry run
          </label>
          <label className="text-light" style={{ fontSize: "var(--text-7)", display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <span>If hostname exists:</span>
            <select
              value={dupPolicy}
              onChange={(e) => setDupPolicy(e.target.value as typeof dupPolicy)}
              aria-label="Duplicate hostname policy"
            >
              <option value="error">error</option>
              <option value="skip">skip row</option>
              <option value="update">update row</option>
            </select>
          </label>
        </div>
      </header>

      {error && (
        <div className="card mb-4" role="alert" data-variant="danger">
          {error}
        </div>
      )}

      {(importNote || importErrors.length > 0) && (
        <div className="card mb-4" role="status">
          {importNote ? <p style={{ marginBlockEnd: importErrors.length ? "0.75rem" : 0 }}>{importNote}</p> : null}
          {importErrors.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: "1.25rem", fontSize: "var(--text-7)" }}>
              {importErrors.slice(0, 20).map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
              {importErrors.length > 20 ? (
                <li className="text-light">…and {importErrors.length - 20} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

      <section className="card" aria-labelledby="domain-portfolio-heading">
        <h2 id="domain-portfolio-heading" className="mb-4 pd-section-title" style={{ fontSize: "var(--text-4)" }}>
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
