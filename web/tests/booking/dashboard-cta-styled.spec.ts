import { test, expect } from '@playwright/test'

/**
 * "Go to dashboard" CTA visual contract. Locks in:
 *
 *   1. The 2026-06-09 cascade-fight fix where TFR's `.tfr-template a
 *      { color: inherit }` was beating the engine's bare-class CTA
 *      color rule, rendering black-on-black.
 *
 *   2. Phase 2 + 3 of the booking-architecture refactor — the engine
 *      now uses canonical --brk-booking-cta-bg / -fg tokens with
 *      proper specificity, and TFR's !important overrides for THIS
 *      specific class were left in place as belt-and-suspenders.
 *
 * If this test fails, the regression is almost certainly:
 *   - A new template wraps booking in something that broadcasts
 *     `a { color: inherit }` without an override, OR
 *   - The .brk-booking-account-followup-cta engine rule lost its
 *     anchor selector and dropped to 0,1,0 specificity again.
 *
 * The test only checks the rendered styles, not the navigation —
 * navigating to app.bkrdy.me/account would require auth.
 */

const TEMPLATES_UNDER_TEST = [
  { slug: 'thefaderoom-test',  expectedBgRgb: 'rgb(18, 18, 18)' },
  { slug: 'velvettheory-test', expectedBgRgb: 'rgb(18, 18, 18)' },
  { slug: 'bottega-test',      expectedBgRgb: 'rgb(18, 18, 18)' },
  { slug: 'petale-test',       expectedBgRgb: 'rgb(18, 18, 18)' },
  { slug: 'opaline-test',      expectedBgRgb: 'rgb(18, 18, 18)' },
  { slug: 'blackline-test',    expectedBgRgb: 'rgb(18, 18, 18)' },
  // Lush is the default — its CTA bg comes from the engine via Lush's
  // own --lush-cta-bg = #121212.
  { slug: 'lushstudio-test',   expectedBgRgb: 'rgb(18, 18, 18)' },
]

for (const { slug, expectedBgRgb } of TEMPLATES_UNDER_TEST) {
  test(`"Go to dashboard" CTA renders white-on-dark on ${slug}`, async ({ page }) => {
    // The CTA renders post-payment, but we can also force it visible by
    // hitting the booking page with a stripe_confirmed query param that
    // the booking shell reads. (Adjust if the contract changes.)
    await page.goto(`https://${slug}.bkrdy.me/book?test_show_followup=1`)

    const cta = page.locator('.brk-booking-account-followup-cta').first()
    await expect(cta).toBeVisible({ timeout: 15_000 })

    // The Phase 1 + 3 contract: dark fill, white text.
    await expect(cta).toHaveCSS('background-color', expectedBgRgb)
    await expect(cta).toHaveCSS('color', 'rgb(255, 255, 255)')

    // The CTA text should NOT be visually identical to its background.
    // This is the actual regression we shipped on 2026-06-09 — the text
    // inherited the card's #121212 dark color and matched the button's
    // #121212 fill exactly, making it invisible.
    const styles = await cta.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return { bg: computed.backgroundColor, fg: computed.color }
    })
    expect(styles.bg).not.toBe(styles.fg)
  })
}
