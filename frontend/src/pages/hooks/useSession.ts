import { useEffect, useState } from "react";
import { parseGetSessionUser } from "../../lib/authSession";
import { readStoredSession, SESSION_KEY } from "../../lib/sessionStorage";
import { getSession } from "../../services/auth";

export function useSession() {
  const [session, setSession] = useState<unknown>(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((r) => r.text())
      .then((text) => {
        const user = parseGetSessionUser(text);
        if (user) {
          setSession(user);
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
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
