'use client'

/**
 * BottegaBooking — re-skins the shared platform booking flow in
 * Bottega's earthy-terracotta-on-cream vocabulary.
 *
 * Pattern follows VelvetTheoryBooking + PetaleBooking (accent + cream
 * canvas, hairline accent borders, sharp-but-not-zero radius). The
 * .is-done step state is outlined accent, not filled, so completed
 * steps don't read identical to the current one.
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

export default function BottegaBooking(props: Props) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      <style>{BOTTEGA_BOOKING_FRAME_CSS}</style>
      <div className="bottega-booking-frame">
        <div className="lush-template bottega-booking-inner">
          <PlatformBookingFlow {...props} />
        </div>
      </div>
    </CustomerAuthProvider>
  )
}

const BOTTEGA_BOOKING_FRAME_CSS = `
.bottega-booking-frame {
  width: 100%;
  /* Match section rhythm — platform booking has no top padding of its own. */
  padding: var(--brk-space-md) 0 var(--brk-space-2xl);
  background: transparent;
}
.bottega-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* Auth strips + summary blocks — dark ink at full opacity on cream. */
.bottega-booking-inner.lush-template .lush-account-widget,
.bottega-booking-inner.lush-template .lush-account-widget *,
.bottega-booking-inner.lush-template .brk-booking-auth-thin,
.bottega-booking-inner.lush-template .brk-booking-auth-thin *,
.bottega-booking-inner.lush-template [class*="brk-booking-summary"],
.bottega-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.bottega-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--bottega-ink) !important;
  opacity: 1 !important;
}

/* Account-CTA tile — Lush keeps a light surface there; force readable
   ink + kill per-element opacity dims so the eyebrow / title / sub /
   arrow all read at full strength. */
.bottega-booking-inner.lush-template .brk-booking-account-cta,
.bottega-booking-inner.lush-template .brk-booking-account-cta *,
.bottega-booking-inner.lush-template .brk-booking-account-cta-body,
.bottega-booking-inner.lush-template .brk-booking-account-cta-eyebrow,
.bottega-booking-inner.lush-template .brk-booking-account-cta-title,
.bottega-booking-inner.lush-template .brk-booking-account-cta-sub,
.bottega-booking-inner.lush-template .brk-booking-account-cta-arrow {
  color: #2A1F18 !important;
  opacity: 1 !important;
}

/* Step indicators — three states. Lush fills both is-active AND is-done
   with --lush-pink; once we override that to the Bottega accent, completed
   steps look identical to the current one. Differentiate: ONLY is-active
   gets a filled accent pill; is-done is outlined accent; upcoming is muted
   outline. */

/* CURRENT step — accent fill, ink number visible inside */
.bottega-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--bottega-accent) !important;
  color: var(--bottega-on-accent) !important;
  border: 1px solid var(--bottega-accent) !important;
}
/* PAST steps — outlined accent, transparent fill */
.bottega-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--bottega-accent) !important;
  border: 1px solid var(--bottega-accent) !important;
}
/* UPCOMING steps — muted outline */
.bottega-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--bottega-muted) !important;
  border: 1px solid var(--bottega-rule) !important;
}
/* Connecting line — accent once previous step is done, hairline otherwise */
.bottega-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--bottega-rule) !important;
}
.bottega-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--bottega-accent) !important;
}

/* Calendar — bump opacity on unavailable + make selected day readable. */
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button,
.bottega-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--bottega-ink) !important;
  opacity: 1 !important;
}
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][disabled],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][aria-disabled="true"],
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="disabled"],
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="unavailable"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: rgba(42,31,24,0.32) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="active"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"],
.bottega-booking-inner.lush-template [class*="brk-booking-day"][class*="active"] {
  background: var(--bottega-accent) !important;
  color: var(--bottega-on-accent) !important;
  border-color: var(--bottega-accent) !important;
  font-weight: 600 !important;
}
.bottega-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="today"] {
  border: 1px solid var(--bottega-accent) !important;
}

/* ── Lush-variable re-skin: paint embedded booking in Bottega tokens ── */
.bottega-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        rgba(255,255,255,0.6);    /* Slightly more opaque cream surface to lift cards off the terrazzo */
  --lush-text:        var(--bottega-ink);
  --lush-muted:       var(--bottega-muted);
  --lush-pink:        var(--bottega-accent);
  --lush-pink-rgb:    var(--bottega-accent-rgb);
  --lush-on-pink:     var(--bottega-on-accent);
  --lush-pink-soft:   color-mix(in srgb, var(--bottega-accent) 18%, transparent);
  --lush-dark-border: var(--bottega-rule);
  --lush-serif:       'DM Serif Display', Georgia, serif;
  --lush-sans:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-ui:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--lush-text);
  background: transparent;
}

