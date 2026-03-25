export type BreadcrumbItem = {
  to: string;
  label: string;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Site-wide trail from pathname; `domainLabel` fills domain detail/edit middle segment when known. */
export function buildBreadcrumbs(pathname: string, domainLabel: string | null): BreadcrumbItem[] {
  const path = normalizePath(pathname);

  if (path === "/proxy") {
    return [
      { to: "/proxy", label: "Proxy" },
      { to: "/proxy", label: "Dashboard" },
    ];
  }
  if (path === "/proxy/sites") {
    return [
      { to: "/proxy", label: "Proxy" },
      { to: "/proxy/sites", label: "Sites" },
    ];
  }
  if (path === "/proxy/config") {
    return [
      { to: "/proxy", label: "Proxy" },
      { to: "/proxy/config", label: "Config" },
    ];
  }
  if (path === "/proxy/certificates") {
    return [
      { to: "/proxy", label: "Proxy" },
      { to: "/proxy/certificates", label: "Certificates" },
    ];
  }
  if (path === "/proxy/logs") {
    return [
      { to: "/proxy", label: "Proxy" },
      { to: "/proxy/logs", label: "Logs" },
    ];
  }

  if (path === "/domains") {
    return [{ to: "/domains", label: "Portfolio" }];
  }
  if (path === "/domains/servers") {
    return [
      { to: "/domains", label: "Portfolio" },
      { to: "/domains/servers", label: "Servers" },
    ];
  }
  const editMatch = path.match(/^\/domains\/([^/]+)\/edit$/);
  if (editMatch) {
    const id = editMatch[1];
    const mid = domainLabel?.trim() || "Domain";
    return [
      { to: "/domains", label: "Portfolio" },
      { to: `/domains/${id}`, label: mid },
      { to: path, label: "Edit" },
    ];
  }

  const idMatch = path.match(/^\/domains\/([^/]+)$/);
  if (idMatch && idMatch[1] !== "new") {
    const mid = domainLabel?.trim() || "Domain";
    return [
      { to: "/domains", label: "Portfolio" },
      { to: path, label: mid },
    ];
  }

  return [];
}
