import type { DomainEnrichment } from "../../types/domain";

function formatTs(s: string | undefined): string {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-light" style={{ marginBlockEnd: 0 }}>{empty}</p>;
  return (
    <ul style={{ marginBlock: 0, paddingInlineStart: "1.25rem" }}>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

export function DomainEnrichmentPanel({ enrichment }: { enrichment: DomainEnrichment | null }) {
  if (!enrichment) {
    return (
      <p className="text-light" style={{ marginBlockEnd: 0 }}>
        No cached public lookup yet. Use <strong>Refresh public records</strong> on this domain, or add the domain
        with public lookup enabled.
      </p>
    );
  }

  const dns = enrichment.dns;
  const ssl = enrichment.ssl;
  const rdap = enrichment.rdap;
  const host = enrichment.host;

  return (
    <div className="vstack gap-4">
      {enrichment.errors?.length ? (
        <div role="alert" data-variant="danger">
          <strong>Partial data</strong>
          <ul style={{ marginBlock: "0.5rem 0", paddingInlineStart: "1.25rem" }}>
            {enrichment.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-light" style={{ fontSize: "var(--text-7)", marginBlockEnd: 0 }}>
        Fetched {formatTs(enrichment.fetchedAt)}
        {rdap?.sourceUrl ? (
          <>
            {" "}
            ·{" "}
            <a href={rdap.sourceUrl} target="_blank" rel="noreferrer">
              RDAP source
            </a>
          </>
        ) : null}
      </p>

      {rdap?.domainStatus?.length ? (
        <div>
          <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
            Domain status (RDAP)
          </div>
          <List items={rdap.domainStatus} empty="-" />
        </div>
      ) : null}

      {dns ? (
        <div className="vstack gap-3">
          <strong style={{ fontSize: "var(--text-3)" }}>DNS</strong>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              IPv4
            </div>
            <List items={dns.ipv4} empty="None resolved" />
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              IPv6
            </div>
            <List items={dns.ipv6} empty="None resolved" />
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              Name servers
            </div>
            <List items={dns.ns} empty="None resolved" />
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              MX
            </div>
            {!dns.mx.length ? (
              <p className="text-light" style={{ marginBlockEnd: 0 }}>
                None resolved
              </p>
            ) : (
              <ul style={{ marginBlock: 0, paddingInlineStart: "1.25rem" }}>
                {dns.mx.map((m) => (
                  <li key={`${m.priority}-${m.exchange}`}>
                    {m.exchange} (priority {m.priority})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-light" style={{ fontSize: "var(--text-7)" }}>
              TXT (sample)
            </div>
            <List items={dns.txt.slice(0, 12)} empty="None resolved" />
            {dns.txt.length > 12 ? (
              <p className="text-light" style={{ marginBlockEnd: 0 }}>
                +{dns.txt.length - 12} more…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {ssl ? (
        <div className="vstack gap-2">
          <strong style={{ fontSize: "var(--text-3)" }}>TLS (port 443)</strong>
          <div>
            <span className="text-light">Subject CN: </span>
            {ssl.subjectCN ?? "-"}
          </div>
          <div>
            <span className="text-light">Issuer: </span>
            {ssl.issuerO ?? "-"}
            {ssl.issuerC ? ` (${ssl.issuerC})` : ""}
          </div>
          <div>
            <span className="text-light">Valid: </span>
            {formatTs(ssl.validFrom)} → {formatTs(ssl.validTo)}
          </div>
          {ssl.fingerprint ? (
            <div style={{ wordBreak: "break-all" }}>
              <span className="text-light">Fingerprint: </span>
              {ssl.fingerprint}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-light" style={{ marginBlockEnd: 0 }}>
          No TLS certificate retrieved (service may not speak HTTPS on 443).
        </p>
      )}

      {host && (host.country || host.city || host.org || host.isp) ? (
        <div className="vstack gap-2">
          <strong style={{ fontSize: "var(--text-3)" }}>Host (first IPv4)</strong>
          {host.ip ? (
            <div>
              <span className="text-light">IP: </span>
              {host.ip}
            </div>
          ) : null}
          <div>
            <span className="text-light">Location: </span>
            {[host.city, host.region, host.country].filter(Boolean).join(", ") || "-"}
          </div>
          <div>
            <span className="text-light">Org / ISP: </span>
            {host.org ?? host.isp ?? "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
