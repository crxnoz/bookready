# BookReady monitoring (#123, #125)

Version-controlled ops scripts. The live copies run from `/usr/local/bin/`
on the prod box (`root@198.211.116.44`); update them here, then re-deploy
(see **Install / update** below).

All scripts share the app's Resend credentials, read from
`/var/www/bookready-api/api/.env` (`RESEND_API_KEY`, optional
`ALERTS_EMAIL_TO` — falls back to `carrenoluis318@gmail.com`). They send
from `hello@mybookready.com`, the same verified Resend sender the app uses.

---

## `bookready-uptime.sh` (#123) — uptime probe

Cron: `*/2 * * * *` (every 2 minutes).

Curls the four critical public URLs **through Cloudflare** so it exercises
the full path (Cloudflare → nginx → app/php-fpm → DB):

| Probe    | URL                                    | Expect |
|----------|----------------------------------------|--------|
| `api`    | `https://api.bkrdy.me/api/v1/health`   | 200    |
| `app`    | `https://app.bkrdy.me/api/health`      | 200    |
| `apex`   | `https://bkrdy.me/`                    | 200    |
| `tenant` | `https://thefaderoom.bkrdy.me/`        | 200    |

The API `/health` endpoint returns **503** if the central DB is
unreachable, so a DB outage trips the `api` probe even while PHP is fine.

**Flap protection:** alerts only after **3 consecutive failures** (~6 min
of real downtime), so deploy restarts and brief blips don't page you.
Sends one **DOWN** email when it crosses the threshold and one
**RECOVERED** email when the endpoint comes back. State lives in
`/var/lib/bookready/uptime-<probe>.{fails,alerted}`; logs to
`/var/log/bookready-uptime.log`.

### The gap this does NOT cover → external monitor required

A server-side cron can't detect its own box being **fully down** (no box →
no cron → no email). Close that gap with a free external monitor.

#### UptimeRobot setup (5 minutes, free — do this once)

1. Create a free account at <https://uptimerobot.com>.
2. **Add New Monitor** → Monitor Type: **HTTP(s)**. Repeat for each:
   - `https://api.bkrdy.me/api/v1/health`  — name "BookReady API"
   - `https://app.bkrdy.me/api/health`     — name "BookReady App"
   - `https://bkrdy.me`                    — name "BookReady Marketing/Login"
3. Monitoring interval: **5 minutes** (free tier).
4. Under each monitor's **Advanced** → "Alert if keyword … exists/not":
   for the two health URLs you can require the keyword `ok` to also catch
   "200-but-wrong-body" cases (optional).
5. **Alert Contacts:** add your email (and optionally SMS / a phone-push via
   the UptimeRobot app). Assign to all three monitors.
6. Done. UptimeRobot pings from outside, so it catches full-box-down,
   Cloudflare-origin-unreachable, and cert-expiry that the internal cron
   would miss.

> Tip: BetterStack (betterstack.com/uptime) is a nicer alternative with a
> generous free tier + status pages if you want a public status page later.

---

## Install / update (both scripts)

```bash
# from your machine, after editing a script here:
scp infra/monitoring/bookready-uptime.sh root@198.211.116.44:/usr/local/bin/bookready-uptime.sh
ssh root@198.211.116.44 'chmod +x /usr/local/bin/bookready-uptime.sh'

# cron entries (idempotent — only add if missing):
ssh root@198.211.116.44 'crontab -l 2>/dev/null | grep -q bookready-uptime || \
  (crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/bookready-uptime.sh") | crontab -'
```

Manual test:
```bash
ssh root@198.211.116.44 '/usr/local/bin/bookready-uptime.sh; tail -5 /var/log/bookready-uptime.log'
```
