import { test, expect } from '@playwright/test'

/**
 * Happy-path booking: deposit-required service → checkout → confirmation.
 *
 * Phase 6 of the booking-architecture refactor. See ../README.md for the
 * seeded-test-tenant requirements.
 *
 * What this locks in:
 *   - The 5-step flow advances correctly
 *   - Stripe embedded checkout renders + accepts a test card
 *   - The "All set" confirmation card shows after checkout
 *   - The appointment row is written with status='confirmed' and
 *     payment_status='paid' (verified via API call)
 */

const STRIPE_TEST_CARD = '4242424242424242'

test('books a deposit-required service end-to-end', async ({ page, request }) => {
  await page.goto('/book')

  // Step 1 — pick the seeded "Smoke Test Service".
  await page.getByText('Smoke Test Service').click()
  await page.getByRole('button', { name: /continue|next/i }).click()

  // Step 2 (Add-ons) — should auto-skip when no add-ons are linked. If
  // the seed has add-ons, this guard advances anyway.
  const skipAddons = await page.getByRole('button', { name: /skip|continue/i }).first()
  if (await skipAddons.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await skipAddons.click()
  }

  // Step 3 — pick the first available date and the first available time slot.
  const firstAvailableDate = page.locator('.lush-calendar-day').filter({ hasNotText: 'unavailable' }).first()
  await firstAvailableDate.click()

  await page.locator('[class*="brk-booking-slot"]').first().click()
  await page.getByRole('button', { name: /continue|next/i }).click()

  // Step 4 — fill the customer details form.
  const ts = Date.now()
  await page.getByLabel(/first name/i).fill('Smoke')
  await page.getByLabel(/last name/i).fill('Test')
  await page.getByLabel(/email/i).fill(`smoke+${ts}@bkrdy.test`)
  await page.getByLabel(/phone/i).fill('+15555550100')
  await page.getByRole('button', { name: /continue|next/i }).click()

  // Step 5 — confirm. Submit moves into Stripe embedded checkout.
  await page.getByRole('button', { name: /confirm|book|pay/i }).click()

  // Stripe embedded checkout — fill the test card.
  const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first()
  await stripeFrame.locator('input[name="cardnumber"]').fill(STRIPE_TEST_CARD)
  await stripeFrame.locator('input[name="exp-date"]').fill('12/30')
  await stripeFrame.locator('input[name="cvc"]').fill('123')
  await stripeFrame.locator('input[name="postal"]').fill('10001').catch(() => {})

  await page.getByRole('button', { name: /pay/i }).click()

  // Post-checkout: "All set" confirmation card should appear.
  await expect(page.getByText(/all set/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/your booking is confirmed/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /go to dashboard/i })).toBeVisible()

  // Verify the appointment row was actually written with paid status.
  // (Requires an API endpoint or token-gated manage URL the test can
  // hit. Until we have one, this assertion is documented but not yet
  // executable — uncomment + adapt once a verification endpoint exists.)
  //
  // const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'https://api.bkrdy.me'
  // const resp = await request.get(`${apiUrl}/test/last-appointment?email=smoke+${ts}@bkrdy.test`)
  // expect(resp.status()).toBe(200)
  // const body = await resp.json()
  // expect(body.status).toBe('confirmed')
  // expect(body.payment_status).toBe('paid')
})
