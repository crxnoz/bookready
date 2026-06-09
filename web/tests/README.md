# BookReady end-to-end tests

Playwright smoke tests for the booking flow. Phase 6 of the booking-
architecture refactor (`docs/booking-architecture.md`).

The booking flow handles money. These tests exist because every prior
deploy that touched booking was brave — and we shipped two regressions
on 2026-06-09 alone (abandoned-checkout stuck rows; black-on-black
"Go to dashboard" CTA under TheFadeRoom). The tests below lock those
fixes in and provide a safety net for future engine refactors.

## Status

**Not yet wired to CI.** Tests are written but the seeded test-tenant
prerequisites below haven't been met. The intended flow:

1. Staging environment stands up (pre-launch backlog item #190)
2. Test tenant seeded with the fixtures documented below
3. CI runs `npm run test:e2e` on every PR touching
   `web/packages/platform/src/booking/` or
   `api/app/Http/Controllers/Api/PublicBookingController.php`

Until then, the tests are runnable locally against any live tenant by
setting `PLAYWRIGHT_BASE_URL` — but **do not run them against a
production tenant** because they write real appointments and burn
real time slots.

## Local dev run

```
cd web
npm install
npx playwright install chromium    # one-time browser download
PLAYWRIGHT_BASE_URL=https://your-test-tenant.bkrdy.me \
  PLAYWRIGHT_API_URL=https://api.bkrdy.me \
  npm run test:e2e
```

Or headed (visible browser) for debugging:

```
npm run test:e2e:headed
```

## Prerequisites for a test tenant

The tests assume the following seed state on the tenant pointed to by
`PLAYWRIGHT_BASE_URL`:

| What | Why |
|---|---|
| ONE bookable service named "Smoke Test Service", $50, 30 minutes, deposit required ($10) | Happy-path test exercises the deposit checkout |
| Stripe Connect account in **test mode** with onboarding complete | Embedded Stripe checkout uses test cards |
| Open availability for at least 7 days ahead | Date picker needs slots to choose from |
| Auto-confirm bookings = ON | Avoids manual approval gating the test |
| Per-customer cap = 1 per day | Cap-exceeded test asserts the 422 |
| Cancellation window = 24 hours, reschedule window = 24 hours | Manage-booking test exercises these |

Recommended seed script lives at `api/database/seeders/SmokeTestTenantSeeder.php`
(not yet written — write when wiring CI).

## What's covered

| Test | What it locks in |
|---|---|
| `booking/happy-path.spec.ts` | End-to-end: pick service → date → time → fill form → test Stripe card → "All set" card renders → DB row written with `payment_status='paid'`, `status='confirmed'` |
| `booking/abandoned-checkout.spec.ts` | Customer closes the Stripe tab mid-flow → `ExpirePendingPayments` cron flips the row to `cancelled` within 15 min (locks in the 2026-06-09 deposit-skipping fix) |
| `booking/dashboard-cta-styled.spec.ts` | "Go to dashboard" CTA in the post-booking card renders with white text on a dark fill across all 7 templates (locks in the 2026-06-09 cascade-fight fix and Phase 2/3 architecture work) |
| `booking/cap-exceeded.spec.ts` | A customer with a same-day booking attempts to book a second one → 422 response with a readable error (locks in the per-customer-per-day cap added 2026-06-09) |

## What's NOT covered (yet)

- Public manage-booking flow (cancel / reschedule via token-gated link)
- Tip flow
- Customer-account dashboard
- The 7-template visual parity that Phase 4 promises
- Stripe webhook handling (`payment_intent.succeeded`, `payment_failed`, etc.)

These should each get a test before the next deep engine refactor.

## What to do when a test fails on CI

1. Check the Playwright report (HTML in `playwright-report/`) — screenshots
   + traces are auto-captured on failure
2. If it's a real regression, revert the offending PR; don't disable
   the test
3. If it's a flake (network, Stripe test mode glitch), file a ticket
   and re-run; don't disable. Three consecutive flakes = investigate
   the test, not the booking flow