/* Bottega corners: 6px mid-radius — softer than Velvet's 0, sharper than Lush's
   pill round. Reads "considered architectural" not "playful". */
.bottega-booking-inner.lush-template *,
.bottega-booking-inner.lush-template *::before,
.bottega-booking-inner.lush-template *::after {
  border-radius: 6px !important;
}

/* Cards, slots, addons — soft cream overlay surface (more opaque than the
   8% terrazzo backdrop) with hairline accent borders. */
.bottega-booking-inner.lush-template .brk-booking-card,
.bottega-booking-inner.lush-template .brk-booking-slot,
.bottega-booking-inner.lush-template .brk-booking-addon,
.bottega-booking-inner.lush-template [class*="brk-booking-summary"],
.bottega-booking-inner.lush-template [class*="brk-booking-staff"],
.bottega-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: rgba(255,255,255,0.6) !important;
  border: 1px solid color-mix(in srgb, var(--bottega-accent) 32%, transparent) !important;
  box-shadow: none !important;
  color: var(--bottega-ink) !important;
}
/* Service cards — same surface treatment. */
.bottega-booking-inner.lush-template .brk-booking-service-card {
  background: rgba(255,255,255,0.6) !important;
  border: 1px solid color-mix(in srgb, var(--bottega-accent) 32%, transparent) !important;
  box-shadow: none !important;
  color: var(--bottega-ink) !important;
}
/* Wrapping grid is layout only — transparent. */
.bottega-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
/* Inner name+price row — strip borders the substring rule may inherit. */
.bottega-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields — soft cream surface, accent focus ring. */
.bottega-booking-inner.lush-template input,
.bottega-booking-inner.lush-template textarea,
.bottega-booking-inner.lush-template select {
  background: rgba(255,255,255,0.65) !important;
  border: 1px solid color-mix(in srgb, var(--bottega-accent) 32%, transparent) !important;
  color: var(--bottega-ink) !important;
}
.bottega-booking-inner.lush-template input:focus,
.bottega-booking-inner.lush-template textarea:focus,
.bottega-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--bottega-accent) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bottega-accent) 18%, transparent) !important;
}
.bottega-booking-inner.lush-template input::placeholder,
.bottega-booking-inner.lush-template textarea::placeholder {
  color: var(--bottega-muted) !important;
}

/* Section titles inside booking — DM Serif Display italic. */
.bottega-booking-inner.lush-template h2,
.bottega-booking-inner.lush-template h3 {
  font-family: 'DM Serif Display', Georgia, serif !important;
  font-weight: 400 !important;
  font-style: italic !important;
  color: var(--bottega-ink) !important;
  letter-spacing: -0.005em !important;
}

/* Eyebrow labels — engine owns font-size + letter-spacing; template
   owns font-family + color (Phase 3 contract). */
.bottega-booking-inner.lush-template .brk-booking-block-label,
.bottega-booking-inner.lush-template .brk-booking-eyebrow,
.bottega-booking-inner.lush-template .brk-booking-step-num {
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
  color: var(--bottega-accent) !important;
}

/* Primary CTA — engine owns SIZE (padding, font-size, letter-spacing);
   template owns APPEARANCE (color, font-family, radius via wildcard). */
.bottega-booking-inner.lush-template .brk-booking-cta,
.bottega-booking-inner.lush-template button[class*="brk-booking-next"],
.bottega-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--bottega-accent) !important;
  color: var(--bottega-on-accent) !important;
  border: 1px solid var(--bottega-accent) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
}
.bottega-booking-inner.lush-template .brk-booking-cta:hover,
.bottega-booking-inner.lush-template button[class*="brk-booking-next"]:hover {
  filter: brightness(1.04) !important;
}

/* Secondary/back buttons — hairline accent border, accent text. */
.bottega-booking-inner.lush-template button[class*="brk-booking-back"],
.bottega-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--bottega-accent) !important;
  border: 1px solid var(--bottega-accent) !important;
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
}

/* Active/selected state on slots, services, addons — subtle accent wash. */
.bottega-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.bottega-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.bottega-booking-inner.lush-template [class*="brk-booking-service"][class*="active"],
.bottega-booking-inner.lush-template [class*="brk-booking-service"][class*="selected"] {
  border-color: var(--bottega-accent) !important;
  background: color-mix(in srgb, var(--bottega-accent) 12%, rgba(255,255,255,0.6)) !important;
}

@media (max-width: 640px) {
  .bottega-booking-frame { padding: var(--brk-space-md) 0 var(--brk-space-xl); }
}
`
