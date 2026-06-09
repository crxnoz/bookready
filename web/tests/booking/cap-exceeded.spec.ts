import { test, expect } from '@playwright/test'

/**
 * Per-customer per-day cap. Locks in the 2026-06-09 fix where the
 * booking endpoint added a guard against customers booking multiple
 * same-day appointments above the tenant's configured cap
 * (booking_settings.max_appointments_per_customer_per_day; default 1).
 *
 * Hits the public booking API directly twice with the same email +
 * date, verifies the second one returns 422 with a readable error.
 *
 * This is the only test in the suite that doesn't exercise the UI —
 * it's an API contract test for the booking endpoint specifically.
 */

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'https://api.bkrdy.me'

test('second same-day booking by same customer returns 422', async ({ request }) => {
  const ts = Date.now()
  const email = `cap+${ts}@bkrdy.test`

  // Pick a date 3 days out so it's almost certainly inside the
  // tenant's release window + has slots.
  const target = new Date()
  target.setDate(target.getDate() + 3)
  const targetIso = target.toISOString().slice(0, 10)

  // The exact payload shape depends on the seed tenant — adapt the
  // service_id, slot_time, and slug below to whatever the seed uses.
  const slug = process.env.PLAYWRIGHT_TENANT_SLUG ?? 'smoketest'
  const basePayload = {
    service_id:   1,            // from SmokeTestTenantSeeder
    date:         targetIso,
    slot_time:    '10:00',
    customer: {
      first_name: 'Cap',
      last_name:  'Test',
      email,
      phone:      '+15555550102',
    },
    addons: [],
    sms_consent: false,
  }

  // First booking — should succeed.
  const first = await request.post(`${API_URL}/api/v1/public/sites/${slug}/appointments`, {
    data: basePayload,
  })
  expect([200, 201]).toContain(first.status())

  // Second booking, same email, same date, different slot. Should 422.
  const second = await request.post(`${API_URL}/api/v1/public/sites/${slug}/appointments`, {
    data: { ...basePayload, slot_time: '14:00' },
  })
  expect(second.status()).toBe(422)
  const body = await second.json()
  expect(body.message).toMatch(/already have a booking|cap|limit/i)
})
