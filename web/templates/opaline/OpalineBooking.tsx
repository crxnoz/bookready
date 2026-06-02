'use client'

/**
 * OpalineBooking — champagne + pearl re-skin of the shared platform
 * booking flow.
 *
 * Same shim pattern as Velvet Theory / Blackline:
 *   1. Inject PLATFORM_BOOKING_CSS so all brk-booking-* classes resolve
 *   2. Wrap in .lush-template so the scoped platform rules match
 *      (M2c.2 will drop this wrapper)
 *   3. Override the platform's --lush-* variables with Opaline tokens
 *   4. Add pointed rules to pull the flow into Opaline's soft, airy,
 *      pearl-and-champagne vocabulary (Cormorant headings, Jost labels,
 *      hairline rules, small radii, generous spacing)
 *
 * The accent inherits from the template root (var(--opaline-accent)),
 * so a tenant who picks Taupe / Rose Nude / Sage / Slate re-tones the
 * booking flow automatically.
 */

import {
  PlatformBookingFlow,
  CustomerAuthProvider,
  PLATFORM_BOOKING_CSS,
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

export default function OpalineBooking(props: Props) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      <style>{OPALINE_BOOKING_CSS}</style>
      <div className="opaline-booking-frame">
        <div className="lush-template opaline-booking-inner">
          <PlatformBookingFlow {...props} />
        </div>
      </div>
    </CustomerAuthProvider>
  )
}

