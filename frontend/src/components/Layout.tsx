import { NavLink, Outlet } from "react-router-dom";
import { SESSION_KEY } from "../lib/sessionStorage";
import { signOut } from "../services/auth";
import { useLayoutSidebar } from "./hooks/useLayoutSidebar";
import "./LayoutOat.css";

const proxyNav = [
  { to: "/proxy", end: true, label: "Dashboard" },
  { to: "/proxy/sites", end: false, label: "Sites" },
  { to: "/proxy/config", end: false, label: "Config" },
  { to: "/proxy/certificates", end: false, label: "Certificates" },
  { to: "/proxy/logs", end: false, label: "Logs" },
];

async function handleLogout(e: React.FormEvent) {
  e.preventDefault();
  await signOut();
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}
  window.location.href = "/login";
}

export function Layout() {
  const { layoutRef } = useLayoutSidebar();

  return (
    <div ref={layoutRef} className="pd-sidebar-layout" data-sidebar-layout>
      <nav data-topnav className="pd-oat-mobile-topnav hstack gap-3" aria-label="Mobile">
        <button type="button" data-sidebar-toggle aria-label="Toggle menu" className="outline small">
          ☰
        </button>
        <span style={{ fontWeight: 600 }}>Proxydeck</span>
      </nav>

      <aside data-sidebar aria-label="Application">
        <header>
          <NavLink to="/proxy" className="unstyled hstack gap-2" aria-label="Proxydeck home">
            <img src="/logo.svg" alt="" width={32} height={32} style={{ display: "block" }} />
            <span style={{ fontWeight: 700, fontSize: "var(--text-4)" }}>Proxydeck</span>
          </NavLink>
        </header>

        <nav aria-label="Main">
          <ul>
            <li>
              <details open>
                <summary>Domains</summary>
                <ul>
                  <li>
                    <NavLink to="/domains" end>
                      Portfolio
                    </NavLink>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <details open>
                <summary>Proxy</summary>
                <ul>
                  {proxyNav.map(({ to, end, label }) => (
                    <li key={to}>
                      <NavLink to={to} end={end}>
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </ul>
        </nav>

        <footer>
          <form onSubmit={handleLogout}>
            <button type="submit" className="outline small">
              Log out
            </button>
          </form>
        </footer>
      </aside>

      <main className="pd-oat-main">
        <div className="pd-oat-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
