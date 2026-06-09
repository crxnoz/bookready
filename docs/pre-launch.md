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

## 3. SMS — provider decision ⏸
**What:** Pick the SMS provider and finish the integration.

**Status:** **Waiting on the Bandwidth meeting (June 9).** Telnyx was abandoned
after a 10DLC compliance ruling; a Twilio path is scaffolded (`TwilioWebhookController`,
`SmsOptout`, consent capture at booking) but not the live decision. Bandwidth is
the third option being evaluated.

**Decision criteria:** fastest 10DLC / A2P brand+campaign approval, per-message
price, deliverability, and how cleanly it drops into the existing provider-shaped
`SmsService`.

**Once decided (tracked under `#170–172`, `#127`, `#129`):**
- Provision account + number + register A2P 10DLC brand & campaign (1–3 business-day approval — start immediately after the call).
- Wire the provider into `SmsService` (adapter pattern preferred — keep optionality).
- Webhook for inbound + delivery/status callbacks; STOP/HELP handling against `sms_optouts`.
- The two highest-value sends: **client appointment reminders** (the no-show killer) and **instant new-booking alert to the owner**.
- SMS quota tracking + overage logic (`#129`); end-to-end STOP/HELP test on the live number (`#127`).

> Product note: SMS is the single most-requested feature for this market. Treat
> it as the first post-launch (or launch-day) headline feature once the provider
> clears 10DLC.

---

## 4. Security runs ☐
**What:** A focused pre-launch security pass before real customer + payment data
flows.

**Why:** We handle auth, customer PII, and (via Stripe Connect) money. One pass
was done earlier (`#32` — 7 vuln classes); re-run against the current, larger
surface.

**Concrete steps:**
- Re-run the 7-vuln-class review on everything added since (customer accounts, identities, Twilio webhook, health endpoint, the public `check-subdomain` + `leads` endpoints).
- `composer audit` + `npm audit` for new CVEs; bump anything critical.
- Verify rate limits on every public/auth endpoint (booking, login, register, password reset, leads, check-subdomain, verify-code, switch-role).
- Re-grep for secret/`APP_DEBUG`/dev leaks; confirm `APP_DEBUG=false` in prod.
- Confirm CSP, HSTS, COOP/CORP headers still correct after the recent additions.
- ☑ Realip-vs-allow/deny nginx ordering bug fixed 2026-06-09 (`#31`) — root cause was the `cloudflare-realip.conf` include missing from `/etc/nginx/nginx.conf`, so `$remote_addr` was never rewritten and Laravel saw Cloudflare edge IPs in every per-IP throttle. README updated to call out both required includes.
- Pen-test the booking + manage-booking token flow (token entropy, IDOR on appointment IDs, tenant isolation — can tenant A read tenant B's data via any endpoint?).
- Confirm tenant DB isolation holds on every editor controller (the `tenancy()->end()` + plain-array pattern).

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
