# BookReady — Integrations Roadmap

Canonical plan for the Integrations surface (`/editor/integrations`). Tier 1
is the commitment for launch. Tiers 2–3 are documented so future context isn't
lost, but they are NOT scheduled — we will only finish Tier 1 before launch.

**Strategic decision (locked):** Stripe is the only payment processor. Its
built-in alternative methods (Apple Pay, Google Pay, Link, Klarna, Afterpay,
Affirm) cover the breadth a second processor would, with none of the engineering
or compliance cost. Square is intentionally not on the page; revisit only if a
real customer signs up and refuses without it.

**Legend:** ☐ todo · ◐ in progress · ☑ done · ⏸ blocked/waiting

Last updated: 2026-06-09.

---

## Surface today

`web/components/editor/IntegrationsHub.tsx` renders one live tile (Stripe
Connect, via `StripeConnectCard`) plus six "coming soon" placeholders across
five categories. After Tier 1 ships, three tiles flip to live state — the page
goes from "one live, six grey" to **"three live, five grey"** without changing
the catalog.

Tiles that exist as `coming_soon` placeholders today and stay on the roadmap:
Google Calendar, .ics feed, Import busy calendar, BookReady Marketing,
Mailchimp, Outbound webhooks, Zapier, Google Business Profile.

Tiles that have been removed (and the reasons): Square (competing booking
product, Stripe Connect covers payments cleanly), Klaviyo (no demand signal
yet; Mailchimp covers the same need).

---

## Tier 1 — pre-launch (~2 weeks, all calendar-shaped)

Each piece compounds with the next — the .ics generator from #1 is reused by
#2 and #3, the Google OAuth from sign-in is reused by #4.

### T1.1 — `.ics` feed per owner ☐
**What:** A signed, public iCalendar URL per business that returns
`text/calendar` with one `VEVENT` per upcoming appointment (90-day window).
The owner copies the URL into Apple Calendar / Outlook / Fantastical / Google
Calendar — it appears as a subscribed calendar and refreshes automatically.

**Why:** Covers every calendar app on day one without OAuth, per-user storage,
or rate-limit complexity. Highest ratio in the entire integrations roadmap.

**Concrete steps:**
- New controller `PublicCalendarFeedController` in `api/app/Http/Controllers/Api/`.
- Route `GET /api/v1/cal/{tenant}/{token}.ics` (no auth, throttle ~30/min — calendar apps poll often).
- Token = HMAC of `(tenant_id, owner_user_id, secret)` so revocation = rotating the secret. Store nothing per-token.
- Render VEVENT per row in `appointments` (next 90 days, excluding `cancelled`). Include `SUMMARY`, `DTSTART`/`DTEND` in UTC with `DTSTAMP`, `LOCATION` (tenant business address), `DESCRIPTION` (service + customer name + manage URL), `UID` (`appt-{id}@{slug}.bkrdy.me` — stable so updates replace), `STATUS`.
- `Cache-Control: max-age=600` (10 min) — fast enough for new bookings to surface, slow enough that Google Calendar's poller doesn't hammer us.
- Tenancy: same pattern as `PublicSiteController` — initialize → query → flatten → end.
- Editor UI: a new card in the Calendars category showing the copyable URL + "Copy URL" button + "Regenerate" (rotates the token). Tile status flips from `coming_soon` → `connected` once a token exists.

**Acceptance:** Subscribe from Apple Calendar, Google Calendar, Outlook web. New booking appears within 10 minutes. Cancelled booking disappears within 10 minutes. Rescheduled booking updates in place (UID stable).

### T1.2 — "Add to calendar" button (single-event `.ics`) ☐
**What:** A one-shot `.ics` download in the customer's confirmation email and
on the manage-booking page (`/site/{slug}/manage/{token}`). One click → the
appointment lands in their phone calendar with the built-in reminder.

**Why:** The single highest-leverage no-show reduction we can ship. Reuses the
VEVENT generator from T1.1 — almost zero incremental cost.

**Concrete steps:**
- Reuse the VEVENT renderer from T1.1; extract to a small `CalendarEventService` so both feeds share it.
- New route `GET /api/v1/public/sites/{slug}/appointments/{id}/calendar.ics?token={manage_token}` — same manage-token capability gate as the cancel/reschedule endpoints.
- Confirmation email: button "Add to your calendar" in the layout shell.
- Manage-booking page: button below the appointment summary.

