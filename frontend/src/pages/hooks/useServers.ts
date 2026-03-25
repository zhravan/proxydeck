import { useCallback, useEffect, useState } from "react";
import type { InfrastructureServer } from "../../types/infrastructureServer";
import { httpDelete, httpGet, httpPatch, httpPost } from "../../utils/http";

type ListResponse = { servers: InfrastructureServer[] };
type OneResponse = { server: InfrastructureServer };
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

export function useServers() {
  const [servers, setServers] = useState<InfrastructureServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await httpGet("/api/servers");
    if (!res.ok) {
      setError(await readError(res));
      setServers([]);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as ListResponse;
    setServers(Array.isArray(data.servers) ? data.servers : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (body: Record<string, unknown>): Promise<
      { ok: true; server: InfrastructureServer } | { ok: false; error: string }
    > => {
      const res = await httpPost("/api/servers", { json: body });
      if (!res.ok) return { ok: false, error: await readError(res) };
      const data = (await res.json()) as OneResponse;
      if (!data.server) return { ok: false, error: "Invalid response" };
      await reload();
      return { ok: true, server: data.server };
    },
    [reload]
  );

  const update = useCallback(
    async (
      id: string,
      body: Record<string, unknown>
    ): Promise<{ ok: true; server: InfrastructureServer } | { ok: false; error: string }> => {
      const res = await httpPatch(`/api/servers/${encodeURIComponent(id)}`, { json: body });
      if (!res.ok) return { ok: false, error: await readError(res) };
      const data = (await res.json()) as OneResponse;
      if (!data.server) return { ok: false, error: "Invalid response" };
      await reload();
      return { ok: true, server: data.server };
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      const res = await httpDelete(`/api/servers/${encodeURIComponent(id)}`);
      if (!res.ok) return { ok: false, error: await readError(res) };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  return { servers, loading, error, reload, create, update, remove };
}
