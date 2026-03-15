/**
 * Proxy-agnostic domain model for reverse proxy configuration.
 * Used to represent sites, routes, upstreams and TLS across Caddy and Traefik.
 */

/** A single backend target (address and optional health). */
export interface Upstream {
  address: string;
  healthy?: boolean;
}

/** Route: path or host match and list of backends. */
export interface Route {
  id?: string;
  match: string;
  matchType: "path" | "host";
  upstreams: Upstream[];
}

/** TLS configuration: ACME (e.g. Let's Encrypt) or custom certs. */
export interface TLS {
  provider?: "acme" | "custom";
  email?: string;
  certFile?: string;
  keyFile?: string;
}

/** Site: hostnames, TLS, and routes. */
export interface Site {
  id?: string;
  hostnames: string[];
  tls?: TLS;
  routes: Route[];
}

/** Full config payload for validate/apply. */
export interface ProxyConfig {
  sites: Site[];
}
