#!/bin/bash
# Daily MySQL backup for BookReady.
# Dumps bookready_central + every tenant_* DB into ONE compressed file,
# rotates locally with 14 day retention, then chains into the off-server
# sync script so we keep an off-host copy in S3-compatible storage.
# Logs to /var/log.
#
# Restore (latest local): gunzip -c bookready-YYYYMMDD-HHMMSS.sql.gz | mysql
# Restore (from S3):      see infra/backup/README.md
#
# History:
#   - Original (May 2026): local-only, 14 day rotation.
#   - 2026-06-09 (#151): chains into bookready-db-backup-sync.sh on
#     success so the off-host copy lands the same morning. Sync failure
#     does NOT fail the local dump (which is still useful on its own) —
#     it's logged to /var/log/bookready-backup-sync.err for the alert.

set -euo pipefail

BACKUP_DIR=/root/backups/mysql
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/bookready-$TIMESTAMP.sql.gz"
LOG=/var/log/bookready-backup.log
ERR=/var/log/bookready-backup.err
SYNC_SCRIPT=/usr/local/bin/bookready-db-backup-sync.sh

mkdir -p "$BACKUP_DIR"

# Only BookReady-owned DBs — skip mysql/sys/info_schema/perf_schema.
DATABASES=$(mysql -N -e "SHOW DATABASES" | grep -E "^(bookready_|tenant_)")

if [ -z "$DATABASES" ]; then
  echo "[$(date)] FATAL: no BookReady databases found" >> "$ERR"
  exit 1
fi

DB_COUNT=$(echo "$DATABASES" | wc -l)

# --single-transaction = consistent snapshot without locking writes.
# --quick = stream rows instead of buffering (large tenant tables).
# --routines --triggers = include stored procs + triggers.
# --set-gtid-purged=OFF = avoid GTID lines that mess up restores on fresh servers.
mysqldump \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  --databases $DATABASES \
  2>> "$ERR" \
  | gzip -9 > "$DUMP_FILE"

if [ ! -s "$DUMP_FILE" ]; then
  echo "[$(date)] FATAL: dump produced empty file $DUMP_FILE" >> "$ERR"
  rm -f "$DUMP_FILE"
  exit 1
fi

SIZE=$(du -h "$DUMP_FILE" | cut -f1)

# Rotate: drop dumps older than RETENTION_DAYS.
find "$BACKUP_DIR" -name "bookready-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] OK: dumped $DB_COUNT databases to $DUMP_FILE ($SIZE)" >> "$LOG"

# Off-server sync. Run AFTER local dump, in the same cron tick, so the
# new file lands in object storage the same morning. Intentionally
# tolerant: a sync failure does NOT fail this script — the local dump
# is still good, and the sync script has its own daily cron to backfill.
#
# Silent skip when sync env isn't wired yet (pre-launch — see
# infra/backup/README.md). Once the founder installs creds and
# /etc/bookready/backup-sync.env exists, this block kicks in
# automatically on the next nightly run. No noise in logs / alerts.
if [ -x "$SYNC_SCRIPT" ] && [ -f /etc/bookready/backup-sync.env ]; then
  "$SYNC_SCRIPT" || echo "[$(date)] WARN: $SYNC_SCRIPT exited non-zero (see /var/log/bookready-backup-sync.err)" >> "$ERR"
fi
