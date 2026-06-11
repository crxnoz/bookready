'use client'

/**
 * PetaleBooking — re-skins the shared platform booking flow in Pétale's
 * soft-pink-with-champagne-gold vocabulary.
 *
 * Pattern follows VelvetTheoryBooking (also a background-role template
 * with a constant accent): wrap PlatformBookingFlow in CustomerAuthProvider,
 * inject PLATFORM_BOOKING_CSS + the local re-skin, scope under
 * .lush-template so the platform's scoped rules match, then override the
 * --lush-* variables with Pétale tokens.
 *
 * Pétale is sharp at the edges (small radii not round, hairline gold
 * borders, no shadows) — closer to Velvet's flat editorial than to Lush's
 * rounded card vocabulary. The .is-done step state is outlined gold, not
 * filled, so completed steps don't read identical to the current one.
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

export default function PetaleBooking(props: Props) {
  return (
    <TemplateBookingShell
      frameClass="petale-booking-frame"
      scopeClass="petale-booking-inner"
      themeCss={PETALE_BOOKING_FRAME_CSS}
    >
      <PlatformBookingFlow {...props} />
    </TemplateBookingShell>
  )
}

const PETALE_BOOKING_FRAME_CSS = `
.petale-booking-frame {
  width: 100%;
  /* Match section rhythm — platform booking has no top padding of its own. */
  padding: var(--brk-space-md) 0 var(--brk-space-2xl);
  background: transparent;
}
.petale-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* Auth strips + summary blocks — dark ink at full opacity on pink. */
.petale-booking-inner.lush-template .lush-account-widget,
.petale-booking-inner.lush-template .lush-account-widget *,
.petale-booking-inner.lush-template .brk-booking-auth-thin,
.petale-booking-inner.lush-template .brk-booking-auth-thin *,
.petale-booking-inner.lush-template [class*="brk-booking-summary"],
.petale-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.petale-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--petale-ink) !important;
  opacity: 1 !important;
}

/* Account-CTA tile — Lush keeps a light surface there; force readable
   ink + kill per-element opacity dims so the eyebrow / title / sub /
   arrow all read at full strength. */
.petale-booking-inner.lush-template .brk-booking-account-cta,
.petale-booking-inner.lush-template .brk-booking-account-cta *,
.petale-booking-inner.lush-template .brk-booking-account-cta-body,
.petale-booking-inner.lush-template .brk-booking-account-cta-eyebrow,
.petale-booking-inner.lush-template .brk-booking-account-cta-title,
.petale-booking-inner.lush-template .brk-booking-account-cta-sub,
.petale-booking-inner.lush-template .brk-booking-account-cta-arrow {
  color: #3D2027 !important;
  opacity: 1 !important;
}

/* Step indicators — three states. Lush fills both is-active AND is-done
   with --lush-pink; once we override that to gold, completed steps look
   identical to the current one. Differentiate: ONLY is-active gets a
   filled gold pill; is-done is outlined gold; upcoming is muted outline. */

/* CURRENT step — gold fill, ink number visible inside */
.petale-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--petale-accent) !important;
  color: var(--petale-ink) !important;
  border: 1px solid var(--petale-accent) !important;
}
/* PAST steps — outlined gold, transparent fill */
.petale-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--petale-accent) !important;
  border: 1px solid var(--petale-accent) !important;
}
/* UPCOMING steps — muted outline */
.petale-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--petale-muted) !important;
  border: 1px solid var(--petale-rule) !important;
}
/* Connecting line — gold once previous step is done, hairline otherwise */
.petale-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--petale-rule) !important;
}
.petale-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--petale-accent) !important;
}

/* Calendar — bump opacity on unavailable + make selected day clearly readable. */
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button,
.petale-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--petale-ink) !important;
  opacity: 1 !important;
}
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][disabled],
.petale-booking-inner.lush-template [class*="brk-booking-day"][aria-disabled="true"],
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="disabled"],
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="unavailable"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: rgba(61,32,39,0.32) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="active"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"],
.petale-booking-inner.lush-template [class*="brk-booking-day"][class*="active"] {
  background: var(--petale-accent) !important;
  color: var(--petale-ink) !important;
  border-color: var(--petale-accent) !important;
  font-weight: 600 !important;
}
.petale-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="today"] {
  border: 1px solid var(--petale-accent) !important;
}

