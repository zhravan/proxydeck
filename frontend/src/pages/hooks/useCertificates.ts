import { useEffect, useState } from "react";
import { getCertificates } from "../../services/certificates";

export interface CertInfo {
  domain: string;
  issuer?: string;
  expiry?: string;
}

export function useCertificates() {
  const [certs, setCerts] = useState<CertInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCertificates()
      .then((r) => r.json())
      .then((data) => setCerts(Array.isArray(data) ? data : []))
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, []);

  return { certs, loading };
}
