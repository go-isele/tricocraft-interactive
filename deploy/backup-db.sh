#!/usr/bin/env bash
#
# TrioCraft SQLite backup. Safe to run against a live, running database —
# uses sqlite3's online `.backup` command, which is WAL-safe (server/db/db.js
# runs the database in WAL mode), unlike a plain `cp` of the .sqlite file.
#
# Requires the `sqlite3` CLI (separate from the `better-sqlite3` Node
# library the app itself uses):
#   sudo apt install sqlite3
#
# Run manually:
#   ./deploy/backup-db.sh
#
# Or on a daily cron job (adjust the path to wherever this repo lives):
#   crontab -e
#   0 3 * * * /var/www/triocraft/deploy/backup-db.sh >> /var/log/triocraft-backup.log 2>&1

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_FILE="$REPO_ROOT/server/db/triocraft.sqlite"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_FILE" ]]; then
  echo "No database found at $DB_FILE — nothing to back up yet." >&2
  exit 0
fi

OUT_FILE="$BACKUP_DIR/triocraft-$STAMP.sqlite"
sqlite3 "$DB_FILE" ".backup '$OUT_FILE'"
gzip "$OUT_FILE"

echo "Backed up to $OUT_FILE.gz"

# Prune backups older than KEEP_DAYS so this doesn't grow forever.
find "$BACKUP_DIR" -name 'triocraft-*.sqlite.gz' -mtime +"$KEEP_DAYS" -delete
