#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# bookready-uptime.sh  (#123)
#
# Server-side uptime probe. Curls the critical public URLs THROUGH Cloudflare
# (so it tests the full path: Cloudflare → nginx → app/php-fpm → DB) and emails
# via Resend when an endpoint stays down, with flap protection + recovery
# notices.
#
# Install:  copy to /usr/local/bin/bookready-uptime.sh, chmod +x, add to cron:
#   */2 * * * * /usr/local/bin/bookready-uptime.sh
#
# Coverage + the one gap:
#   - Catches app-layer failures (502/503/timeouts, DB down via /health 503,
#     SSL problems, nginx down) even while the box itself is up.
#   - Does NOT catch a full box-down (this script can't run if the box is
#     dead). That gap is covered by an EXTERNAL monitor (UptimeRobot) — see
#     infra/monitoring/README.md.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

STATE_DIR=/var/lib/bookready
LOG=/var/log/bookready-uptime.log
ENV_FILE=/var/www/bookready-api/api/.env

# Alert after this many CONSECUTIVE failures (every 2 min → ~6 min of real
# downtime). Rides over deploy restarts + brief blips without crying wolf.
THRESHOLD=3
# curl timeout per check (connect + total).
TIMEOUT=10

mkdir -p "$STATE_DIR"

# Shared Resend creds from the app env (same pattern as bookready-log-alert.sh).
RESEND_KEY=$(grep -m1 "^RESEND_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
TO_EMAIL=$(grep -m1 "^ALERTS_EMAIL_TO=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
[ -z "${TO_EMAIL:-}" ] && TO_EMAIL="carrenoluis318@gmail.com"

if [ -z "${RESEND_KEY:-}" ]; then
  echo "[$(date)] FATAL: no RESEND_API_KEY in $ENV_FILE" >> "$LOG"
  exit 1
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# send_email <subject> <text-body>
send_email() {
  local subject="$1" body="$2"
  local payload
  payload=$(python3 -c "
import json, sys
print(json.dumps({
  'from': 'BookReady Uptime <hello@mybookready.com>',
  'to': ['$TO_EMAIL'],
  'subject': '''$subject''',
  'text': sys.stdin.read(),
}))
" <<<"$body")
  local code
  code=$(curl -s -o /tmp/uptime-resend-resp -w "%{http_code}" \
    -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $RESEND_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" || echo "000")
  if [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 300 ] 2>/dev/null; then
    log "email sent: $subject (http $code)"
  else
    log "email FAILED: $subject (http $code) $(cat /tmp/uptime-resend-resp 2>/dev/null)"
  fi
}

# check_endpoint <name> <url> <expected_http_code>
check_endpoint() {
  local name="$1" url="$2" expect="$3"
  local fails_file="$STATE_DIR/uptime-${name}.fails"
  local alerted_file="$STATE_DIR/uptime-${name}.alerted"

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")

  local fails=0
  [ -f "$fails_file" ] && fails=$(cat "$fails_file" 2>/dev/null || echo 0)

  if [ "$code" = "$expect" ]; then
    # Healthy. If we were in an alerted-down state, send recovery.
    if [ -f "$alerted_file" ]; then
      send_email "[BookReady] RECOVERED: $name is back up" \
"$name is responding normally again.

  URL:        $url
  HTTP:       $code (expected $expect)
  Recovered:  $(date)

It had been failing for at least $fails consecutive checks."
      rm -f "$alerted_file"
      log "RECOVERED $name (http $code)"
    fi
    echo 0 > "$fails_file"
  else
    # Failing. Bump the counter.
    fails=$((fails + 1))
    echo "$fails" > "$fails_file"
    log "DOWN $name http=$code expect=$expect fails=$fails"
    # Alert once when we cross the threshold (alerted flag prevents repeats).
    if [ "$fails" -ge "$THRESHOLD" ] && [ ! -f "$alerted_file" ]; then
      send_email "[BookReady] DOWN: $name is not responding" \
"$name failed $fails consecutive uptime checks.

  URL:       $url
  HTTP:      $code (expected $expect)
  Since:     ~$((fails * 2)) minutes ago
  Detected:  $(date)

This is a server-side probe — if the whole box were down you would NOT
get this email (the external monitor covers that case). A response here
means Cloudflare → nginx → app or the DB is the likely culprit. Check:
  ssh root@198.211.116.44 'pm2 status && systemctl status php8.2-fpm nginx'
  ssh root@198.211.116.44 'tail -100 /var/www/bookready-api/api/storage/logs/laravel.log'"
      touch "$alerted_file"
      log "ALERTED $name"
    fi
  fi
}

# ── The probes ───────────────────────────────────────────────────────────────
# API health (200 healthy / 503 if DB down → both surface as a state change).
check_endpoint "api"        "https://api.bkrdy.me/api/v1/health"  "200"
# Editor app liveness.
check_endpoint "app"        "https://app.bkrdy.me/api/health"     "200"
# Marketing/login apex.
check_endpoint "apex"       "https://bkrdy.me/"                   "200"
# A representative public tenant site (proves the subdomain rewrite path).
check_endpoint "tenant"     "https://thefaderoom.bkrdy.me/"       "200"

exit 0
