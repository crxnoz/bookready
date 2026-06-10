'use client'

/**
 * ClarityBooking, ultra-clean white + muted-accent re-skin of the shared
 * platform booking flow.
 *
 * Same shim pattern as Opaline / Inkhouse / Velvet / Blackline:
 *   1. TemplateBookingShell injects PLATFORM_BOOKING_CSS so all
 *      brk-booking-* classes resolve.
 *   2. The shell wraps content in .lush-template so the scoped platform
 *      rules match (M2c.2 will drop this wrapper).
 *   3. Override the platform's --lush-* variables with Clarity tokens.
 *   4. Set the engine radius tokens to 0 everywhere (luxury reads sharp).
 *   5. Pull the flow into the Apple-Newsroom vocabulary: Inter throughout
 *      (no serifs), generous spacing, charcoal primary CTA, a bare
 *      underlined link for the secondary action.
 *
 * The accent inherits from the template root (var(--clarity-accent)),
 * so a tenant who picks Sage / Dusty Rose / Mauve / Stone retones the
 * booking flow automatically.
 */

import {
  PlatformBookingFlow,
  TemplateBookingShell,
} from '@bkrdy/platform/booking'
import type {
  AvailabilityData, BookingQuestion, PublicPaymentSettings,
  PublicStaffMember, Service, ServiceAddon, ServiceCategory,
} from '@/lib/types'

interface Props {
  slug:                     string
  services:                 Service[]
  displayName:              string
  availability:             AvailabilityData | null
  paymentSettings:          PublicPaymentSettings | null
  requirePolicyAgreement:   boolean
  serviceAddons:            ServiceAddon[]
  staffMembers:             PublicStaffMember[]
  serviceCategories:        ServiceCategory[]
  bookingQuestions:         BookingQuestion[]
}

export default function ClarityBooking(props: Props) {
  return (
    <TemplateBookingShell
      frameClass="clarity-booking-frame"
      scopeClass="clarity-booking-inner"
      themeCss={CLARITY_BOOKING_CSS}
    >
      <PlatformBookingFlow {...props} />
    </TemplateBookingShell>
  )
}

