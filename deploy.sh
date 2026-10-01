#!/usr/bin/env bash
#
# TrioCraft deploy script — run this ON THE SERVER, from the repo root,
# after you've pushed new commits to the `main` branch from your machine.
#
#   ssh you@your-server
#   cd /var/www/triocraft        # wherever this repo lives on the server
#   ./deploy.sh
#
# What it does, in order:
#   1. Refuses to run if there are uncommitted changes on the server (code
#      should only ever change here via git pull — never hand-edited).
#   2. Pulls `main` (fast-forward only — fails loudly instead of silently
#      discarding anything if history has diverged).
#   3. Installs locked dependencies for both apps (npm ci).
#   4. Builds the Next.js frontend.
#   5. Restarts both systemd services.
#   6. Hits each service once to confirm it actually came back up.
#
# What it deliberately does NOT do:
#   - Touch the database. server/db/db.js applies schema.sql on every API
#     boot (it's all `CREATE TABLE IF NOT EXISTS`), so schema changes just
#     work on restart. `npm run seed` is a one-time, first-install-only step
#     (see README-DEPLOY.md) — it is never part of an ongoing deploy.
#   - Touch Nginx. That's a one-time setup step (see README-DEPLOY.md) and
#     config changes don't happen on every code push.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
API_SERVICE="${API_SERVICE:-triocraft-api}"
WEB_SERVICE="${WEB_SERVICE:-triocraft-web}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

cd "$REPO_ROOT"

log "Checking working tree is clean"
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Uncommitted changes in $REPO_ROOT — commit/stash or discard them before deploying. Code on the server should only ever change via git pull."
fi

log "Pulling latest '$BRANCH'"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Installing API dependencies (server/)"
if [[ ! -f server/.env ]]; then
  fail "server/.env is missing — copy server/.env.example to server/.env and fill in real values (see README-DEPLOY.md), then re-run."
fi
(cd server && npm ci --omit=dev)

log "Installing frontend dependencies (web/)"
if [[ ! -f web/.env.production.local ]]; then
  fail "web/.env.production.local is missing — copy web/env.production.example to web/.env.production.local first. NEXT_PUBLIC_API_URL is baked into the browser bundle AT BUILD TIME, so this must exist *before* the build below. See README-DEPLOY.md."
fi
(cd web && npm ci)

log "Building frontend (web/)"
(cd web && npm run build)

log "Restarting services"
sudo systemctl restart "$API_SERVICE"
sudo systemctl restart "$WEB_SERVICE"

log "Waiting for services to come up"
sleep 2

log "Health check: API"
if curl -fsS "http://127.0.0.1:${API_PORT}/api/site-config" > /dev/null; then
  echo "API OK on :${API_PORT}"
else
  fail "API did not respond on :${API_PORT} — check: sudo journalctl -u $API_SERVICE -n 50 --no-pager"
fi

log "Health check: Web"
if curl -fsS "http://127.0.0.1:${WEB_PORT}/" > /dev/null; then
  echo "Web OK on :${WEB_PORT}"
else
  fail "Frontend did not respond on :${WEB_PORT} — check: sudo journalctl -u $WEB_SERVICE -n 50 --no-pager"
fi

log "Deploy complete — $(git rev-parse --short HEAD) on $BRANCH"
