#!/usr/bin/env bash
# Regenerates /etc/nginx/snippets/cloudflare-geo.conf from Cloudflare's
# published edge IP ranges, then validates nginx config and reloads if good.
#
# Install at /usr/local/bin/refresh-cf-ips.sh and run weekly via
# /etc/cron.d/refresh-cf-ips. Cloudflare announces new ranges via the
# /ips-v4 and /ips-v6 endpoints below; refreshing weekly keeps us
# in sync with no race window worth worrying about.
#
# The generated file is a `geo` block keyed on $realip_remote_addr (the
# ORIGINAL source IP, preserved by the realip module before it rewrites
# $remote_addr to the CF-Connecting-IP value). Using geo + $is_cloudflare
# instead of allow/deny is the key fix for the realip vs access-control
# ordering trap: nginx's allow/deny runs AFTER realip rewriting, so
# checking the rewritten address always sees the visitor's real IP
# (never a Cloudflare edge) and would 403 every legitimate request.
#
# Exits non-zero (and does NOT reload) when:
#   - the IP fetch fails
#   - the resulting file would be smaller than half the previous one
#     (defensive sanity check against a half-empty fetch)
#   - `nginx -t` fails on the new config

set -euo pipefail

TARGET="/etc/nginx/snippets/cloudflare-geo.conf"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Fetch the published ranges. -f returns non-zero on HTTP errors so we
# fail loudly instead of silently writing an empty file.
V4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsS https://www.cloudflare.com/ips-v6)"

# Build the file: a geo block that sets $is_cloudflare = 1 for traffic
# arriving from any Cloudflare edge IP, 0 otherwise. Server blocks then
# `if ($is_cloudflare = 0) { return 403; }`.
#
# CRITICAL: the geo block is keyed on $realip_remote_addr (the pre-rewrite
# source IP) so it sees the ACTUAL TCP source — not the CF-Connecting-IP
# value that the realip module substitutes into $remote_addr. Without
# this $realip_remote_addr key, the geo lookup would always check the
# visitor's real IP against Cloudflare ranges → always 0 → always 403.
{
  echo "# Auto-generated $(date -u +%FT%TZ) by refresh-cf-ips.sh"
  echo "# Source: https://www.cloudflare.com/ips/"
  echo "# Do not edit by hand. Run /usr/local/bin/refresh-cf-ips.sh to regen."
  echo
  echo "geo \$realip_remote_addr \$is_cloudflare {"
  echo "    default 0;"
  echo
  echo "    # IPv4 ranges"
  for ip in $V4; do echo "    $ip 1;"; done
  echo
  echo "    # IPv6 ranges"
  for ip in $V6; do echo "    $ip 1;"; done
  echo "}"
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

# Old allow-list snippet — if it's still around from the pre-fix deploy,
# it does nothing (no longer included by any site config) but leaving
# stale files in /etc/nginx/snippets/ confuses operators. Best-effort
# cleanup; absence is fine.
rm -f /etc/nginx/snippets/cloudflare-allow.conf

# Validate the full nginx config (includes will be pulled in by `nginx -t`)
# before reloading. A bad geo file shouldn't break running nginx.
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "$(date -u +%FT%TZ) refresh-cf-ips: reloaded nginx ($(wc -l < "$TARGET") lines)" >&2
else
  echo "$(date -u +%FT%TZ) refresh-cf-ips: nginx -t FAILED, NOT reloading" >&2
  exit 1
fi
