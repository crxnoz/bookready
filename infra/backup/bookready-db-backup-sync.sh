#!/bin/bash
# Mirror /root/backups/mysql/ to an S3-compatible object store, so a
# host loss (drive failure, accidental rm -rf, droplet wiped during a
# DigitalOcean snapshot fumble) doesn't take the last 14 days of
# database backups with it.
#
# Idempotent: `aws s3 sync` uploads only what's missing. Run after
# the daily dump (bookready-db-backup.sh chains into this on success)
# AND on its own cron to backfill any files that didn't make it up.
#
# Credentials + endpoint come from /etc/bookready/backup-sync.env which
# is root-readable only. The env file should set:
#
#   BACKUP_SYNC_BUCKET           e.g. bookready-prod-backups
#   BACKUP_SYNC_PREFIX           e.g. mysql/                 (trailing slash)
#   BACKUP_SYNC_ENDPOINT_URL     e.g. https://nyc3.digitaloceanspaces.com
#                                     for B2:   https://s3.us-east-005.backblazeb2.com
#                                     for AWS:  unset (defaults to AWS)
#   BACKUP_SYNC_REGION           e.g. nyc3   (or us-east-005, or us-east-1)
#   AWS_ACCESS_KEY_ID            Spaces/B2/AWS access key
#   AWS_SECRET_ACCESS_KEY        secret
#
# Provider notes:
#   - DigitalOcean Spaces: same DC as the droplet, $5/mo flat for 250 GB.
#     Simplest if you already have a DO billing relationship.
#   - Backblaze B2: cheapest by far ($0.006/GB/mo, free egress to CF), but
#     a separate billing relationship. Switch to this once dump volume justifies.
#   - AWS S3: standard but pricier ($0.023/GB/mo + egress). Use only if
#     you need cross-region replication out of the box.
#
# Restore: see infra/backup/README.md.

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
BACKUP_DIR=/root/backups/mysql
ENV_FILE=/etc/bookready/backup-sync.env
LOG=/var/log/bookready-backup-sync.log
ERR=/var/log/bookready-backup-sync.err

# ── Guard: env file present + readable ──────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "[$(date)] FATAL: $ENV_FILE missing. Off-server backup sync disabled." >> "$ERR"
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# Required env vars (no defaults — fail loudly if missing rather than
# silently uploading to the wrong place).
: "${BACKUP_SYNC_BUCKET:?BACKUP_SYNC_BUCKET must be set in $ENV_FILE}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set in $ENV_FILE}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set in $ENV_FILE}"

PREFIX="${BACKUP_SYNC_PREFIX:-mysql/}"
ENDPOINT_FLAG=""
if [ -n "${BACKUP_SYNC_ENDPOINT_URL:-}" ]; then
  ENDPOINT_FLAG="--endpoint-url=$BACKUP_SYNC_ENDPOINT_URL"
fi
REGION_FLAG=""
if [ -n "${BACKUP_SYNC_REGION:-}" ]; then
  REGION_FLAG="--region=$BACKUP_SYNC_REGION"
fi

# ── Guard: aws CLI installed ────────────────────────────────────────
if ! command -v aws >/dev/null 2>&1; then
  echo "[$(date)] FATAL: awscli not installed (apt-get install awscli)." >> "$ERR"
  exit 1
fi

# ── Guard: local dump dir present + non-empty ───────────────────────
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
  echo "[$(date)] WARN: $BACKUP_DIR empty or missing. Nothing to sync." >> "$ERR"
  exit 0
fi

# ── Sync ────────────────────────────────────────────────────────────
# `aws s3 sync` is idempotent: uploads new files, skips files already
# in the bucket. Same retention window as local (14 days) — we let the
# local rotation drop expired dumps from this dir, then run a separate
# `s3 rm` pass below to mirror that retention in the bucket (so the
# bucket doesn't grow forever).
#
# --storage-class: STANDARD is fine for the small volume here.
# --no-progress: keep cron output quiet.
# --only-show-errors: don't spam the log when nothing changed.
DEST="s3://${BACKUP_SYNC_BUCKET}/${PREFIX}"

# shellcheck disable=SC2086
aws s3 sync "$BACKUP_DIR/" "$DEST" \
  $ENDPOINT_FLAG $REGION_FLAG \
  --exclude "*" \
  --include "bookready-*.sql.gz" \
  --no-progress \
  --only-show-errors \
  >> "$LOG" 2>> "$ERR"

# ── Mirror local rotation in the bucket ─────────────────────────────
# List the bucket's bookready-*.sql.gz objects, find any that no longer
# exist locally, and delete them remotely. This keeps the bucket from
# accumulating forever, while still having a buffer (we only delete
# what local rotation has already dropped).
#
# Use `aws s3 ls` for the listing (no `aws s3api` needed for this
# scale). We're filtering on the LastModified date — anything older
# than RETENTION_DAYS+1 (1-day buffer) gets removed.
RETENTION_DAYS=14
CUTOFF=$(date -d "$((RETENTION_DAYS + 1)) days ago" +%s)

# shellcheck disable=SC2086
aws s3 ls "$DEST" $ENDPOINT_FLAG $REGION_FLAG \
  | grep "bookready-" \
  | while read -r line; do
      LAST_MODIFIED=$(echo "$line" | awk '{print $1" "$2}')
      KEY=$(echo "$line" | awk '{print $4}')
      AGE_TS=$(date -d "$LAST_MODIFIED" +%s 2>/dev/null || echo "$CUTOFF")
      if [ "$AGE_TS" -lt "$CUTOFF" ]; then
        # shellcheck disable=SC2086
        aws s3 rm "${DEST}${KEY}" $ENDPOINT_FLAG $REGION_FLAG \
          --only-show-errors \
          >> "$LOG" 2>> "$ERR"
        echo "[$(date)] rotated: removed ${KEY} (older than ${RETENTION_DAYS} days)" >> "$LOG"
      fi
    done

# ── Health stamp ────────────────────────────────────────────────────
# Stamp a small marker so the uptime / health surface can tell when the
# last successful sync was. If the script ever silently stops working
# (creds rotated, bucket revoked), the marker stales out and the
# admin /system/health tile flags it.
mkdir -p /var/lib/bookready
date +%s > /var/lib/bookready/last-backup-sync.ts
echo "[$(date)] OK: synced $(find "$BACKUP_DIR" -name "bookready-*.sql.gz" | wc -l) local files to $DEST" >> "$LOG"
