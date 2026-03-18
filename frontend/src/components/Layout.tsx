import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", end: true, label: "Dashboard" },
  { to: "/sites", end: false, label: "Sites" },
  { to: "/config", end: false, label: "Config" },
  { to: "/certificates", end: false, label: "Certificates" },
  { to: "/logs", end: false, label: "Logs" },
  { to: "/team", end: false, label: "Team" },
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
  return (
    <>
      <nav data-topnav aria-label="Main" className="hstack justify-between w-100">
        <NavLink to="/" className="hstack gap-2" style={{ textDecoration: "none", color: "inherit" }}>
          <img src="/logo.svg" alt="" style={{ height: "3.75rem", width: "auto", display: "block" }} />
        </NavLink>
        <div className="hstack gap-2">
          <span className="hstack gap-1">
            {navItems.map(({ to, end, label }) => (
              <NavLink
                to={to}
                end={end}
                key={to}
                style={({ isActive }) => ({
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-small)",
                  background: isActive ? "var(--accent)" : "transparent",
                })}
              >
                {label}
              </NavLink>
            ))}
          </span>
          <form onSubmit={handleLogout}>
            <button type="submit" className="outline small">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main style={{ flex: 1, padding: "var(--space-6)", maxWidth: "56rem", margin: "0 auto", width: "100%" }}>
        <Outlet />
      </main>
    </>
  );
}
