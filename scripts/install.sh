#!/usr/bin/env bash
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Need Docker and Docker Compose."
  exit 1
fi

[ -f .env ] || { cp .env.sample .env; echo "Created .env"; }

set -a
source .env 2>/dev/null || true
set +a

[ -n "$BETTER_AUTH_SECRET" ] || {
  echo "Set BETTER_AUTH_SECRET (e.g. openssl rand -base64 32)"
  read -r -p "BETTER_AUTH_SECRET: " BETTER_AUTH_SECRET
  echo "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" >> .env
}

# Custom Postgres: set DATABASE_URL in .env and run app only. Else use bundled postgres (profile db).
if [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL from .env (no Postgres container)."
  docker compose up -d
else
  [ -n "$POSTGRES_PASSWORD" ] || {
    read -r -s -p "Postgres password for user proxydeck: " POSTGRES_PASSWORD
    echo
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env
    export POSTGRES_PASSWORD
  }
  docker compose --profile db up -d
fi

echo "Proxydeck is up. Open http://localhost:${PORT:-3000}"
