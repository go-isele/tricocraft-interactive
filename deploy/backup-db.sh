#!/usr/bin/env bash
#
# TrioCraft PostgreSQL backup. Uses `pg_dump -Fc` (custom format) — a
# consistent point-in-time dump that's safe to take against a live, running
# database (no need to stop the app), and restores with `pg_restore`.
#
# Requires `pg_dump`/`pg_restore` (installed alongside the `postgresql-client`
# package — see README-DEPLOY.md step 1) and reads connection details from
# DATABASE_URL in server/.env, so it always backs up whatever database the
# app is actually using.
#
# Run manually:
#   ./deploy/backup-db.sh
#
# Or on a daily cron job (adjust the path to wherever this repo lives):
#   crontab -e
#   0 3 * * * /var/www/triocraft/deploy/backup-db.sh >> /var/log/triocraft-backup.log 2>&1
#
# To restore a backup onto a fresh database:
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/triocraft-TIMESTAMP.dump

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/server/.env"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No server/.env found at $ENV_FILE — nothing to back up yet." >&2
  exit 0
fi

# Pull DATABASE_URL out of server/.env without sourcing the whole file
# (other values in there may contain characters bash would choke on, e.g.
# SMTP_FROM's quoted display name).
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d'=' -f2-)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is not set in $ENV_FILE — nothing to back up." >&2
  exit 0
fi

mkdir -p "$BACKUP_DIR"

OUT_FILE="$BACKUP_DIR/triocraft-$STAMP.dump"
pg_dump -Fc "$DATABASE_URL" -f "$OUT_FILE"

echo "Backed up to $OUT_FILE"

# Prune backups older than KEEP_DAYS so this doesn't grow forever.
find "$BACKUP_DIR" -name 'triocraft-*.dump' -mtime +"$KEEP_DAYS" -delete
