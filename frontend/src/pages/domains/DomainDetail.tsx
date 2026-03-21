import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowsClockwise,
  ArrowSquareOut,
  CalendarBlank,
  CaretDown,
  CaretUp,
  Certificate,
  ClockCounterClockwise,
  Globe,
  HardDrives,
  IdentificationCard,
  Info,
  ListBullets,
  PencilSimple,
  TreeStructure,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { deleteDomain, refreshDomainPublic, useDomain } from "../hooks/useDomains";
import {
  buildHostnameOverview,
  buildTargetRows,
  effectiveExpiry,
  effectiveRegistrar,
  formatDateOnly,
  formatDateTimeShort,
  monthsUntilExpiryLabel,
  pickRdapEventDate,
  REG_ACTIONS,
  RENEW_ACTIONS,
  sortRdapEventsDesc,
} from "./domainDetailUtils";
import "./DomainDetail.css";

const TARGETS_PREVIEW = 8;
const SNAPSHOT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

type DnsTab = "ns" | "mx" | "txt";

function DnsTabsCard(props: {
  ns: string[];
  mx: { exchange: string; priority: number }[];
  txt: string[];
}) {
  const [tab, setTab] = useState<DnsTab>("ns");
  const { ns, mx, txt } = props;

  return (
    <div className="pd-domain-detail__cell pd-domain-detail__cell--md">
      <div className="pd-domain-detail__card-head">
        <h2>DNS records</h2>
        <ListBullets className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
      </div>
      <div className="pd-domain-detail__dns-seg" role="tablist" aria-label="DNS record type">
        {(
          [
            ["ns", "NS"] as const,
            ["mx", "MX"] as const,
            ["txt", "TXT"] as const,
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="pd-domain-detail__dns-tab"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "ns" && (
        <ul className="pd-domain-detail__list-plain">
          {ns.length ? (
            ns.map((x) => <li key={x}>{x}</li>)
          ) : (
            <li className="pd-domain-detail__muted">None in snapshot</li>
          )}
        </ul>
      )}
      {tab === "mx" && (
        <ul className="pd-domain-detail__list-plain">
          {mx.length ? (
            mx.map((m) => (
              <li key={`${m.priority}-${m.exchange}`}>
                {m.exchange.replace(/\.$/, "")}{" "}
                <span className="pd-domain-detail__muted">(priority {m.priority})</span>
              </li>
            ))
          ) : (
            <li className="pd-domain-detail__muted">None in snapshot</li>
          )}
        </ul>
      )}
      {tab === "txt" && (
        <ul className="pd-domain-detail__list-plain">
          {txt.length ? (
            txt.slice(0, 20).map((x, i) => <li key={`${i}-${x.slice(0, 40)}`}>{x}</li>)
          ) : (
            <li className="pd-domain-detail__muted">None in snapshot</li>
          )}
          {txt.length > 20 ? (
            <li className="pd-domain-detail__muted">+{txt.length - 20} more…</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function snapshotChipLabel(enrichedAtIso: string | null | undefined, fetchedAtIso: string | undefined): {
  text: string;
  variant: "ok" | "stale";
} {
  const raw = enrichedAtIso ?? fetchedAtIso;
  if (!raw) return { text: "No snapshot", variant: "stale" };
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return { text: "Snapshot", variant: "ok" };
  if (Date.now() - t > SNAPSHOT_STALE_MS) return { text: "Snapshot aging", variant: "stale" };
  return { text: "Snapshot fresh", variant: "ok" };
}

export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { domain, loading, error, reload } = useDomain(id);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [targetsExpanded, setTargetsExpanded] = useState(false);

  const enrichment = domain?.enrichment ?? null;
  const rdap = enrichment?.rdap;
  const dns = enrichment?.dns;
  const host = enrichment?.host;

  const overviewHosts = useMemo(
    () => (domain ? buildHostnameOverview(domain.hostname, enrichment) : []),
    [domain, enrichment]
  );

  const targetRows = useMemo(() => (domain ? buildTargetRows(domain.hostname, enrichment) : []), [domain, enrichment]);

  const visibleTargets = targetsExpanded ? targetRows : targetRows.slice(0, TARGETS_PREVIEW);
  const canExpandTargets = targetRows.length > TARGETS_PREVIEW;

  const historyEvents = useMemo(() => sortRdapEventsDesc(rdap?.events ?? []), [rdap?.events]);

  const chip = useMemo(
    () => snapshotChipLabel(domain?.enrichedAt, enrichment?.fetchedAt),
    [domain?.enrichedAt, enrichment?.fetchedAt]
  );

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
      <div className="pd-domain-detail__shell" aria-busy="true" aria-label="Loading domain">
        <div className="pd-domain-detail__skeleton pd-domain-detail__skeleton--title" />
        <div className="pd-domain-detail__skeleton pd-domain-detail__skeleton--line" />
        <div className="pd-domain-detail__skeleton pd-domain-detail__skeleton--line" style={{ maxWidth: "22rem" }} />
        <div className="pd-domain-detail__skeleton pd-domain-detail__skeleton--line" style={{ maxWidth: "18rem" }} />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="pd-domain-detail__shell">
        <header className="pd-page-header" style={{ marginBlockEnd: "1rem" }}>
          <h1>Domain</h1>
          <p className="text-light">
            <Link to="/domains">← Portfolio</Link>
          </p>
        </header>
        <div className="pd-domain-detail__error-card" role="alert">
          {error ?? "Not found"}
        </div>
      </div>
    );
  }

  const expiryIso = effectiveExpiry(domain);
  const expiryLabel = monthsUntilExpiryLabel(expiryIso);
  const registrarDisplay = effectiveRegistrar(domain);
  const regEvents = rdap?.events;
  const registeredAt = pickRdapEventDate(regEvents, REG_ACTIONS);
  const rdapUpdatedAt = pickRdapEventDate(regEvents, RENEW_ACTIONS);

  const visitUrl = `https://${domain.hostname.replace(/^https?:\/\//i, "")}`;

  const hostLine =
    [host?.city, host?.region, host?.country].filter(Boolean).join(", ") || (host?.country ?? "—");

  const snapshotTime = domain.enrichedAt ?? enrichment?.fetchedAt;

  return (
    <div className="pd-domain-detail">
      <header className="pd-domain-detail__hero">
        <div className="pd-domain-detail__hero-inner">
          <div className="pd-domain-detail__title-block">
            <div className="pd-domain-detail__title-icon" aria-hidden>
              <Globe size={26} weight="duotone" />
            </div>
            <div className="pd-domain-detail__title-text">
              <h1>{domain.hostname}</h1>
              <p className="pd-domain-detail__breadcrumb">
                <Link to="/domains">Portfolio</Link>
                <span className="pd-domain-detail__muted">/</span>
                <span className="pd-domain-detail__muted">Domain detail</span>
              </p>
              <div className="pd-domain-detail__meta">
                <span
                  className={`pd-domain-detail__chip pd-domain-detail__chip--${chip.variant === "ok" ? "ok" : "stale"}`}
                >
                  {chip.text}
                </span>
                {snapshotTime ? (
                  <span>
                    Last enriched <time dateTime={snapshotTime}>{formatDateTimeShort(snapshotTime)}</time>
                  </span>
                ) : (
                  <span>Run refresh to pull public DNS, RDAP &amp; TLS</span>
                )}
              </div>
            </div>
          </div>
          <div className="pd-domain-detail__toolbar">
            <button
              type="button"
              className="small pd-domain-detail__btn-delete"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              <Trash size={18} weight="duotone" aria-hidden />
              {deleting ? "Removing…" : "Delete"}
            </button>
            <a className="button small pd-domain-detail__btn-visit" href={visitUrl} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={18} weight="duotone" aria-hidden />
              Visit
            </a>
            <Link to={`/domains/${domain.id}/edit`} className="button small pd-domain-detail__btn-edit">
              <PencilSimple size={18} weight="duotone" aria-hidden />
              Edit
            </Link>
            <button
              type="button"
              className="small pd-domain-detail__btn-ghost"
              disabled={refreshing}
              onClick={() => void handleRefreshPublic()}
            >
              <ArrowsClockwise size={18} weight="duotone" aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </header>

      {deleteError ? (
        <div className="pd-domain-detail__banner pd-domain-detail__banner--danger" role="alert">
          <Warning className="pd-domain-detail__banner-icon" size={22} weight="fill" aria-hidden />
          <div className="pd-domain-detail__banner-body">{deleteError}</div>
        </div>
      ) : null}
      {refreshError ? (
        <div className="pd-domain-detail__banner pd-domain-detail__banner--danger" role="alert">
          <Warning className="pd-domain-detail__banner-icon" size={22} weight="fill" aria-hidden />
          <div className="pd-domain-detail__banner-body">{refreshError}</div>
        </div>
      ) : null}

      {enrichment?.errors?.length ? (
        <div className="pd-domain-detail__banner pd-domain-detail__banner--warn" role="status">
          <Warning className="pd-domain-detail__banner-icon" size={22} weight="duotone" aria-hidden />
          <div className="pd-domain-detail__banner-body">
            <strong>Partial data</strong>
            <span className="pd-domain-detail__muted" style={{ display: "block", marginBlockEnd: "0.35rem" }}>
              Some lookups failed; remaining fields are still shown.
            </span>
            <ul>
              {enrichment.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="pd-domain-detail__section-block">
        <p className="pd-domain-detail__section-label">Overview</p>
        <div className="pd-domain-detail__grid">
          <div className="pd-domain-detail__cell pd-domain-detail__cell--sm">
            <div className="pd-domain-detail__card-head">
              <h2>Registrar</h2>
              <IdentificationCard className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
            </div>
            <p className="pd-domain-detail__registrar-value">{registrarDisplay}</p>
            {rdap?.domainStatus?.[0] ? (
              <p className="pd-domain-detail__muted" style={{ fontSize: "var(--text-8)", marginBlockStart: "0.75rem" }}>
                {rdap.domainStatus[0]}
              </p>
            ) : null}
          </div>

          <div className="pd-domain-detail__cell pd-domain-detail__cell--sm">
            <div className="pd-domain-detail__card-head">
              <h2>Dates</h2>
              <CalendarBlank className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
            </div>
            <dl className="pd-domain-detail__kv">
              <dt>Expiry</dt>
              <dd>
                <div className="pd-domain-detail__expiry-row">
                  <span>{formatDateOnly(expiryIso)}</span>
                  {expiryLabel ? <span className="pd-domain-detail__pill">{expiryLabel}</span> : null}
                </div>
              </dd>
              <dt>Registration</dt>
              <dd>{formatDateOnly(registeredAt)}</dd>
              <dt>Updated</dt>
              <dd>{formatDateOnly(rdapUpdatedAt ?? domain.updatedAt)}</dd>
            </dl>
          </div>

          <div className="pd-domain-detail__cell pd-domain-detail__cell--sm">
            <div className="pd-domain-detail__card-head">
              <h2>Host</h2>
              <HardDrives className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
            </div>
            <dl className="pd-domain-detail__kv">
              <dt>ISP</dt>
              <dd>{host?.isp ?? "—"}</dd>
              <dt>Organization</dt>
              <dd>{host?.org ?? "—"}</dd>
              <dt>Address</dt>
              <dd>{hostLine}</dd>
              {host?.ip ? (
                <>
                  <dt>Resolved IP</dt>
                  <dd className="pd-mono">{host.ip}</dd>
                </>
              ) : null}
            </dl>
          </div>

          {dns ? (
            <DnsTabsCard ns={dns.ns} mx={dns.mx} txt={dns.txt} />
          ) : (
            <div className="pd-domain-detail__cell pd-domain-detail__cell--md">
              <div className="pd-domain-detail__card-head">
                <h2>DNS records</h2>
                <ListBullets className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
              </div>
              <p className="pd-domain-detail__muted" style={{ marginBlockEnd: 0 }}>
                No DNS snapshot yet. Use <strong>Refresh data</strong> to fetch public records.
              </p>
            </div>
          )}

          <div className="pd-domain-detail__cell pd-domain-detail__cell--sm pd-domain-detail__cell--tall">
            <div className="pd-domain-detail__card-head">
              <h2>Hostnames</h2>
              <TreeStructure className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
            </div>
            {overviewHosts.length > 1 ? (
              <ul className="pd-domain-detail__host-list">
                {overviewHosts.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            ) : (
              <p className="pd-domain-detail__muted" style={{ marginBlockEnd: 0, fontSize: "var(--text-7)", lineHeight: 1.5 }}>
                Apex only in this snapshot. In-zone names from MX or TLS subject will appear here after refresh.
              </p>
            )}
          </div>

          {enrichment?.ssl ? (
            <div className="pd-domain-detail__cell pd-domain-detail__cell--sm">
              <div className="pd-domain-detail__card-head">
                <h2>TLS (443)</h2>
                <Certificate className="pd-domain-detail__card-icon" size={28} weight="duotone" aria-hidden />
              </div>
              <dl className="pd-domain-detail__kv">
                <dt>Subject</dt>
                <dd>{enrichment.ssl.subjectCN ?? "—"}</dd>
                <dt>Issuer</dt>
                <dd>
                  {enrichment.ssl.issuerO ?? "—"}
                  {enrichment.ssl.issuerC ? ` (${enrichment.ssl.issuerC})` : ""}
                </dd>
                <dt>Valid</dt>
                <dd>
                  {formatDateTimeShort(enrichment.ssl.validFrom)} → {formatDateTimeShort(enrichment.ssl.validTo)}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      {domain.notes ? (
        <div className="pd-domain-detail__notes">
          <strong>Notes</strong>
          <div>{domain.notes}</div>
        </div>
      ) : null}

      <div className="pd-domain-detail__section-block">
        <p className="pd-domain-detail__section-label">Activity</p>
        <section className="pd-domain-detail__panel" aria-labelledby="pd-domain-history">
          <div className="pd-domain-detail__panel-head">
            <ClockCounterClockwise className="pd-domain-detail__panel-icon" size={26} weight="duotone" aria-hidden />
            <h2 id="pd-domain-history">Change history</h2>
          </div>
          {historyEvents.length ? (
            <ul className="pd-domain-detail__timeline">
              {historyEvents.map((e, i) => (
                <li key={`${e.action}-${e.date}-${i}`}>
                  <span className="pd-domain-detail__timeline-dot" aria-hidden />
                  <span className="pd-domain-detail__timeline-action">{e.action}</span>
                  <time className="pd-domain-detail__timeline-time" dateTime={e.date}>
                    {formatDateTimeShort(e.date)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pd-domain-detail__empty-hint">
              <Info size={40} weight="duotone" aria-hidden />
              No updates recorded yet.
            </div>
          )}
          <footer className="pd-domain-detail__panel-foot">
            Portfolio updated {formatDateTimeShort(domain.updatedAt)} · Public snapshot{" "}
            {formatDateTimeShort(domain.enrichedAt ?? enrichment?.fetchedAt)}
          </footer>
        </section>

        <section className="pd-domain-detail__panel" aria-labelledby="pd-domain-targets">
          <div className="pd-domain-detail__panel-head">
            <TreeStructure className="pd-domain-detail__panel-icon" size={26} weight="duotone" aria-hidden />
            <h2 id="pd-domain-targets">DNS targets</h2>
          </div>
          <div className="pd-domain-detail__targets">
            {visibleTargets.map((row, i) => (
              <article key={`${row.value}-${i}`} className="pd-domain-detail__target-card">
                <h3>
                  <span className="pd-domain-detail__target-dot" aria-hidden />
                  {row.name}
                </h3>
                <dl className="pd-domain-detail__kv">
                  <dt>Type</dt>
                  <dd>{row.recordType} record</dd>
                  <dt>Value</dt>
                  <dd className="pd-mono" style={{ wordBreak: "break-all" }}>
                    {row.value}
                  </dd>
                  <dt>Country</dt>
                  <dd>{host?.country ?? "—"}</dd>
                  <dt>Network</dt>
                  <dd>{host?.org ?? host?.isp ?? "—"}</dd>
                </dl>
              </article>
            ))}
          </div>
          {canExpandTargets ? (
            <div className="pd-domain-detail__expand-wrap">
              <button
                type="button"
                className="pd-domain-detail__expand"
                onClick={() => setTargetsExpanded((v) => !v)}
              >
                {targetsExpanded ? (
                  <>
                    Collapse list <CaretUp size={18} weight="bold" aria-hidden />
                  </>
                ) : (
                  <>
                    Expand list <CaretDown size={18} weight="bold" aria-hidden />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
