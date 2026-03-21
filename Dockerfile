# Build UI
FROM oven/bun:1-alpine AS ui
WORKDIR /app/frontend
# `vite.config.ts` reads repo-root `package.json` (parent of `frontend/`) for `VITE_PROXYDECK_VERSION`
COPY package.json /app/package.json
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

# Runtime
FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
COPY --from=ui /app/frontend/dist ./frontend/dist
# Match root `bun run build` (typecheck API; UI already built in ui stage)
RUN bun run build:api
RUN chmod +x /app/scripts/docker-entrypoint.sh

ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
