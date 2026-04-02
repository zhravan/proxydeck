import { useSyncExternalStore } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Moon, Sun } from "@phosphor-icons/react";
import { AppVersionStamp } from "./AppVersionStamp";
import { cyclePdTheme, getPdTheme, subscribeToPdTheme } from "../lib/pdTheme";
import { BreadcrumbsController } from "./breadcrumbs/BreadcrumbsController";
import { clearBrowserPersistedState } from "../lib/clearClientState";
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
  try {
    await signOut();
  } catch {
    /* still clear client; session may already be invalid */
  }
  clearBrowserPersistedState();
  window.location.replace("/login");
}

export function Layout() {
  const { layoutRef } = useLayoutSidebar();
  const theme = useSyncExternalStore(subscribeToPdTheme, getPdTheme, () => "light");

  return (
    <div ref={layoutRef} className="pd-sidebar-layout" data-sidebar-layout>
      <nav data-topnav className="pd-oat-mobile-topnav hstack gap-3" aria-label="Mobile">
        <button type="button" data-sidebar-toggle aria-label="Toggle menu" className="outline small">
          ☰
        </button>
        {/* <span style={{ fontWeight: 600 }}>Proxydeck</span> */}
      </nav>

      <aside data-sidebar aria-label="Application">
        <header className="pd-sidebar-header">
          <NavLink to="/proxy" className="pd-sidebar-brand unstyled" aria-label="Proxydeck home">
            <span className="pd-sidebar-wordmark">Proxydeck</span>
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
                  <li>
                    <NavLink to="/domains/servers" end>
                      Servers
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
            <li>
              <NavLink to="/settings" end>
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>

        <footer>
          <AppVersionStamp className="text-light pd-sidebar-version" />
          <button
            type="button"
            className="outline small"
            aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
            onClick={() => cyclePdTheme()}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
          >
            {theme === "dark" ? (
              <Sun size={18} weight="duotone" aria-hidden />
            ) : (
              <Moon size={18} weight="duotone" aria-hidden />
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            type="button"
            className="outline small"
            onClick={() => {
              void window.open("/api/docs", "_blank", "noopener,noreferrer");
            }}
          >
            API docs
          </button>
          <form onSubmit={handleLogout}>
            <button type="submit" className="outline small">
              Log out
            </button>
          </form>
        </footer>
      </aside>

      <main className="pd-oat-main">
        <div className="pd-oat-main-inner">
          <BreadcrumbsController>
            <Outlet />
          </BreadcrumbsController>
        </div>
      </main>
    </div>
  );
}
