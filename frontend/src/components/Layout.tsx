import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
  try {
    sessionStorage.removeItem("pd_session");
  } catch (_) {}
  window.location.href = "/login";
}

export function Layout() {
  const location = useLocation();
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    layoutRef.current?.removeAttribute("data-sidebar-open");
  }, [location.pathname]);

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
