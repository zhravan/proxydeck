<samp>

<p align="center">
  <img src="frontend/public/logo.svg" alt="Proxydeck" width="150" />
  <p align="center">Web dashboard for your domain portfolio, server inventory, and reverse proxy (Caddy / Traefik)</p>
</p>

---

### UI look & feel

#### Domain portfolio & detail

<p align="center">
  <img src="assets/DomainPage.png" alt="Single domain : WHOIS, DNS, TLS, enrichment, and timeline" width="88%" />
</p>

<p align="center">
  <img src="assets/DomainPortfolioPage.png" alt="Domain portfolio table and empty state" width="88%" />
</p>

#### Server inventory

<p align="center">
  <img src="assets/ServerPage.png" alt="Server inventory — list, roles, and connectivity" width="88%" />
</p>

### Acknowledgments

Libraries, tools, and inspirations: see **[THANKS.md](THANKS.md)**.

---

### Setup

```bash
cp .env.sample .env   # BETTER_AUTH_SECRET, DATABASE_URL
bun install && cd frontend && npm install && cd ..
bun run db:migrate && bun run build && bun run start
```

---

**Production Deployment:**

```bash
curl -fsSL https://raw.githubusercontent.com/zhravan/proxydeck/main/scripts/bootstrap.sh | bash
```

Or clone and run: `git clone https://github.com/zhravan/proxydeck.git && cd proxydeck && ./scripts/install.sh`

Set `BETTER_AUTH_SECRET` in `.env`. Either set `DATABASE_URL` (your Postgres; no Postgres container) or leave unset and use bundled Postgres (script will prompt for `POSTGRES_PASSWORD` and run `docker compose --profile db up -d`).

---

<details>
<summary><b>Click to view .env variable definitions</b></summary>

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (optional: omit to use bundled Postgres with `--profile db`) |
| `POSTGRES_PASSWORD` | Used when running bundled Postgres (`docker compose --profile db`) |
| `BETTER_AUTH_SECRET` | Auth signing secret (e.g. `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | App base URL (default `http://localhost:3000`) |
| `PORT` | Server port (default 3000) |
| `CADDY_ADMIN` | Caddy admin API (optional) |
| `TRAEFIK_API_URL` | Traefik API URL (optional) |
| `TRAEFIK_DYNAMIC_CONFIG` | Traefik dynamic config path (optional) |
| `PROXY_LOG_FILE` | Proxy log file path (optional) |

</details>

---

</samp>

## Domain checks and snapshots

Domain detail pages support an on-demand public check. The refresh endpoint runs the existing DNS, TLS, registration and host enrichment pipeline and stores an append-only snapshot for troubleshooting.

- `POST /api/domains/:id/checks` runs a refresh for a domain owned by the signed-in user.
- `GET /api/domains/:id/checks?limit=20` returns recent snapshots. The limit defaults to 20 and is capped at 100.
- Refreshes are session-authenticated, rate-limited to one check per domain per minute and 24 checks per user per minute (per application process).
- Snapshots are retained in `domain_check_runs`; deleting a domain cascades to its snapshots. The latest snapshot is also reflected in the existing `domains.enrichment` field for compatibility.
- Run `bun run db:migrate` before starting an upgraded deployment.

The first version checks the domain’s DNS records, TLS certificate and existing registration/host enrichment. It does not run a separate HTTP status probe yet; scheduled portfolio-wide checks and webhook notifications are tracked separately.
