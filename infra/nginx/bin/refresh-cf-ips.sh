#!/usr/bin/env bash
# Regenerates /etc/nginx/snippets/cloudflare-allow.conf from Cloudflare's
# published edge IP ranges, then validates nginx config and reloads if good.
#
# Install at /usr/local/bin/refresh-cf-ips.sh and run weekly via
# /etc/cron.d/refresh-cf-ips. Cloudflare announces new ranges via the
# /ips-v4 and /ips-v6 endpoints below; refreshing weekly keeps us
# in sync with no race window worth worrying about.
#
# Exits non-zero (and does NOT reload) when:
#   - the IP fetch fails
#   - the resulting allow file would be smaller than half the previous one
#     (defensive sanity check against a half-empty fetch)
#   - `nginx -t` fails on the new config

set -euo pipefail

TARGET="/etc/nginx/snippets/cloudflare-allow.conf"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Fetch the published ranges. -f returns non-zero on HTTP errors so we
# fail loudly instead of silently writing an empty file.
V4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsS https://www.cloudflare.com/ips-v6)"

# Build the file: ordered allow lines for v4, then v6, then a final
# deny that catches everything else. Order matters in nginx — the
# first matching directive wins.
{
  echo "# Auto-generated $(date -u +%FT%TZ) by refresh-cf-ips.sh"
  echo "# Source: https://www.cloudflare.com/ips/"
  echo "# Do not edit by hand. Run /usr/local/bin/refresh-cf-ips.sh to regen."
  echo
  echo "# IPv4 ranges"
  for ip in $V4; do echo "allow $ip;"; done
  echo
  echo "# IPv6 ranges"
  for ip in $V6; do echo "allow $ip;"; done
  echo
  echo "deny all;"
} > "$TMP"

# Sanity: if the file shrank by more than half, refuse the swap. Protects
# against a future Cloudflare endpoint change returning a partial list.
if [[ -s "$TARGET" ]]; then
  OLD_LINES=$(wc -l < "$TARGET")
  NEW_LINES=$(wc -l < "$TMP")
  if (( NEW_LINES * 2 < OLD_LINES )); then
    echo "refresh-cf-ips: new file has $NEW_LINES lines vs old $OLD_LINES — refusing to swap" >&2
    exit 1
  fi
fi

install -m 0644 "$TMP" "$TARGET"

# Validate the full nginx config (includes will be pulled in by `nginx -t`)
# before reloading. A bad allow file shouldn't break running nginx.
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "$(date -u +%FT%TZ) refresh-cf-ips: reloaded nginx ($(wc -l < "$TARGET") lines)" >&2
else
  echo "$(date -u +%FT%TZ) refresh-cf-ips: nginx -t FAILED, NOT reloading" >&2
  exit 1
fi
