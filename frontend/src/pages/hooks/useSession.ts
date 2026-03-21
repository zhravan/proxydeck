import { useEffect, useState } from "react";
import { readStoredSession, SESSION_KEY } from "../../lib/sessionStorage";
import { getSession } from "../../services/auth";

export function useSession() {
  const [session, setSession] = useState<unknown>(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((r) => r.text())
      .then((text) => {
        const d = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
        const fromApi = d?.data ?? d?.session ?? d ?? null;
        if (fromApi) {
          setSession(fromApi);
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: fromApi }));
          } catch (_) {}
        } else {
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch (_) {}
          setSession(null);
        }
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch (_) {}
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { session, loading };
}