/* ── Lush-variable re-skin: paint embedded booking in Pétale tokens ── */
.petale-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        rgba(255,255,255,0.42);  /* Soft warm overlay on the pink canvas */
  --lush-text:        var(--petale-ink);
  --lush-muted:       var(--petale-muted);
  --lush-pink:        #C9A876;                 /* Champagne gold */
  --lush-pink-rgb:    201, 168, 118;
  --lush-on-pink:     #3D2027;                 /* Warm dark ink on gold reads clean */
  --lush-pink-soft:   rgba(201,168,118,0.20);
  --lush-dark-border: var(--petale-rule);
  --lush-serif:       'Playfair Display', 'Cormorant Garamond', Georgia, serif;
  --lush-sans:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-ui:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--lush-text);
  background: transparent;
}

/* Pétale is mid-radius (4px) not sharp 0 — soft enough to read feminine,
   not so soft it reads round. */
.petale-booking-inner.lush-template *,
.petale-booking-inner.lush-template *::before,
.petale-booking-inner.lush-template *::after {
  border-radius: 4px !important;
}

/* Cards, slots, addons — soft warm overlay surfaces with hairline gold borders. */
.petale-booking-inner.lush-template .brk-booking-card,
.petale-booking-inner.lush-template .brk-booking-slot,
.petale-booking-inner.lush-template .brk-booking-addon,
.petale-booking-inner.lush-template [class*="brk-booking-summary"],
.petale-booking-inner.lush-template [class*="brk-booking-staff"],
.petale-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: rgba(255,255,255,0.5) !important;
  border: 1px solid color-mix(in srgb, var(--petale-accent) 36%, transparent) !important;
  box-shadow: none !important;
  color: var(--petale-ink) !important;
}
/* Service cards — same surface treatment. */
.petale-booking-inner.lush-template .brk-booking-service-card {
  background: rgba(255,255,255,0.5) !important;
  border: 1px solid color-mix(in srgb, var(--petale-accent) 36%, transparent) !important;
  box-shadow: none !important;
  color: var(--petale-ink) !important;
}
/* Wrapping grid is layout only — transparent. */
.petale-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
/* Inner name+price row — strip borders the substring rule may inherit. */
.petale-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields — warm soft surface, gold focus ring. */
.petale-booking-inner.lush-template input,
.petale-booking-inner.lush-template textarea,
.petale-booking-inner.lush-template select {
  background: rgba(255,255,255,0.55) !important;
  border: 1px solid rgba(201,168,118,0.36) !important;
  color: var(--petale-ink) !important;
}
.petale-booking-inner.lush-template input:focus,
.petale-booking-inner.lush-template textarea:focus,
.petale-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--petale-accent) !important;
  box-shadow: 0 0 0 3px rgba(201,168,118,0.18) !important;
}
.petale-booking-inner.lush-template input::placeholder,
.petale-booking-inner.lush-template textarea::placeholder {
  color: var(--petale-muted) !important;
}

/* Section titles inside booking — Playfair italic with Pétale cadence. */
.petale-booking-inner.lush-template h2,
.petale-booking-inner.lush-template h3 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-weight: 500 !important;
  font-style: italic !important;
  color: var(--petale-ink) !important;
  letter-spacing: -0.005em !important;
}

/* Eyebrow labels — engine owns font-size + letter-spacing; template
   owns font-family + color (Phase 3 contract). */
.petale-booking-inner.lush-template .brk-booking-block-label,
.petale-booking-inner.lush-template .brk-booking-eyebrow,
.petale-booking-inner.lush-template .brk-booking-step-num {
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
  color: var(--petale-accent) !important;
}

/* Primary CTA — engine owns SIZE (padding, font-size, letter-spacing);
   template owns APPEARANCE (color, font-family, radius via wildcard). */
.petale-booking-inner.lush-template .brk-booking-cta,
.petale-booking-inner.lush-template button[class*="brk-booking-next"],
.petale-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--petale-accent) !important;
  color: var(--petale-ink) !important;
  border: 1px solid var(--petale-accent) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
}
.petale-booking-inner.lush-template .brk-booking-cta:hover,
.petale-booking-inner.lush-template button[class*="brk-booking-next"]:hover {
  filter: brightness(1.04) !important;
}

/* Secondary/back buttons — hairline gold border, gold text. */
.petale-booking-inner.lush-template button[class*="brk-booking-back"],
.petale-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--petale-accent) !important;
  border: 1px solid var(--petale-accent) !important;
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
}

/* Active/selected state on slots, services, addons — subtle gold wash. */
.petale-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.petale-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.petale-booking-inner.lush-template [class*="brk-booking-service"][class*="active"],
.petale-booking-inner.lush-template [class*="brk-booking-service"][class*="selected"],
.petale-booking-inner.lush-template .brk-booking-staff-pick.is-selected {
  border-color: var(--petale-accent) !important;
  background: rgba(201,168,118,0.12) !important;
}

@media (max-width: 640px) {
  .petale-booking-frame { padding: var(--brk-space-md) 0 var(--brk-space-xl); }
}
`
