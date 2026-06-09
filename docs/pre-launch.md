# BookReady — Pre-Launch Plan

Canonical checklist for getting to a confident public launch. Agent-readable:
each item says **what**, **why**, **concrete steps**, **status**, and any
**blocker**. Cross-references the task list (`#NNN`) where work is already
tracked.

**Legend:** ☐ todo · ◐ in progress · ☑ done · ⏸ blocked/waiting

Last updated: 2026-06-06.

---

## 1. Copy & content polish

### 1A. Review all email templates ☐
**What:** Audit every transactional email for correct copy, tone, branding,
and no broken variables. 27 Blade templates in `api/resources/views/mail/`.

**Why:** Emails are the most-seen surface after the booking page — a typo or a
`{{ $undefined }}` in a confirmation email reads as "this company is sloppy."

**The inventory** (group → file):
- **Client-facing (appointment):** `booking-request-client`, `appointment-confirmed-client`, `appointment-cancelled-client`, `appointment-rescheduled-client`, `appointment-reminder-client`
- **Client-facing (payments):** `balance-due-client`, `balance-paid-client`, `late-fee-charged-client`, `payment-refunded-client`, `tip-request-client`
- **Owner alerts:** `booking-request-owner`, `client-cancelled-owner`, `client-rescheduled-owner`, `first-booking-owner`, `payout-failed-owner`, `dispute-opened-owner`, `dispute-closed-owner`, `stripe-connect-restricted`, `stripe-connect-verified`
- **Platform / account:** `welcome`, `customer-welcome`, `verify-email`, `customer-verify-email`, `password-reset`, `customer-password-reset`, `password-changed`, `email-changed`
- **Layout:** `layouts/bookready.blade.php` (shared shell — CAN-SPAM address already added)

**Checklist per template:**
- Copy reads naturally, no placeholder/lorem, correct sender voice (tenant-branded vs BookReady-branded — see `AppointmentMailer::brand()` vs `PlatformMailer`).
- Every Blade `{{ $var }}` is actually passed by its mailable; render each with the test-send tool (Settings → Notifications → Test send covers the 5 customizable ones) and by triggering the rest in staging.
- The 5 **customizable** templates (`booking_request_client`, `appointment_confirmed`, `appointment_cancelled`, `appointment_rescheduled`, `appointment_reminder`) respect the tenant's subject/intro/signoff overrides + `sender_name` + `reply_to_email`.
- Links resolve (manage-booking token URLs, pay-balance/tip URLs, verify URLs).
- Mobile rendering OK (inline styles, 560px table).
- Footer carries DaysGraphic LLC + postal address (done) and an unsubscribe/why-am-I-getting-this line where required.

### 1B. Review all tenant-dashboard text ☐
**What:** Read every word in the editor app (`app.bkrdy.me/editor/*`) and rewrite
anything that isn't **plain, owner-facing language**.

**Why:** Our buyers are salon/barber/lash pros, not developers. Internal words
leak into the UI ("tenant," "subdomain," "slug," "payload," "Connect account").
The text must read like a friendly coworker, not a config panel.

