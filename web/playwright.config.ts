import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for BookReady end-to-end smoke tests. Phase 6 of
 * the booking-architecture refactor (docs/booking-architecture.md).
 *
 * The booking flow handles money. These tests are the safety net we
 * needed before deeper refactors (Phase 7 engine split). They run
 * against:
 *
 *   - PLAYWRIGHT_BASE_URL  — the tenant booking URL to drive
 *     (defaults to https://daysgraphic.bkrdy.me; override for staging
 *     or local dev).
 *
 *   - PLAYWRIGHT_API_URL   — backend API for direct payload checks
 *     and DB-state verification (defaults to https://api.bkrdy.me).
 *
 * See `tests/README.md` for the seeded-test-tenant requirements
 * before turning these on in CI.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Booking tests serialize because they hit a real tenant + write
  // appointments. Running them in parallel would race on slot capacity.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://daysgraphic.bkrdy.me',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