**Acceptance:** Tap on iOS Mail / Gmail mobile / Outlook web — appointment lands in default calendar with location + reminder.

### T1.3 — `.ics` feed per customer ☐
**What:** Same shape as T1.1 but scoped to a BookReady customer account — every
booking the customer has across every tenant in one subscribable feed.

**Why:** A quiet but meaningful customer-account upgrade. Gives end-clients a
real ongoing reason to stay signed in (the persistent-login work we shipped
becomes more valuable). Same generator as T1.1 + T1.2; the only new piece is
the query (`customer_users → customer_user_tenants → appointments` across all
tenants the customer has booked at).

**Concrete steps:**
- New route `GET /api/v1/cal/customer/{token}.ics` (HMAC over customer_user_id + secret).
- Service walks `customer_user_tenants` to find every tenant this customer has booked at; for each, initialize tenancy, query appointments where `customer_user_id = X`, accumulate.
- Centralize the tenancy initialize/end loop carefully — flatten each tenant's rows to plain arrays before ending tenancy.
- Account dashboard UI: same copy-URL + regenerate card on `/account`.

**Acceptance:** Customer with bookings at two tenants subscribes from Google Calendar; sees both businesses' upcoming appointments under one calendar.

### T1.4 — Google Calendar (one-way: BookReady → Google) ☐
**What:** Owner authorizes BookReady; we push every confirmed appointment as
an event in their Google Calendar of choice. Status changes (reschedule,
cancel, no-show) update or remove the event.

**Why:** The single most-requested feature for solo pros. Google Calendar is
where their actual day happens.

