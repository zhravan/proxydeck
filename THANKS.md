# Thanks

Proxydeck builds on many open-source projects and public services. Thank you to everyone who maintains them.

## Inspiration

| Project | Author | Notes |
|--------|--------|--------|
| [domain-locker](https://github.com/Lissy93/domain-locker) | [Lissy93](https://github.com/Lissy93) | Inspired the domain portfolio and enrichment-style workflow (RDAP/DNS/TLS-style checks and registrar context). Proxydeck is a separate project with its own stack and features. |

## Runtime & language

| Project | Notes |
|--------|--------|
| [Bun](https://bun.sh) | JavaScript runtime and tooling |
| [TypeScript](https://www.typescriptlang.org/) | Static typing |
| [Node.js](https://nodejs.org/) | Ecosystem compatibility for libraries and tools |

## Backend (API)

| Project | Notes |
|--------|--------|
| [Elysia](https://elysiajs.com/) | HTTP framework |
| [@elysiajs/swagger](https://github.com/elysiajs/swagger) | OpenAPI docs UI (Scalar / Swagger) |
| [Better Auth](https://www.better-auth.com/) | Authentication; also uses related packages (e.g. [better-call](https://github.com/better-auth/better-call), [@better-auth/core](https://github.com/better-auth/better-auth) and adapters) |
| [Drizzle ORM](https://orm.drizzle.team/) | Database access |
| [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) | Migrations |
| [node-postgres (`pg`)](https://node-postgres.com/) | PostgreSQL driver |
| [whois-json](https://www.npmjs.com/package/whois-json) | WHOIS parsing in enrichment flows |

## Frontend (UI)

| Project | Notes |
|--------|--------|
| [React](https://react.dev/) & [React DOM](https://react.dev/) | UI library |
| [React Router](https://reactrouter.com/) | Client-side routing |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | React support for Vite |
| [@phosphor-icons/react](https://phosphoricons.com/) | Icon set |
| [@knadh/oat](https://github.com/knadh/oat) | Layout primitives |

## Data & development

| Project | Notes |
|--------|--------|
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Concurrently](https://www.npmjs.com/package/concurrently) | Parallel npm/bun scripts in development |

## Optional integrations & public data

Not always bundled as npm dependencies; Proxydeck is designed to work with or query them.

| Project / service | Notes |
|-------------------|--------|
| [Caddy](https://caddyserver.com/) | Reverse proxy (admin API–driven config) |
| [Traefik](https://traefik.io/) | Reverse proxy (dynamic file / API) |
| RDAP / DNS / TLS | Public registry and network endpoints for live domain enrichment |
| [ip-api.com](https://ip-api.com/) | Optional IP geolocation when `DOMAIN_ENRICH_GEO=1` is enabled on the server |

---

If we missed a project you care about, open an issue or PR and we will add it.
