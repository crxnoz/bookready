'use client'

/**
 * InkhouseBooking, dark-charcoal + rust re-skin of the shared platform
 * booking flow.
 *
 * Same shim pattern as Opaline / Velvet / Blackline:
 *   1. TemplateBookingShell injects PLATFORM_BOOKING_CSS so all
 *      brk-booking-* classes resolve.
 *   2. The shell wraps content in .lush-template so the scoped platform
 *      rules match (M2c.2 will drop this wrapper).
 *   3. Override the platform's --lush-* variables with Inkhouse tokens.
 *   4. Pull the flow into the brutalist-editorial vocabulary: sharp
 *      radii, Cormorant headings, Inter body, warm-charcoal surfaces,
 *      rust accents.
 *
 * The accent inherits from the template root (var(--inkhouse-accent)),
 * so a tenant who picks Burnt Sienna / Warm Stone / Walnut re-tones the
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

export default function InkhouseBooking(props: Props) {
  return (
    <TemplateBookingShell
      frameClass="inkhouse-booking-frame"
      scopeClass="inkhouse-booking-inner"
      themeCss={INKHOUSE_BOOKING_CSS}
    >
      <PlatformBookingFlow {...props} />
    </TemplateBookingShell>
  )
}

const INKHOUSE_BOOKING_CSS = `
.inkhouse-booking-frame {
  width: 100%;
  padding: 0;
}
.inkhouse-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* Re-skin: paint the embedded booking in Inkhouse tokens. The accent
   inherits from the template root so the tenant's picked swatch retones
   the whole flow. Sharp radii everywhere via the engine tokens. */
.inkhouse-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        var(--inkhouse-surface, #161313);
  --lush-text:        var(--inkhouse-text, #F5F0E8);
  --lush-muted:       var(--inkhouse-muted, #B8B0A5);
  --lush-pink:        var(--inkhouse-accent, #C84A1E);
  --lush-pink-rgb:    200, 74, 30;
  --lush-on-pink:     var(--inkhouse-on-accent, #F5F0E8);
  --lush-pink-soft:   rgba(200, 74, 30, 0.18);
  --lush-dark-border: var(--inkhouse-rule, #2A2520);
  --lush-serif:       'Cormorant Garamond', Georgia, serif;
  --lush-sans:        'Inter', system-ui, -apple-system, sans-serif;
  --lush-ui:          'Inter', system-ui, -apple-system, sans-serif;
  /* Brutalist: every surface is sharp. */
  --brk-booking-radius-card:  0;
  --brk-booking-radius-cta:   0;
  --brk-booking-radius-input: 0;
  color: var(--lush-text);
  background: transparent;
}

/* Auth strips + summary blocks need full-strength cream on the near-black page. */
.inkhouse-booking-inner.lush-template .lush-account-widget,
.inkhouse-booking-inner.lush-template .lush-account-widget *,
.inkhouse-booking-inner.lush-template .brk-booking-auth-thin,
.inkhouse-booking-inner.lush-template .brk-booking-auth-thin *,
.inkhouse-booking-inner.lush-template [class*="brk-booking-summary"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.inkhouse-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--inkhouse-text) !important;
  opacity: 1 !important;
}

/* Booking H2: engine owns size + letter-spacing; template owns font + color. */
.inkhouse-booking-inner.lush-template .brk-booking-head h2 {
  font-family: 'Cormorant Garamond', Georgia, serif !important;
  font-weight: 700 !important;
  color: var(--inkhouse-text) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-eyebrow,
.inkhouse-booking-inner.lush-template .brk-booking-block-label {
  font-family: 'Cormorant Garamond', Georgia, serif !important;
  font-style: italic !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.28em !important;
  color: var(--inkhouse-accent) !important;
}

/* Cards, slots, addons, summary: warm-charcoal surface + thin rule. Target
   specific classes so the container + inner rows are not over-styled (do
   NOT substring-match brk-booking-service). */
.inkhouse-booking-inner.lush-template .brk-booking-card,
.inkhouse-booking-inner.lush-template .brk-booking-slot,
.inkhouse-booking-inner.lush-template .brk-booking-addon,
.inkhouse-booking-inner.lush-template .brk-booking-service-card,
.inkhouse-booking-inner.lush-template [class*="brk-booking-summary"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-staff"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: var(--inkhouse-surface) !important;
  border: 1px solid var(--inkhouse-rule) !important;
  box-shadow: none !important;
  color: var(--inkhouse-text) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields: charcoal surface, thin warm rule, rust focus ring. */
.inkhouse-booking-inner.lush-template input,
.inkhouse-booking-inner.lush-template textarea,
.inkhouse-booking-inner.lush-template select {
  background: var(--inkhouse-surface) !important;
  border: 1px solid var(--inkhouse-rule) !important;
  color: var(--inkhouse-text) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
}
.inkhouse-booking-inner.lush-template input:focus,
.inkhouse-booking-inner.lush-template textarea:focus,
.inkhouse-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--inkhouse-accent) !important;
}
.inkhouse-booking-inner.lush-template input::placeholder,
.inkhouse-booking-inner.lush-template textarea::placeholder {
  color: var(--inkhouse-muted) !important;
}

/* Step indicators: differentiate current vs done (Lush fills both with
   --lush-pink). Current = filled rust; done = outlined rust. */
.inkhouse-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--inkhouse-accent) !important;
  color: var(--inkhouse-on-accent) !important;
  border: 1px solid var(--inkhouse-accent) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--inkhouse-accent) !important;
  border: 1px solid var(--inkhouse-accent) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--inkhouse-muted) !important;
  border: 1px solid var(--inkhouse-rule) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--inkhouse-rule) !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--inkhouse-accent) !important;
}