**Concrete steps:**
- Extend `GoogleAuthController` (currently `openid profile email`) — add `https://www.googleapis.com/auth/calendar.events.owned`. Two-flow split: existing flow stays sign-in only; new flow is "Connect Google Calendar" from the integrations tile (asks for the elevated scope explicitly so sign-in users aren't surprised).
- New central table `google_calendar_integrations` (`user_id`, `refresh_token`, `calendar_id`, `last_sync_at`, `needs_reconnect`, `connected_at`).
- New `GoogleCalendarSyncService` with `pushEvent(appt) / updateEvent(appt) / deleteEvent(appt)`. Idempotency key = `appt-{id}` mapped to Google's event id (store in `appointments.gcal_event_id` — new tenant column).
- Lifecycle hooks: on appointment create (`pending` → `confirmed` if auto-confirm, else on confirm) → push. On reschedule → update. On cancel / no-show → delete (or convert to a `CANCELLED` event — TBD which feels less weird in the owner's calendar).
- Backfill: when first connected, queue 30 days of upcoming appointments.
- 401 / `invalid_grant` handling: flip `needs_reconnect`, surface in the tile as `action_required`, owner re-authorizes.
- Tile: status-driven card (uses the existing `domain="integration"` registry — `connected` / `not_connected` / `action_required`). Connect button → OAuth flow. When connected, show calendar name + last-sync time + Disconnect.
- Disconnect: revoke the refresh token via Google + delete all events we created + drop the row.
- Dependency: synchronous calls work for v1, but a queue would be cleaner (`#141` on the scale backlog). Defer the queue dependency — synchronous push on the appointment lifecycle is acceptable for launch volume.

**Acceptance:** Owner connects, sees the next 30 days backfilled. Books a new appointment, it appears in Google within ~5s. Reschedules, the event moves. Cancels, the event disappears. Owner disconnects, Google calendar is cleaned up.

### T1.5 — QA + polish ☐
**What:** Two-day cross-app pass before marking the calendar integrations live.

**Concrete steps:**
- Subscribe to T1.1, T1.2, T1.3 from each of: Apple Calendar (macOS + iOS), Google Calendar (web + Android), Outlook web, Fantastical.
- Verify DST transition behavior (an event on a DST boundary day).
- Verify timezone correctness for a tenant on a non-UTC offset.
- Verify the owner-disconnect cleanup for T1.4 actually removes events from Google.
- Tile copy review: "Connected as carreno@gmail.com · syncing to 'BookReady Bookings'" etc.

---

## Tier 2 — first month post-launch (NOT scheduled; documenting intent)

### T2.1 — Google Calendar two-way (import busy times)
The natural follow-up to T1.4. Pull free/busy from the owner's chosen Google
calendar(s) and treat them as availability blocks. Reuses the OAuth + token
storage from Tier 1. Push notifications (webhook) for real-time + 5-min polling
fallback. Conflict logic with existing manual `blocked_dates`.

### T2.2 — Apple Wallet / Google Wallet passes
Generate a `.pkpass` per appointment, attach to the confirmation email. Customer
taps → appointment lives in their Wallet with built-in reminder + location.
Same payload via Google Wallet API. Apple Developer Program ($99/year).

---

## Tier 3 — months 2–3 post-launch (NOT scheduled)

### T3.1 — Google Business Profile (hours sync)
Push tenant hours from `hours` table to GBP so the owner's GBP listing stays
in sync. Real local-SEO selling point.

### T3.2 — Reserve with Google
The big GBP prize — "Book" button straight on Google Search / Maps results.
Partner-approval long pole (wall-clock weeks to months); the engineering itself
is days once admitted to the program.

### T3.3 — Outbound webhooks
"When booking created / confirmed / cancelled, POST to this URL." Strictly
blocked on the Redis + queue workers backlog (`#141`) — synchronous webhooks
would block bookings on the receiver's latency, which is unacceptable.

---

## Permanently on roadmap (build on real demand only)

- **Mailchimp** — most beauty pros aren't running campaigns there.
- **Zapier** — needs T3.3 webhooks first + Zapier marketplace review (weeks of wall-clock).
- **BookReady Marketing** — this is a *product*, not an integration. Multi-month build. Keep the tile so the page shows the long-term ambition, but treat the bar as "we will not start this until SMS lands and the platform is past 100 active tenants."

Build when ≥5 leads ask for the same one. The tiles stay as `coming_soon`
demand collectors.

---

## What we are NOT building, and why

- **Square** — competes with BookReady (their own booking product). Stripe Connect already covers the payment surface cleanly. Removed from the page.
- **Klaviyo** — no demand signal yet; Mailchimp covers the same need if a customer asks. Removed from the page.
- **Embed snippet** — explicitly excluded from launch. Defer until a real customer asks ("I want to keep my Wix/WordPress site").
- **Twilio / external SMS tile** — customer-facing SMS is handled in-house, not as a connectable integration. The current SMS provider decision (Telnyx → Bandwidth) is tracked in `docs/pre-launch.md` §3.

---

## Cross-references

- **Hub component:** `web/components/editor/IntegrationsHub.tsx` — tile catalog, status badge wiring.
- **Status registry:** `web/lib/status.ts` — `domain="integration"` already supports `connected` / `not_connected` / `action_required` / `coming_soon`. Use these; don't invent new statuses.
- **Stripe Connect (reference for a real status-driven tile):** `web/components/editor/StripeConnectCard.tsx`.
- **Google OAuth (reference for T1.4):** `api/app/Http/Controllers/Api/Auth/GoogleAuthController.php`. CLAUDE.md "Google OAuth" section documents the scope + redirect URI conventions.
- **Tenancy-safe controller pattern (reference for T1.1 / T1.3):** `api/app/Http/Controllers/Api/PublicSiteController.php` — `Schema::hasTable` discipline + flatten before `tenancy()->end()`.
- **Customer accounts (reference for T1.3):** `api/app/Models/CustomerUser.php`, `customer_user_tenants` pivot.
- **Pre-launch doc:** `docs/pre-launch.md` — integrations are intentionally NOT a hard launch blocker; this doc captures what we'd ship anyway because the value/effort ratio is good.

---

## Open decisions

1. **Cancellation handling in T1.4 (Google Calendar):** delete the event entirely, or convert it to a `STATUS:CANCELLED` event? Delete is cleaner for the owner's calendar; cancelled-event preserves the audit trail. Recommendation: delete.
2. **T1.4 backfill window:** 30 days vs. all upcoming. 30 days is fast and covers the common case; "all upcoming" would also push the rare 6-month-out appointment. Recommendation: all upcoming with no end date — Google handles long ranges fine and the owner's expectation is "I see my whole calendar."
3. **T1.4 sync target:** push to the owner's primary calendar by default, but offer a picker ("which calendar should bookings go to?") so they can route to a dedicated `Bookings` calendar. Recommendation: picker, default to primary.
