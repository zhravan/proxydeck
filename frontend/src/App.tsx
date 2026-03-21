import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Domains } from "./pages/Domains";
import { Dashboard } from "./pages/Dashboard";
import { Sites } from "./pages/Sites";
import { Config } from "./pages/Config";
import { Certificates } from "./pages/Certificates";
import { Logs } from "./pages/Logs";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { useSession } from "./pages/hooks/useSession";

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) return <div className="card p-4">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <div className="pd-app-root">
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
          <Route index element={<Navigate to="/proxy" replace />} />
          <Route path="domains/*" element={<Domains />} />
          <Route path="proxy" element={<Dashboard />} />
          <Route path="proxy/sites" element={<Sites />} />
          <Route path="proxy/config" element={<Config />} />
          <Route path="proxy/certificates" element={<Certificates />} />
          <Route path="proxy/logs" element={<Logs />} />
          <Route path="sites" element={<Navigate to="/proxy/sites" replace />} />
          <Route path="config" element={<Navigate to="/proxy/config" replace />} />
          <Route path="certificates" element={<Navigate to="/proxy/certificates" replace />} />
          <Route path="logs" element={<Navigate to="/proxy/logs" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
