import tls from "node:tls";

export type TlsSummary = {
  validFrom: string;
  validTo: string;
  subjectCN?: string;
  issuerO?: string;
  issuerC?: string;
  fingerprint?: string;
  serialNumber?: string;
};

export function fetchTlsSummary(hostname: string): Promise<TlsSummary | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
      try {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || typeof cert !== "object" || Object.keys(cert).length === 0) {
          resolve(null);
          return;
        }
        const pick = (v: string | string[] | undefined): string | undefined => {
          if (v == null) return undefined;
          return Array.isArray(v) ? v[0] : v;
        };
        const serialToString = (s: unknown): string | undefined => {
          if (s === undefined || s === null) return undefined;
          if (typeof s === "string" || typeof s === "number") return String(s);
          if (typeof s === "bigint") return s.toString();
          return undefined;
        };
        resolve({
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          subjectCN: pick(cert.subject?.CN),
          issuerO: pick(cert.issuer?.O),
          issuerC: pick(cert.issuer?.C),
          fingerprint: cert.fingerprint,
          serialNumber: serialToString(cert.serialNumber),
        });
      } catch {
        resolve(null);
      }
    });
    socket.on("error", () => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(null);
    });
    socket.setTimeout(12_000, () => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(null);
    });
  });
}
