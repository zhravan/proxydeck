import { useCallback, useEffect, useState } from "react";
import type { Domain, DomainEnrichment } from "../../types/domain";
import { httpDelete, httpGet, httpPatch, httpPost } from "../../utils/http";

type ListResponse = { domains: Domain[] };
type OneResponse = { domain: Domain };
type ErrorBody = { error?: string };

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as ErrorBody;
    if (j?.error && typeof j.error === "string") return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await httpGet("/api/domains");
    if (!res.ok) {
      setError(await readError(res));
      setDomains([]);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as ListResponse;
    setDomains(Array.isArray(data.domains) ? data.domains : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      const res = await httpDelete(`/api/domains/${encodeURIComponent(id)}`);
      if (!res.ok) return { ok: false, error: await readError(res) };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  return { domains, loading, error, reload, remove };
}

export async function deleteDomain(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await httpDelete(`/api/domains/${encodeURIComponent(id)}`);
  if (!res.ok) return { ok: false, error: await readError(res) };
  return { ok: true };
}

type LookupResponse = { enrichment: DomainEnrichment };

export async function fetchDomainLookup(hostname: string): Promise<
  { ok: true; enrichment: DomainEnrichment } | { ok: false; error: string }
> {
  const q = encodeURIComponent(hostname.trim());
  const res = await httpGet(`/api/domains/lookup?hostname=${q}`);
  if (!res.ok) return { ok: false, error: await readError(res) };
  const data = (await res.json()) as LookupResponse;
  if (!data.enrichment) return { ok: false, error: "Invalid lookup response" };
  return { ok: true, enrichment: data.enrichment };
}

export async function createDomain(input: {
  hostname: string;
  registrarName?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  skipPublicLookup?: boolean;
}): Promise<{ ok: true; domain: Domain } | { ok: false; error: string }> {
  try {
    const res = await httpPost("/api/domains", { json: input });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const data = (await res.json()) as OneResponse;
    if (!data.domain) return { ok: false, error: "Invalid response" };
    return { ok: true, domain: data.domain };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, error: msg };
  }
}

export async function updateDomain(
  id: string,
  patch: Partial<{
    hostname: string;
    registrarName: string | null;
    expiresAt: string | null;
    notes: string | null;
    fetchPublicData: boolean;
  }>
): Promise<{ ok: true; domain: Domain } | { ok: false; error: string }> {
  try {
    const res = await httpPatch(`/api/domains/${encodeURIComponent(id)}`, { json: patch });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const data = (await res.json()) as OneResponse;
    if (!data.domain) return { ok: false, error: "Invalid response" };
    return { ok: true, domain: data.domain };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, error: msg };
  }
}

export async function refreshDomainPublic(
  id: string
): Promise<{ ok: true; domain: Domain } | { ok: false; error: string }> {
  return updateDomain(id, { fetchPublicData: true });
}

export function useDomain(id: string | undefined) {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setDomain(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await httpGet(`/api/domains/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError(await readError(res));
      setDomain(null);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as OneResponse;
    setDomain(data.domain ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { domain, loading, error, reload };
}
