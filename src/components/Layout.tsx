import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/sites", label: "Sites" },
  { href: "/config", label: "Config" },
  { href: "/certificates", label: "Certificates" },
  { href: "/logs", label: "Logs" },
];

async function handleLogout(e: React.FormEvent) {
  e.preventDefault();
  await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
  window.location.href = "/login";
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <nav aria-label="Main" className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <ul className="unstyled hstack" style={{ gap: "1rem", listStyle: "none" }}>
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <a href={href} className="unstyled">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <form onSubmit={handleLogout} style={{ margin: 0 }}>
          <button type="submit" className="outline small">
            Log out
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </>
  );
}
