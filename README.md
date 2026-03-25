<samp>

<p align="center">
  <img src="frontend/public/logo.svg" alt="Proxydeck" width="150" />
  <p align="center">Web dashboard for your domain portfolio, server inventory, and reverse proxy (Caddy / Traefik)</p>
</p>

### UI look & feel

<table>
  <tr>
    <td align="center" width="33%">
      <img src="assets/1.png" alt="Domain portfolio" width="100%" />
    </td>
    <td align="center" width="33%">
      <img src="assets/2.png" alt="Proxy sites" width="100%" />
    </td>
    <td align="center" width="33%">
      <img src="assets/3.png" alt="Server inventory" width="100%" />
    </td>
  </tr>
  <tr>
    <td align="center"><small>Domain portfolio</small></td>
    <td align="center"><small>Proxy sites</small></td>
    <td align="center"><small>Server inventory</small></td>
  </tr>
</table>

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
