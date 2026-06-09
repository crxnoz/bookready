import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for BookReady end-to-end smoke tests. Phase 6 of
 * the booking-architecture refactor (docs/booking-architecture.md).
 *
 * The booking flow handles money. These tests are the safety net we
 * needed before deeper refactors (Phase 7 engine split).
 *
 * Two run modes:
 *
 * 1) LOCAL DEV (no env vars set) — auto-starts `npm run dev` on :3000
 *    and points the tests at it. You still need a local API on :8000
 *    (`php artisan serve` from api/) and a seeded test tenant on it
 *    (see tests/README.md). Use this for pre-deploy smoke testing.
 *
 *      cd web
 *      npm run test:e2e              # auto-starts web dev server
 *
 * 2) MANUAL SMOKE against a live tenant — set the env vars yourself:
 *
 *      PLAYWRIGHT_BASE_URL=https://your-test-tenant.bkrdy.me \
 *        PLAYWRIGHT_API_URL=https://api.bkrdy.me \
 *        npm run test:e2e
 *
 *    Never point this at a production tenant — the tests write real
 *    appointments and burn real time slots.
 *
 * Env vars:
 *   - PLAYWRIGHT_BASE_URL — tenant booking URL the browser drives.
 *     Defaults to http://localhost:3000 (with webServer auto-start).
 *   - PLAYWRIGHT_API_URL  — backend API for direct payload checks.
 *     Defaults to http://localhost:8000 in local mode,
 *     https://api.bkrdy.me when PLAYWRIGHT_BASE_URL is set.
 *
 * See tests/README.md for the seeded-test-tenant prerequisites before
 * turning these on in CI.
 */
const usingLocalDev = !process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Booking tests serialize because they hit a real tenant + write
  // appointments. Running them in parallel would race on slot capacity.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  // In local-dev mode, auto-start the Next dev server. In live-tenant
  // mode (PLAYWRIGHT_BASE_URL set), assume the URL is already up and
  // skip the auto-start.
  webServer: usingLocalDev
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: true,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
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
