import { useCallback, useEffect, useState } from "react";
import {
  getConfigHistory,
  getConfigPreview,
  postConfigRollback,
} from "../../services/config";

export interface ConfigPreview {
  provider: string | null;
  raw: string;
}

export interface ConfigHistoryEntry {
  id: string;
  createdAt: string;
  provider: string;
  comment: string | null;
}

export function useConfig() {
  const [preview, setPreview] = useState<ConfigPreview>({ provider: null, raw: "" });
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackResult, setRollbackResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getConfigPreview().then((r) => r.json()), getConfigHistory().then((r) => r.json())])
      .then(([p, h]) => {
        setPreview(p);
        setHistory(Array.isArray(h) ? h : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rollback = useCallback(
    (id: string) => {
      setRollbackResult(null);
      postConfigRollback(id)
        .then((r) => r.json())
        .then((r) => {
          setRollbackResult(r);
          if (r.ok) load();
        })
        .catch((e) => setRollbackResult({ ok: false, error: e.message }));
    },
    [load]
  );

  return { preview, history, loading, rollbackResult, rollback };
}
