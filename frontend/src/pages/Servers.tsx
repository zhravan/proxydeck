import { Link } from "react-router-dom";
import { Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmDialogHandle } from "../components/ConfirmDialog";
import { OatFormModal, type OatFormModalHandle } from "../components/OatFormModal";
import type { InfrastructureServer } from "../types/infrastructureServer";
import { useDomains } from "./hooks/useDomains";
import { useServers } from "./hooks/useServers";

const PROVIDER_EXAMPLES = ["hetzner", "contabo", "aws_ec2", "digitalocean", "vultr"];

function emptyForm() {
  return {
    name: "",
    provider: "",
    region: "",
    environment: "",
    role: "",
    notes: "",
    consoleUrl: "",
    runbookUrl: "",
    tagsInput: "",
    linkedDomainIds: [] as string[],
  };
}

function serverToForm(s: InfrastructureServer) {
  return {
    name: s.name,
    provider: s.provider,
    region: s.region ?? "",
    environment: s.environment ?? "",
    role: s.role ?? "",
    notes: s.notes ?? "",
    consoleUrl: s.consoleUrl ?? "",
    runbookUrl: s.runbookUrl ?? "",
    tagsInput: (s.tags ?? []).join(", "),
    linkedDomainIds: [...(s.linkedDomainIds ?? [])],
  };
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function Servers() {
  const { servers, loading, error, create, update, remove } = useServers();
  const { domains, loading: domainsLoading } = useDomains();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const removeDialogRef = useRef<ConfirmDialogHandle>(null);
  const pendingRemoveId = useRef<string | null>(null);
  const serverModalRef = useRef<OatFormModalHandle>(null);

  const domainById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of domains) m.set(d.id, d.hostname);
    return m;
  }, [domains]);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    serverModalRef.current?.close();
  }, []);

  const openAddServerModal = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    serverModalRef.current?.showModal();
  }, []);

  const startEdit = useCallback((s: InfrastructureServer) => {
    setEditingId(s.id);
    setForm(serverToForm(s));
    setFormError(null);
    serverModalRef.current?.showModal();
  }, []);

  const requestRemove = useCallback((id: string) => {
    pendingRemoveId.current = id;
    removeDialogRef.current?.showModal();
  }, []);

  const confirmRemove = useCallback(async () => {
    const id = pendingRemoveId.current;
    pendingRemoveId.current = null;
    if (!id) return;
    const r = await remove(id);
    if (!r.ok) setFormError(r.error);
    else if (editingId === id) resetForm();
  }, [remove, editingId, resetForm]);

  const toggleDomainLink = useCallback((domainId: string) => {
    setForm((f) => {
      const set = new Set(f.linkedDomainIds);
      if (set.has(domainId)) set.delete(domainId);
      else set.add(domainId);
      return { ...f, linkedDomainIds: [...set] };
    });
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const name = form.name.trim();
      const provider = form.provider.trim();
      if (!name || !provider) {
        setFormError("Name and provider are required.");
        return;
      }
      const tags = parseTagsInput(form.tagsInput);
      const body = {
        name,
        provider,
        region: form.region.trim() || null,
        environment: form.environment.trim() || null,
        role: form.role.trim() || null,
        notes: form.notes.trim() || null,
        consoleUrl: form.consoleUrl.trim() || null,
        runbookUrl: form.runbookUrl.trim() || null,
        tags,
        linkedDomainIds: form.linkedDomainIds,
      };
      setSaving(true);
      try {
        if (editingId) {
          const r = await update(editingId, body);
          if (!r.ok) setFormError(r.error);
          else resetForm();
        } else {
          const r = await create(body);
          if (!r.ok) setFormError(r.error);
          else resetForm();
        }
      } finally {
        setSaving(false);
      }
    },
    [form, editingId, create, update, resetForm]
  );

  if (loading || domainsLoading) {
    return (
      <>
        <header className="pd-page-header">
          <h1>Servers</h1>
          <p className="text-light">
            Inventory of machines across providers (metadata only-do not store passwords or API keys here).
          </p>
        </header>
        <div className="card p-4">
          <p className="text-light align-center p-4">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ConfirmDialog
        ref={removeDialogRef}
        title="Remove server?"
        message="This only deletes the inventory record in Proxydeck, not the machine at your provider."
        confirmLabel="Remove"
        danger
        onConfirm={() => void confirmRemove()}
      />
      <OatFormModal
        ref={serverModalRef}
        title={editingId ? "Edit server" : "Add server"}
        description="Metadata only—do not store passwords or API keys. Console and runbook links must use https."
        onClose={() => {
          setForm(emptyForm());
          setEditingId(null);
          setFormError(null);
        }}
        footer={
          <div className="hstack gap-2" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="outline" onClick={() => serverModalRef.current?.close()}>
              Cancel
            </button>
            <button type="submit" form="pd-server-form" className="button" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add server"}
            </button>
          </div>
        }
      >
        <form id="pd-server-form" onSubmit={(e) => void onSubmit(e)} className="vstack gap-4">
          {formError && (
            <div role="alert" data-variant="danger">
              {formError}
            </div>
          )}
          <div className="vstack gap-4">
              <div data-field>
                <label htmlFor="srv-name">Name</label>
                <input
                  id="srv-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="off"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="prod-proxy-01"
                />
              </div>
              <div data-field>
                <label htmlFor="srv-provider">Provider</label>
                <input
                  id="srv-provider"
                  name="provider"
                  type="text"
                  required
                  list="srv-provider-examples"
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                  placeholder="e.g. hetzner, contabo, aws_ec2"
                />
                <datalist id="srv-provider-examples">
                  {PROVIDER_EXAMPLES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div data-field>
                <label htmlFor="srv-region">Region / datacenter (optional)</label>
                <input
                  id="srv-region"
                  name="region"
                  type="text"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="fsn1, eu-central-1, …"
                />
              </div>
              <div className="hstack gap-4" style={{ flexWrap: "wrap" }}>
                <div data-field style={{ flex: "1 1 10rem" }}>
                  <label htmlFor="srv-env">Environment (optional)</label>
                  <input
                    id="srv-env"
                    name="environment"
                    type="text"
                    value={form.environment}
                    onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
                    placeholder="production, staging"
                  />
                </div>
                <div data-field style={{ flex: "1 1 10rem" }}>
                  <label htmlFor="srv-role">Role (optional)</label>
                  <input
                    id="srv-role"
                    name="role"
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="reverse proxy, app"
                  />
                </div>
              </div>
              <div data-field>
                <label htmlFor="srv-tags">Tags (optional, comma-separated)</label>
                <input
                  id="srv-tags"
                  name="tags"
                  type="text"
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="cost-center-a, team-platform"
                />
              </div>
              <div data-field>
                <label htmlFor="srv-console">Console URL (optional, https only)</label>
                <input
                  id="srv-console"
                  name="consoleUrl"
                  type="url"
                  inputMode="url"
                  value={form.consoleUrl}
                  onChange={(e) => setForm((f) => ({ ...f, consoleUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div data-field>
                <label htmlFor="srv-runbook">Runbook URL (optional, https only)</label>
                <input
                  id="srv-runbook"
                  name="runbookUrl"
                  type="url"
                  inputMode="url"
                  value={form.runbookUrl}
                  onChange={(e) => setForm((f) => ({ ...f, runbookUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div data-field>
                <label htmlFor="srv-notes">Notes (optional)</label>
                <textarea
                  id="srv-notes"
                  name="notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {domains.length > 0 ? (
                <fieldset>
                  <legend style={{ fontSize: "var(--text-3)", marginBottom: "0.5rem" }}>
                    Linked portfolio domains (optional)
                  </legend>
                  <ul className="vstack gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {domains.map((d) => (
                      <li key={d.id}>
                        <label className="hstack gap-2" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={form.linkedDomainIds.includes(d.id)}
                            onChange={() => toggleDomainLink(d.id)}
                          />
                          <span>{d.hostname}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ) : (
                <p className="text-light" style={{ marginBlockEnd: 0 }}>
                  No domains in portfolio yet.{" "}
                  <Link to="/domains">Open Portfolio</Link> to add a domain, then link it here.
                </p>
              )}
            </div>
        </form>
      </OatFormModal>

      <header className="pd-page-header">
        <h1>Servers</h1>
        <p className="text-light">
          Track Hetzner, Contabo, AWS EC2, and other hosts in one place. Link entries to portfolio domains for
          context. Store secrets in a password manager—never here.
        </p>
        <div className="hstack gap-2 mt-4">
          <button
            type="button"
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            onClick={openAddServerModal}
          >
            <Plus size={20} weight="duotone" aria-hidden />
            Add server
          </button>
        </div>
      </header>

      {error && (
        <div className="card mb-4" role="alert" data-variant="danger">
          {error}
        </div>
      )}

      <div className="vstack gap-4">
        <section className="card" aria-labelledby="server-list-heading">
          <h2 id="server-list-heading" className="mb-4" style={{ fontSize: "var(--text-4)" }}>
            Inventory
          </h2>
          {servers.length === 0 ? (
            <p className="text-light" style={{ marginBlockEnd: 0 }}>
              No servers yet. Use <strong>Add server</strong> to create your first entry.
            </p>
          ) : (
            <div className="table pd-table-gridless" style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Provider</th>
                    <th>Region</th>
                    <th>Env</th>
                    <th>Role</th>
                    <th>Tags</th>
                    <th>Linked domains</th>
                    <th>Links</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {servers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        {s.notes ? (
                          <div className="text-light" style={{ fontSize: "var(--text-7)", marginTop: "0.25rem" }}>
                            {s.notes.length > 120 ? `${s.notes.slice(0, 120)}…` : s.notes}
                          </div>
                        ) : null}
                      </td>
                      <td>{s.provider}</td>
                      <td>{s.region ?? "-"}</td>
                      <td>{s.environment ?? "-"}</td>
                      <td>{s.role ?? "-"}</td>
                      <td>
                        {(s.tags ?? []).length ? (
                          <span style={{ fontSize: "var(--text-7)" }}>{(s.tags ?? []).join(", ")}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {(s.linkedDomainIds ?? []).length ? (
                          <ul style={{ margin: 0, paddingInlineStart: "1.1rem", fontSize: "var(--text-7)" }}>
                            {(s.linkedDomainIds ?? []).map((id) => (
                              <li key={id}>
                                {domainById.get(id) ? (
                                  <Link to={`/domains/${id}`}>{domainById.get(id)}</Link>
                                ) : (
                                  <span className="text-light" title="Domain may have been removed">
                                    ({id.slice(0, 8)}…)
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div className="vstack gap-1" style={{ fontSize: "var(--text-7)" }}>
                          {s.consoleUrl ? (
                            <a href={s.consoleUrl} target="_blank" rel="noopener noreferrer">
                              Console
                            </a>
                          ) : null}
                          {s.runbookUrl ? (
                            <a href={s.runbookUrl} target="_blank" rel="noopener noreferrer">
                              Runbook
                            </a>
                          ) : null}
                          {!s.consoleUrl && !s.runbookUrl ? "-" : null}
                        </div>
                      </td>
                      <td>
                        <div className="hstack gap-2">
                          <button
                            type="button"
                            className="small outline"
                            onClick={() => startEdit(s)}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="small outline"
                            onClick={() => requestRemove(s.id)}
                            title="Remove"
                            aria-label={`Remove ${s.name}`}
                          >
                            <Trash size={18} weight="duotone" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
