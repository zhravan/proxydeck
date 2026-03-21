#!/bin/sh
set -e
# Wait for Postgres then run migrations
for i in 1 2 3 4 5 6 7 8 9 10; do
  if bun run db:migrate 2>/dev/null; then
    break
  fi
  [ "$i" = 10 ] && exit 1
  sleep 2
done
exec "$@"