**Concrete steps:**
- Sweep labels, helper text, empty states, error messages, button copy, tooltips across every editor surface: Dashboard, Website hub (all tabs), Bookings, Customers, Payments hub, Settings hub (8 tabs), Services, Staff, Availability, Policies, Onboarding wizard.
- Replace jargon: "subdomain/slug" → "your booking link / web address"; "tenant" → "your business"; "Stripe Connect account" → "your payouts / getting paid"; "payload/sync" → plain verbs.
- Reading level: aim ~grade 6. Short sentences. Say what the field does and what shows publicly.
- Make error messages actionable ("That time's already booked — pick another" not "409 conflict").
- Pass already partly done on the onboarding wizard (A10) and Help Center (#131) — reuse that warm, plainspoken voice as the reference tone.

---

## 2. Scale — prepare for 2,000 tenants ◐
**What:** Make the architecture comfortable at ~2,000 active tenants (each with
its own MySQL database in the DB-per-tenant model).

**Why:** The current single-box, synchronous, per-tenant-DB setup is fine for
dozens of tenants but has known cliffs at scale: sequential `tenants:migrate`,
synchronous provisioning, no shared cache/queue, uploads on local disk.

**Already tracked (the scale backlog):**
- ☐ Managed MySQL (DigitalOcean) — `#134`
- ☐ Redis: cache + queue + sessions — `#135`
- ☐ Object storage for tenant uploads (S3 / R2 / DO Spaces) — `#136`
- ☐ Async tenant provisioning — `#137`
- ☐ Chunked / parallel `tenants:migrate` — `#138`
- ☐ Redis-cache tenant resolution (subdomain → tenant_id) — `#139`
- ☐ Cache `GET /public/sites/{slug}` in Redis — `#140`
- ☐ Move email + SMS sends to a queue — `#141`
- ☐ Supervisor + queue workers on prod — `#142`
- ☐ Cloudflare in front of all hosts — `#143` (note: bkrdy.me already on CF; verify all hosts)
- ☐ Image optimization on upload — `#146`
- ☐ Load test at 2,000-tenant scale (k6) — `#149`
- ☐ Separate API host from Next.js host / load balancer — `#150`
- ☐ Off-server DB backup sync (S3/B2) — `#151`

**Sequencing suggestion:** Redis + queue workers + object storage first (they
unblock email/SMS throughput and reliable uploads), then managed MySQL +
async/chunked provisioning (the per-tenant-DB scaling), then load test to find
the real ceiling before adding more hardware.

---

## 3. SMS — Twilio (decided 2026-06-09) ◐
**What:** Provision Twilio + finish the integration so SMS is live for launch.

**Provider decision (2026-06-09):** Twilio. The June 9 Bandwidth meeting confirmed
their pricing is the right service but the wrong fit for our scale today
(~$3,500/mo minimum for ~875k SMS — capacity we don't yet need). Twilio's
pay-as-you-go A2P at ~$0.0083/SMS lets us start with real volume from day 1
and graduate to Bandwidth when steady-state volume justifies the fixed cost.

**Current state of the code:**
- `App\Services\Sms\SmsService` is already Twilio-shaped (REST POST to
  `api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`, HTTP Basic auth
  via account_sid + auth_token, `MessagingServiceSid` preferred over a bare
  `From` number for A2P number-pool routing). Dry-run mode auto-engages
  when creds are absent — drops `notification_send_log` rows with
  `status='dry_run'` so the rest of the codebase can wire SMS without
  surprise.
- `TwilioWebhookController` handles status callbacks + inbound (STOP/HELP).
- `sms_optouts` table + booking-time `sms_consent_at` + `sms_consent_ip`
  capture done.
- ✓ SMS quota tracking + 110% hard cap shipped 2026-06-09 (`#129`).

**Number type: Toll-free (8YY), not 10DLC.** Decided 2026-06-09 in the Twilio
onboarding call. Tradeoff vs 10DLC:

- ✓ One number serves the entire platform (no per-carrier-fee math, higher
  throughput per number, cleaner architecture for the SaaS-fans-out-to-many
  send pattern).
- ✓ Toll-Free Verification (TFV) is a single approval flow, not the two-step
  brand-then-campaign dance of 10DLC.
- ✗ Slightly higher per-message cost (~$0.0098/SMS vs ~$0.0083 for 10DLC) —
  irrelevant at launch volume.
- ✗ TFV approval typically takes 1-3 weeks (10DLC is usually 3-7 days).

**Founder gates that remain (Tonight C, `#170–172`):**
- Buy a toll-free number in Twilio Console (any 8YY prefix), submit it for
  Toll-Free Verification immediately. Use-case category: "Higher Education /
  Healthcare / Public Service" doesn't fit; submit under "Marketing,
  Transactional Confirmation" — appointment reminders + booking confirmations
  are the canonical transactional pattern reviewers approve.
- While TFV is in progress, the number can still send to a small whitelist
  ("daily limit unverified") of 6 messages/day per recipient and similar caps.
  Useful for our own STOP/HELP testing (`#127`) before TFV clears.
- Populate `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`
  (the +18YY... number directly) in prod `.env`. `TWILIO_MESSAGING_SERVICE_SID`
  is unnecessary at this stage — Messaging Services are for 10DLC pool routing,
  not single toll-free.
- ✗ End-to-end STOP/HELP test on the live number (`#127`). Run this DURING TFV
  using a test recipient on the unverified whitelist; the result is the
  evidence Twilio sometimes asks for as part of TFV.

**Backend changes still owed:**
- None functional. The TwilioClient class isn't strictly required (raw HTTP
  matches the rest of the codebase's pattern); the Tonight C2 task can be
  marked done once C1 is provisioned and dry-run mode flips to live.

> Product note: SMS is the single most-requested feature for this market.
> Treat it as the first post-launch (or launch-day) headline feature once
> Twilio TFV clears. Migration path to Bandwidth is clean — the
> `SmsService::send` interface is provider-agnostic; swap-in happens at
> the HTTP-call layer with an adapter when the time comes. Migration from
> toll-free to a 10DLC number pool when volume justifies the carrier
> fees is similarly low-effort: swap `TWILIO_FROM_NUMBER` for a
> `TWILIO_MESSAGING_SERVICE_SID`.

---

## 4. Security runs ◐ (Round 2 audit shipped 2026-06-09; residual items below)
**What:** A focused pre-launch security pass before real customer + payment data
flows.

**Why:** We handle auth, customer PII, and (via Stripe Connect) money. One pass
was done earlier (`#32` — 7 vuln classes); re-run against the current, larger
surface.

**Round 2 audit — closed 2026-06-09 (`#189`):**
- ☑ Realip-vs-allow/deny nginx ordering bug fixed (`#31`) — root cause was the `cloudflare-realip.conf` include missing from `/etc/nginx/nginx.conf`, so `$remote_addr` was never rewritten and Laravel saw Cloudflare edge IPs in every per-IP throttle. README updated to call out both required includes.
- ☑ APP_DEBUG flipped from `true` to `false` and APP_ENV from `staging` to `production` in prod `.env` + `optimize:clear`. Error pages no longer leak stack traces or config.
- ☑ Customer/BookingsController cross-tenant IDOR (CRITICAL): the index walked `Tenant::all()` and matched clients by email or phone as a "self-heal" fallback, then silently stamped matched rows with the authed `customer_user_id`. An attacker registering a fresh customer under a victim's email could absorb every anonymous booking ever placed under that email at every tenant. Fix: pivot-only scan + strict `customer_user_id` match in both `index` and `loadContext`, no self-heal. Claim flow + booking-time stamp (now exact-email-gated) are the only paths that establish the link.
- ☑ PublicBookingController booking-time auto-stamp (HIGH): now only stamps when (a) `clients.customer_user_id` is NULL and (b) the booking's `customer_email` exactly matches the authed customer's email (case-insensitive, trimmed). Prevents both overwriting another customer's link and absorbing a third party's history when a single device handles bookings for a family.
- ☑ DangerController identity-hash mismatch (MEDIUM): `deleteAccount` now reads `identities.password` first (canonical per #159), falling back to the legacy `customer_users.password` mirror — same pattern as `ProfileController::changePassword`. Asymmetric password checks across the two controllers would have let a stale-mirror attacker nuke an account they couldn't log in to.
- ☑ PublicBookingController after-hours email lookup (MEDIUM): normalized to `LOWER(email) = LOWER(trim(input))` on both sides. The prior raw `==` lookup let casing typos pass through unevenly.
- ☑ Marketing `/leads` throttle tightened from `5,1` to `2,1`. No captcha + no honeypot on that endpoint.
- ☑ Public/auth route throttle audit (every public route verified): all non-webhook public routes have an explicit `throttle:` middleware; webhooks gate on signature verification before any DB lookup.
- ☑ Security headers verified on `app.bkrdy.me` and tenant sites (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, COOP, CORP, Permissions-Policy, Referrer-Policy). `api.bkrdy.me` is JSON-only and ships just HSTS, which is correct.

**Residual risk — defer to post-launch (none are launch-blockers):**
- Token entropy / hash-at-rest (HIGH-rated by audit, low realistic exploit): manage-booking / tip / waitlist-claim / availability-request tokens are 40-char `Str::random` (strong entropy) but compared with MySQL `=` (not constant-time) and stored plaintext. Plan: store SHA-256(token) and `hash_equals` compare. Needs a migration per token surface.
- Claim flow single-use enforcement (HIGH): HMAC + 7-day TTL but stateless. A leaked claim URL is replayable inside the window if the user deletes + re-registers. Plan: add a `claim_tokens` table keyed on `SHA256(token)` with `used_at`.
- `AuthFromCookie` promotes the customer cookie on `/api/v1/public/*` (MEDIUM, data integrity): a signed-in customer's cookie travels with every booking-form / availability / tip / waitlist call, so the now-fixed auto-stamp narrowing (above) is the only thing preventing them from being silently linked to bookings for someone else. Plan: skip cookie promotion on public booking POST, or require explicit acknowledgement in the booking form.
- `Tenant::all()` walks still in `ClaimController::suggestName` + `linkExistingClients` (MEDIUM, scaling): same pattern as the fixed `BookingsController::index`. Will be unusable at 1k+ tenants. Plan: bound to the customer's existing pivot tenants (which require an existing link). Fold into the Scale roadmap.
- `composer audit`: 3 advisories (Laravel CRLF in email rule, symfony/http-foundation IpUtils SSRF, symfony/routing UrlGenerator). All require BookReady-specific usage to be exploitable; none reachable on the current surface as far as I can see. Plan: bump symfony minor; document Laravel patch lineage.
- `npm audit`: 5 advisories on Next.js 14.2.29 (image optimization, middleware redirect, server-component DoS, cache poisoning). Fix is `next@16` preview — breaking change. Plan: assess whether a stable 14.x or 15.x patch covers these; otherwise schedule a controlled Next 15 upgrade post-launch.
- LOW items (`ClaimController::suggestName` name disclosure to anyone holding the claim token, manage-booking reschedule blocked-dates UX, no Turnstile on customer register): cleanup, not security blockers.

Track residual items as follow-ups; they don't gate launch.

---

## 5. More templates ☐ (not launch-blocking)
**What:** Expand the template catalog beyond the current 7
(`thefaderoom`, `lushstudio`, `velvettheory`, `blackline`, `opaline`, `petale`, `bottega`).

**Why:** More looks = more sub-niches feel "made for me" at signup. Not required
to launch — 7 is plenty to start — but cheap upside via the `template-creator` skill.

**Candidate directions (pick by gap):** minimalist nail/lash (scandi clean),
vintage barber (warm/serif), bold maximalist color-stylist, coastal/wellness spa,
luxe medspa. Each: brand brief → scaffold → register → backend defaults → build.

---

## 6. Environments, demos & early access

### 6A. Testing / staging environment ☐
**What:** A real staging environment separate from production, so QA and feature
work never touch live tenants.

**Why:** Today everything runs on the one prod box (`198.211.116.44`,
`APP_ENV=staging` ironically). Once real customers are on, you can't safely test
migrations/features against prod. Need an isolated env (separate box or a
staging branch + DB) with its own throwaway tenants.

**Steps:** stand up a staging host (or DO app/droplet), point a `*.staging.bkrdy.me`
wildcard at it, seed a few disposable tenants, and make the deploy pipeline target
staging first → prod.

### 6B. Demo sites showcasing new features ☐
**What:** A small set of flagship, fully-populated demo tenants (like Pétale /
Daysgraphic) that show off the product at its best.

**Why:** For the marketing site, sales conversations, and screenshots. One polished
demo per template, each with real imagery, services, gallery, before/afters, FAQ,
reviews — proof the product looks pro out of the box.

### 6C. Testing sites for early-access testers ☐
**What:** Provision sandbox tenants (or a guided early-access program) for a
handful of real beauty pros to use before public launch.

**Why:** Real owners surface real bugs and copy confusion faster than any internal
QA. Run 5–10 friendly salons through the full flow; collect feedback; fix.

**Steps:** pick beta testers, give them trial accounts (or comped plans), a
feedback channel (hello@ / a form → `marketing_leads`), and watch the
support digest. Tie to the dashboard's daily digest so nothing slips.

---

## 7. Marketing site + SEO ☐
**What:** Focus pass on `mybookready.com` (the Hostinger marketing site) for
conversion and search ranking.

**Why:** It's the top of the funnel. Right now it exists (pricing/templates/about/
contact) but hasn't had a dedicated SEO/conversion pass. Organic search for
"salon booking software," "barber booking app," etc. is durable, free acquisition.

**Concrete steps:**
- **On-page SEO:** title tags, meta descriptions, H1s, alt text, internal links per page. Target keywords per page (booking software for salons / barbers / lash techs / spas).
- **Technical SEO:** sitemap.xml, robots.txt, fast load, mobile, Open Graph/Twitter cards for nice link previews.
- **Schema:** `SoftwareApplication`/`Organization` schema on marketing; `LocalBusiness` schema on every tenant site (`{slug}.bkrdy.me`) so tenants themselves rank locally — a real selling point.
- **Content:** a few cornerstone articles / comparison pages ("BookReady vs …", "how to reduce no-shows"). The Help Center (`/help`) doubles as indexable content.
- **Conversion:** sharpen the hero, the pricing page, and the template gallery → signup handoff (already wired); add social proof (the early-access testimonials) once available.
- The repo has SEO skills available (`searchfit-seo:*`) — use them for the audit + content briefs.

---

## Cross-reference: pre-launch tasks already DONE
14-day trial + card flow, marketing→signup handoff, wizard-first landing,
Remember me, dual accounts, email verification (code), CAPTCHA, Stripe products +
plan picker + subscription webhook, ToS at signup, marketing pages, DB backups,
uptime monitoring (`#123`), error alerting (`#124`), support/inbox digest (`#125`),
refund policy, onboarding wizard glow-up, dashboard upgrade, Help Center (`#131`),
sample/starter content, editor QA hardening (`#154`).

## Open decisions for the founder
1. **SMS provider** — resolve after the June 9 Bandwidth call.
2. **Staging:** separate box vs branch+DB on the same host.
3. **Early-access cohort:** who are the first 5–10 salons?
4. **Launch gate:** which of §1 (copy), §4 (security), §6C (early access) are
   hard blockers vs. fast-follows? Recommendation: §1A + §1B + §4 are blockers;
   §2 scale items are "before you market hard"; §5 templates + §7 SEO are
   continuous, not blockers.
