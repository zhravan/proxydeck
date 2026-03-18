import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Sites } from "./pages/Sites";
import { Config } from "./pages/Config";
import { Certificates } from "./pages/Certificates";
import { Logs } from "./pages/Logs";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Team } from "./pages/Team";

const SESSION_KEY = "pd_session";

function readStoredSession(): unknown {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d?.user ?? d?.data ?? d ?? null;
  } catch {
    return null;
  }
}

function useSession() {
  const [session, setSession] = useState<unknown>(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
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
          setSession(readStoredSession());
        }
      })
      .catch(() => setSession(readStoredSession()))
      .finally(() => setLoading(false));
  }, []);

  return { session, loading };
}

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) return <div className="card p-4">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="config" element={<Config />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="logs" element={<Logs />} />
          <Route path="team" element={<Team />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

