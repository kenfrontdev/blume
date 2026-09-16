#!/usr/bin/env bash
#
# Cloud Agent start phase for Blume.
#
# Per-boot reconciliation. Brings up the local data-plane the app needs:
#   - Postgres (local cluster created in install.sh)
#   - the dev-only Neon HTTP/WS proxy (scripts/dev/neon-http-proxy.mjs)
#   - schema migrations + spec ingest (both idempotent)
#
# The Next dev server itself runs as a visible `terminals` process so its
# logs are easy to read and it can be restarted independently.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

PGDATA="${BLUME_PGDATA:-$HOME/blume-pgdata}"
DEV_DEPS_DIR="$HOME/.blume-dev"
PGBIN="$(dirname "$(ls /usr/lib/postgresql/*/bin/postgres | sort -V | tail -1)")"

export NODE_PATH="$DEV_DEPS_DIR/node_modules"
export BLUME_LOCAL_NEON=1
export NODE_OPTIONS="--import $REPO_DIR/scripts/dev/neon-local-preload.mjs"
export BLUME_NEON_PROXY_PG_URL="postgres://postgres:postgres@127.0.0.1:5432/blume"

echo "==> Starting Postgres"
if ! "$PGBIN/pg_isready" -h 127.0.0.1 -p 5432 -q; then
  "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p 5432 -k /tmp" -l /tmp/blume-pg.log -w start
fi
# Ensure database + password exist (idempotent).
"$PGBIN/psql" -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='blume'" \
  | grep -q 1 || "$PGBIN/psql" -h 127.0.0.1 -U postgres -c "CREATE DATABASE blume"
"$PGBIN/psql" -h 127.0.0.1 -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres'" >/dev/null

echo "==> Starting Neon HTTP proxy on :4444"
if ! curl -sS -o /dev/null -m 2 -X POST http://127.0.0.1:4444/sql 2>/dev/null; then
  nohup node scripts/dev/neon-http-proxy.mjs > /tmp/blume-neon-proxy.log 2>&1 &
  for _ in $(seq 1 20); do
    curl -sS -o /dev/null -m 1 -X POST http://127.0.0.1:4444/sql 2>/dev/null && break
    sleep 0.5
  done
fi

echo "==> Applying migrations + ingesting specs (idempotent)"
npm run db:migrate
npm run ingest --

echo "==> Start complete — dev server runs in the 'web' terminal"