const OPALINE_BOOKING_CSS = `
.opaline-booking-frame {
  width: 100%;
  padding: 0;
}
.opaline-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* ── Re-skin: paint the embedded booking in Opaline tokens ──
   Accent inherits from the template root so the tenant's picked swatch
   re-tones the whole flow. The rgb triplet is the champagne default —
   only the subtle glows use it, so a swatch change is imperceptible. */
.opaline-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        var(--opaline-surface, #FCFAF5);
  --lush-text:        var(--opaline-ink, #2A2620);
  --lush-muted:       var(--opaline-muted, #857C70);
  --lush-pink:        var(--opaline-accent, #B89B72);
  --lush-pink-rgb:    184, 155, 114;
  --lush-on-pink:     var(--opaline-on-accent, #2A2620);
  --lush-pink-soft:   rgba(184,155,114,0.16);
  --lush-dark-border: var(--opaline-rule, rgba(42,38,32,0.12));
  --lush-serif:       'Cormorant Garamond', Georgia, serif;
  --lush-sans:        'Jost', system-ui, -apple-system, sans-serif;
  --lush-ui:          'Jost', system-ui, -apple-system, sans-serif;
  color: var(--lush-text);
  background: transparent;
}

/* Auth widgets — tight to the form body. */
.opaline-booking-inner.lush-template .lush-account-widget,
.opaline-booking-inner.lush-template .brk-booking-auth-thin {
  margin-bottom: 20px !important;
}

/* Auth strips + summary blocks need full-strength ink on the pearl page. */
.opaline-booking-inner.lush-template .lush-account-widget,
.opaline-booking-inner.lush-template .lush-account-widget *,
.opaline-booking-inner.lush-template .brk-booking-auth-thin,
.opaline-booking-inner.lush-template .brk-booking-auth-thin *,
.opaline-booking-inner.lush-template [class*="brk-booking-summary"],
.opaline-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.opaline-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--opaline-ink) !important;
  opacity: 1 !important;
}

/* The "Reserve Your Appointment" h2 the platform hard-codes inside
   .brk-booking-head — pull it into Cormorant so it reads as Opaline. */
.opaline-booking-inner.lush-template .brk-booking-head h2 {
  font-family: 'Cormorant Garamond', Georgia, serif !important;
  font-weight: 500 !important;
  font-size: clamp(38px, 5vw, 56px) !important;
  letter-spacing: 0.005em !important;
  color: var(--opaline-ink) !important;
}
.opaline-booking-inner.lush-template .brk-booking-eyebrow,
.opaline-booking-inner.lush-template .brk-booking-block-label {
  font-family: 'Jost', sans-serif !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.32em !important;
  text-transform: uppercase !important;
  color: var(--opaline-accent) !important;
}

/* Cards, slots, addons, summary — soft pearl surface + hairline rule.
   Target specific classes so the container + inner rows are not
   accidentally restyled (do NOT substring-match brk-booking-service). */
.opaline-booking-inner.lush-template .brk-booking-card,
.opaline-booking-inner.lush-template .brk-booking-slot,
.opaline-booking-inner.lush-template .brk-booking-addon,
.opaline-booking-inner.lush-template .brk-booking-service-card,
.opaline-booking-inner.lush-template [class*="brk-booking-summary"],
.opaline-booking-inner.lush-template [class*="brk-booking-staff"],
.opaline-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: var(--opaline-surface) !important;
  border: 1px solid var(--opaline-rule) !important;
  border-radius: 3px !important;
  box-shadow: none !important;
  color: var(--opaline-ink) !important;
}
/* The services grid is layout only — no surface, no border. */
.opaline-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
/* Inner name + price row — transparent. */
.opaline-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields — soft surface, hairline border, champagne focus ring. */
.opaline-booking-inner.lush-template input,
.opaline-booking-inner.lush-template textarea,
.opaline-booking-inner.lush-template select {
  background: var(--opaline-surface) !important;
  border: 1px solid var(--opaline-rule) !important;
  border-radius: 3px !important;
  color: var(--opaline-ink) !important;
  font-family: 'Jost', sans-serif !important;
}
.opaline-booking-inner.lush-template input:focus,
.opaline-booking-inner.lush-template textarea:focus,
.opaline-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--opaline-accent) !important;
}
.opaline-booking-inner.lush-template input::placeholder,
.opaline-booking-inner.lush-template textarea::placeholder {
  color: var(--opaline-muted) !important;
}

/* Step indicators — differentiate current vs done (Lush fills both with
   --lush-pink). Current = filled champagne; done = outlined champagne. */
.opaline-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--opaline-accent) !important;
  color: var(--opaline-on-accent) !important;
  border: 1px solid var(--opaline-accent) !important;
}
.opaline-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--opaline-accent) !important;
  border: 1px solid var(--opaline-accent) !important;
}
.opaline-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--opaline-muted) !important;
  border: 1px solid var(--opaline-rule) !important;
}
.opaline-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--opaline-rule) !important;
}
.opaline-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--opaline-accent) !important;
}

/* Calendar — readable days, champagne selection. */
.opaline-booking-inner.lush-template [class*="brk-booking-cal"] button,
.opaline-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--opaline-ink) !important;
  opacity: 1 !important;
}
.opaline-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.opaline-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.opaline-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.opaline-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: color-mix(in srgb, var(--opaline-muted) 55%, transparent) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.opaline-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.opaline-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.opaline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.opaline-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"] {
  background: var(--opaline-accent) !important;
  color: var(--opaline-on-accent) !important;
  border-color: var(--opaline-accent) !important;
  font-weight: 500 !important;
}

/* Headings inside booking — Cormorant. */
.opaline-booking-inner.lush-template h2,
.opaline-booking-inner.lush-template h3 {
  font-family: 'Cormorant Garamond', Georgia, serif !important;
  font-weight: 500 !important;
  color: var(--opaline-ink) !important;
  letter-spacing: 0.005em !important;
}

/* Primary CTA — champagne fill, tracked uppercase Jost. */
.opaline-booking-inner.lush-template .brk-booking-cta,
.opaline-booking-inner.lush-template button[class*="brk-booking-next"],
.opaline-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--opaline-accent) !important;
  color: var(--opaline-on-accent) !important;
  border: 1px solid var(--opaline-accent) !important;
  border-radius: 2px !important;
  font-family: 'Jost', sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: 0.2em !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  padding: 16px 30px !important;
}
.opaline-booking-inner.lush-template .brk-booking-cta:hover,
.opaline-booking-inner.lush-template button[class*="brk-booking-next"]:hover {
  filter: brightness(1.05) !important;
}

/* Secondary / back — hairline outline, champagne text. */
.opaline-booking-inner.lush-template button[class*="brk-booking-back"],
.opaline-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--opaline-accent) !important;
  border: 1px solid var(--opaline-rule) !important;
  border-radius: 2px !important;
  font-family: 'Jost', sans-serif !important;
  letter-spacing: 0.2em !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  padding: 16px 26px !important;
}

/* Selected slot / service / addon — soft champagne wash. */
.opaline-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.opaline-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.opaline-booking-inner.lush-template .brk-booking-service-card[class*="selected"],
.opaline-booking-inner.lush-template .brk-booking-addon[class*="selected"] {
  border-color: var(--opaline-accent) !important;
  background: color-mix(in srgb, var(--opaline-accent) 10%, var(--opaline-surface)) !important;
}

@media (max-width: 640px) {
  .opaline-booking-frame { padding: 0; }
}
`
