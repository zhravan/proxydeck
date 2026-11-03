# Docker images

ProxyDeck publishes multi-platform container images to GitHub Container Registry (GHCR).

- Image: `ghcr.io/zhravan/proxydeck`
- Platforms: `linux/amd64` and `linux/arm64`
- Main-branch tags: the version in `package.json` and `latest`.
- Release tags: semantic version tags (`1.2.3`, `1.2`, `1`) from GitHub Releases.
- The image uses the repository `Dockerfile`; its entrypoint runs Drizzle migrations before starting the server.

## Pull and run

The GHCR package is intended to be public. Once the package has been made public, pull without authenticating:

```bash
docker pull ghcr.io/zhravan/proxydeck:latest
```

A standalone container needs an existing PostgreSQL database reachable from the container:

```bash
docker run -d --name proxydeck -p 3000:3000 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -e DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/proxydeck" \
  --restart unless-stopped \
  ghcr.io/zhravan/proxydeck:latest
```

## Complete setup with Docker Compose

Download the checked-in Compose and environment examples:

```bash
mkdir proxydeck && cd proxydeck
curl -fsSLO https://raw.githubusercontent.com/zhravan/proxydeck/main/deploy/docker-compose.ghcr.yml
curl -fsSLO https://raw.githubusercontent.com/zhravan/proxydeck/main/deploy/.env.ghcr.example
cp .env.ghcr.example .env
```

Generate secrets and replace the placeholders in `.env` (edit the file with your preferred editor):

```bash
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)"
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
```

Put those generated values into `.env`, then start ProxyDeck:

```bash
docker compose -f docker-compose.ghcr.yml --env-file .env --profile db up -d
docker compose -f docker-compose.ghcr.yml --env-file .env ps
```

Open [http://localhost:3000](http://localhost:3000). The app waits for PostgreSQL and automatically applies database migrations on startup. PostgreSQL data persists in the `postgres_data` named volume.

Upgrade:

```bash
docker compose -f docker-compose.ghcr.yml --env-file .env --profile db pull
docker compose -f docker-compose.ghcr.yml --env-file .env --profile db up -d
```

Pin a release by setting `PROXYDECK_VERSION=0.1.8` in `.env` (use any published version tag). For an external database, set `DATABASE_URL` in `.env` and omit `--profile db`.

## CI and publishing

The `.github/workflows/docker.yml` workflow:

1. Builds and publishes `linux/amd64` and `linux/arm64` after every push/merge to `main`.
2. Tags main builds with the current `package.json` version and `latest`.
3. Publishes semantic version tags for published GitHub Releases.
4. Builds pull requests only after the `build` label is applied. Once labeled, every subsequent commit triggers another build. PR builds are validation-only and never push to GHCR.
5. Uses the built-in `GITHUB_TOKEN`; no PAT is required. Ensure **Settings → Actions → General → Workflow permissions** permits write access for packages. Set the GHCR package visibility to public after its first publication if anonymous pulls are desired.