/* Calendar: readable cream days, rust selection. */
.inkhouse-booking-inner.lush-template [class*="brk-booking-cal"] button,
.inkhouse-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--inkhouse-text) !important;
  opacity: 1 !important;
}
.inkhouse-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.inkhouse-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: color-mix(in srgb, var(--inkhouse-muted) 45%, transparent) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.inkhouse-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"] {
  background: var(--inkhouse-accent) !important;
  color: var(--inkhouse-on-accent) !important;
  border-color: var(--inkhouse-accent) !important;
  font-weight: 600 !important;
}

/* Headings inside booking: Cormorant. */
.inkhouse-booking-inner.lush-template h2,
.inkhouse-booking-inner.lush-template h3 {
  font-family: 'Cormorant Garamond', Georgia, serif !important;
  font-weight: 700 !important;
  color: var(--inkhouse-text) !important;
  letter-spacing: 0.005em !important;
}

/* Primary CTA: rust fill, sharp corners (radius via token). */
.inkhouse-booking-inner.lush-template .brk-booking-cta,
.inkhouse-booking-inner.lush-template button[class*="brk-booking-next"],
.inkhouse-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--inkhouse-text) !important;
  color: #0A0A0A !important;
  border: 1px solid var(--inkhouse-text) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.18em !important;
}
.inkhouse-booking-inner.lush-template .brk-booking-cta:hover,
.inkhouse-booking-inner.lush-template button[class*="brk-booking-next"]:hover,
.inkhouse-booking-inner.lush-template button[class*="brk-booking-submit"]:hover {
  background: var(--inkhouse-accent) !important;
  border-color: var(--inkhouse-accent) !important;
  color: var(--inkhouse-on-accent) !important;
}

/* Secondary / back: hairline outline, cream text. */
.inkhouse-booking-inner.lush-template button[class*="brk-booking-back"],
.inkhouse-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--inkhouse-text) !important;
  border: 1px solid var(--inkhouse-rule) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  text-transform: uppercase !important;
  letter-spacing: 0.18em !important;
}

/* Selected slot / service / addon: rust-washed surface. */
.inkhouse-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.inkhouse-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.inkhouse-booking-inner.lush-template .brk-booking-service-card[class*="selected"],
.inkhouse-booking-inner.lush-template .brk-booking-addon[class*="selected"] {
  border-color: var(--inkhouse-accent) !important;
  background: color-mix(in srgb, var(--inkhouse-accent) 14%, var(--inkhouse-surface)) !important;
}

@media (max-width: 640px) {
  .inkhouse-booking-frame { padding: 0; }
}
`