const CLARITY_BOOKING_CSS = `
.clarity-booking-frame {
  width: 100%;
  padding: 0;
}
.clarity-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* Re-skin: paint the embedded booking in Clarity tokens. The accent
   inherits from the template root so the tenant's picked swatch retones
   selection states + focus rings. Engine radius tokens set to 0
   (sharp not rounded, the luxury move). */
.clarity-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        var(--clarity-surface, #FAFAFA);
  --lush-text:        var(--clarity-ink, #1A1A1A);
  --lush-muted:       var(--clarity-muted, #6B6B6B);
  --lush-pink:        var(--clarity-accent, #9EAD9C);
  --lush-pink-rgb:    158, 173, 156;
  --lush-on-pink:     var(--clarity-on-accent, #1A1A1A);
  --lush-pink-soft:   rgba(158, 173, 156, 0.16);
  --lush-dark-border: var(--clarity-rule, #E5E5E5);
  --lush-serif:       'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-sans:        'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-ui:          'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  /* Sharp everywhere, the Clarity move. */
  --brk-booking-radius-card:  0;
  --brk-booking-radius-cta:   0;
  --brk-booking-radius-input: 0;
  color: var(--lush-text);
  background: transparent;
}

/* Auth strips + summary blocks need full-strength ink on the white page. */
.clarity-booking-inner.lush-template .lush-account-widget,
.clarity-booking-inner.lush-template .lush-account-widget *,
.clarity-booking-inner.lush-template .brk-booking-auth-thin,
.clarity-booking-inner.lush-template .brk-booking-auth-thin *,
.clarity-booking-inner.lush-template [class*="brk-booking-summary"],
.clarity-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.clarity-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--clarity-ink) !important;
  opacity: 1 !important;
}

/* Booking H2: Inter light (300), the editorial luxury move. Engine owns
   font-size + letter-spacing; template owns font-family + color + weight. */
.clarity-booking-inner.lush-template .brk-booking-head h2 {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-weight: 300 !important;
  color: var(--clarity-ink) !important;
}
.clarity-booking-inner.lush-template .brk-booking-eyebrow,
.clarity-booking-inner.lush-template .brk-booking-block-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.24em !important;
  font-size: 10px !important;
  color: var(--clarity-accent) !important;
}

/* Cards, slots, addons, summary: a touch of grey to define them against
   the white page + a hairline rule. Target specific classes (do NOT
   substring-match brk-booking-service). */
.clarity-booking-inner.lush-template .brk-booking-card,
.clarity-booking-inner.lush-template .brk-booking-slot,
.clarity-booking-inner.lush-template .brk-booking-addon,
.clarity-booking-inner.lush-template .brk-booking-service-card,
.clarity-booking-inner.lush-template [class*="brk-booking-summary"],
.clarity-booking-inner.lush-template [class*="brk-booking-staff"],
.clarity-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: var(--clarity-surface) !important;
  border: 1px solid var(--clarity-rule) !important;
  box-shadow: none !important;
  color: var(--clarity-ink) !important;
}
/* Services grid is layout only. */
.clarity-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
/* Inner name + price row, transparent. */
.clarity-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields: white surface, hairline border, accent focus ring. */
.clarity-booking-inner.lush-template input,
.clarity-booking-inner.lush-template textarea,
.clarity-booking-inner.lush-template select {
  background: var(--clarity-bg) !important;
  border: 1px solid var(--clarity-rule) !important;
  color: var(--clarity-ink) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
}
.clarity-booking-inner.lush-template input:focus,
.clarity-booking-inner.lush-template textarea:focus,
.clarity-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--clarity-accent) !important;
}
.clarity-booking-inner.lush-template input::placeholder,
.clarity-booking-inner.lush-template textarea::placeholder {
  color: var(--clarity-muted) !important;
}

/* Step indicators: differentiate current vs done (Lush fills both with
   --lush-pink). Current = filled charcoal; done = outlined accent. */
.clarity-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--clarity-ink) !important;
  color: #FFFFFF !important;
  border: 1px solid var(--clarity-ink) !important;
}
.clarity-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--clarity-accent) !important;
  border: 1px solid var(--clarity-accent) !important;
}
.clarity-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--clarity-muted) !important;
  border: 1px solid var(--clarity-rule) !important;
}
.clarity-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--clarity-rule) !important;
}
.clarity-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--clarity-accent) !important;
}

/* Calendar: readable ink days, accent-washed selection. */
.clarity-booking-inner.lush-template [class*="brk-booking-cal"] button,
.clarity-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--clarity-ink) !important;
  opacity: 1 !important;
}
.clarity-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.clarity-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.clarity-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.clarity-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: color-mix(in srgb, var(--clarity-muted) 55%, transparent) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.clarity-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.clarity-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.clarity-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.clarity-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"] {
  background: var(--clarity-ink) !important;
  color: #FFFFFF !important;
  border-color: var(--clarity-ink) !important;
  font-weight: 500 !important;
}

/* Headings inside booking: Inter light. */
.clarity-booking-inner.lush-template h2,
.clarity-booking-inner.lush-template h3 {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-weight: 300 !important;
  color: var(--clarity-ink) !important;
  letter-spacing: -0.005em !important;
}

/* Primary CTA: charcoal fill, white text. Hover darkens to near-black.
   Sharp corners via the engine token. */
.clarity-booking-inner.lush-template .brk-booking-cta,
.clarity-booking-inner.lush-template button[class*="brk-booking-next"],
.clarity-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--clarity-ink) !important;
  color: #FFFFFF !important;
  border: 1px solid var(--clarity-ink) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
}
.clarity-booking-inner.lush-template .brk-booking-cta:hover,
.clarity-booking-inner.lush-template button[class*="brk-booking-next"]:hover,
.clarity-booking-inner.lush-template button[class*="brk-booking-submit"]:hover {
  background: #0A0A0A !important;
  border-color: #0A0A0A !important;
  color: #FFFFFF !important;
}

/* Secondary / back: BARE underlined link, no border, accent on hover.
   The Clarity-distinctive secondary action. */
.clarity-booking-inner.lush-template button[class*="brk-booking-back"],
.clarity-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--clarity-ink) !important;
  border: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
  text-decoration: underline !important;
  text-underline-offset: 4px !important;
  text-decoration-thickness: 1px !important;
  text-decoration-color: var(--clarity-rule) !important;
}
.clarity-booking-inner.lush-template button[class*="brk-booking-back"]:hover,
.clarity-booking-inner.lush-template button[class*="brk-booking-secondary"]:hover {
  color: var(--clarity-accent) !important;
  text-decoration-color: var(--clarity-accent) !important;
  background: transparent !important;
}

/* Selected slot / service / addon: soft accent wash + accent border. */
.clarity-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.clarity-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.clarity-booking-inner.lush-template .brk-booking-service-card[class*="selected"],
.clarity-booking-inner.lush-template .brk-booking-addon[class*="selected"] {
  border-color: var(--clarity-accent) !important;
  background: color-mix(in srgb, var(--clarity-accent) 10%, var(--clarity-surface)) !important;
}

@media (max-width: 640px) {
  .clarity-booking-frame { padding: 0; }
}
`
