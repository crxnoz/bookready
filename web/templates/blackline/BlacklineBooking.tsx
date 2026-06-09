'use client'

/**
 * BlacklineBooking — re-skins the platform booking flow to industrial
 * modern barbershop. Same approach as Velvet Theory:
 *
 *   1. Inject PLATFORM_BOOKING_CSS so all brk-booking-* classes resolve
 *   2. Wrap in .lush-template so the scoped rules match (interim,
 *      pending M2c.2 which drops the scope qualifier)
 *   3. Override Lush's CSS variables with Blackline tokens (onyx canvas,
 *      brass accent, Space Grotesk + Inter)
 *   4. Add rules to flatten Lush's rounded/card vocabulary into
 *      Blackline's sharp hairline-rule editorial language
 *   5. Wrap in CustomerAuthProvider so the booking's auth hook works
 *
 * When M2c.3 ships --brk-booking-* CSS-variable theming hooks, replace
 * the Lush-variable overrides with canonical names and drop the
 * .lush-template wrapper.
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

export default function BlacklineBooking(props: Props) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      <style>{BLACKLINE_BOOKING_CSS}</style>
      <div className="blackline-booking-frame">
        <div className="lush-template blackline-booking-inner">
          <PlatformBookingFlow {...props} />
        </div>
      </div>
    </CustomerAuthProvider>
  )
}

const BLACKLINE_BOOKING_CSS = `
.blackline-booking-frame {
  width: 100%;
  background: transparent;
  padding: var(--brk-space-md) 0 var(--brk-space-2xl);
}
.blackline-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* Auth strips need bone text at full opacity — the bone-at-62% from the
   global override is too low-contrast on onyx. */
.blackline-booking-inner.lush-template .lush-account-widget,
.blackline-booking-inner.lush-template .lush-account-widget *,
.blackline-booking-inner.lush-template .brk-booking-auth-thin,
.blackline-booking-inner.lush-template .brk-booking-auth-thin *,
.blackline-booking-inner.lush-template [class*="brk-booking-summary"],
.blackline-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.blackline-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--blackline-fg) !important;
  opacity: 1 !important;
}

/* The account-CTA keeps a LIGHT (Lush white) surface inside the booking
   — bone text on white is invisible. Force ONYX text in that surface. */
.blackline-booking-inner.lush-template .brk-booking-account-cta,
.blackline-booking-inner.lush-template .brk-booking-account-cta *,
.blackline-booking-inner.lush-template .brk-booking-account-cta-body,
.blackline-booking-inner.lush-template .brk-booking-account-cta-eyebrow,
.blackline-booking-inner.lush-template .brk-booking-account-cta-title,
.blackline-booking-inner.lush-template .brk-booking-account-cta-sub,
.blackline-booking-inner.lush-template .brk-booking-account-cta-arrow {
  color: #0A0A0A !important;
  opacity: 1 !important;
}
.blackline-booking-inner.lush-template .brk-booking-account-cta:hover,
.blackline-booking-inner.lush-template .brk-booking-account-cta:hover * {
  color: var(--blackline-fg) !important;
}

/* Step pills — three states. Differentiate active vs done since both
   default to filled brass in Lush. */
.blackline-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--blackline-accent) !important;
  color: var(--blackline-bg) !important;
  border: 1px solid var(--blackline-accent) !important;
}
.blackline-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--blackline-accent) !important;
  border: 1px solid var(--blackline-accent) !important;
}
.blackline-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--blackline-fg-muted) !important;
  border: 1px solid var(--blackline-rule) !important;
}
.blackline-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--blackline-rule) !important;
}
.blackline-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--blackline-accent) !important;
}

/* Calendar — bone-on-onyx with brass active state. */
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button,
.blackline-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--blackline-fg) !important;
  opacity: 1 !important;
}
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][disabled],
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="disabled"],
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="unavailable"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: rgba(232,226,215,0.32) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="active"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"],
.blackline-booking-inner.lush-template [class*="brk-booking-day"][class*="active"] {
  background: var(--blackline-accent) !important;
  color: var(--blackline-bg) !important;
  border-color: var(--blackline-accent) !important;
  font-weight: 600 !important;
}
.blackline-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="today"] {
  border: 1px solid var(--blackline-accent) !important;
}

/* Lush-variable re-skin — paint embedded booking in Blackline tokens. */
.blackline-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        rgba(232,226,215,0.04);
  --lush-text:        var(--blackline-fg);
  --lush-muted:       var(--blackline-fg-muted);
  --lush-pink:        #B8966B;
  --lush-pink-rgb:    184, 150, 107;
  --lush-on-pink:     var(--blackline-bg);
  --lush-pink-soft:   rgba(184,150,107,0.18);
  --lush-dark-border: var(--blackline-rule);
  --lush-serif:       'Space Grotesk', system-ui, sans-serif;
  --lush-sans:        'Inter', system-ui, -apple-system, sans-serif;
  --lush-ui:          'Inter', system-ui, -apple-system, sans-serif;
  color: var(--lush-text);
  background: transparent;
}

/* Sharp corners across the board — Blackline is square-edged. */
.blackline-booking-inner.lush-template *,
.blackline-booking-inner.lush-template *::before,
.blackline-booking-inner.lush-template *::after {
  border-radius: 0 !important;
}

/* Service / slot / addon / staff cards — strip white-card vocab, replace
   with hairline brass borders on transparent backgrounds. */
.blackline-booking-inner.lush-template [class*="brk-booking-card"],
.blackline-booking-inner.lush-template [class*="brk-booking-slot"],
.blackline-booking-inner.lush-template [class*="brk-booking-service"],
.blackline-booking-inner.lush-template [class*="brk-booking-addon"],
.blackline-booking-inner.lush-template [class*="brk-booking-summary"],
.blackline-booking-inner.lush-template [class*="brk-booking-staff"],
.blackline-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: transparent !important;
  border-color: rgba(184,150,107,0.28) !important;
  box-shadow: none !important;
  color: var(--blackline-fg) !important;
}

/* Form fields — flat, hairline-bordered, brass focus ring. */
.blackline-booking-inner.lush-template input,
.blackline-booking-inner.lush-template textarea,
.blackline-booking-inner.lush-template select {
  background: rgba(232,226,215,0.06) !important;
  border: 1px solid rgba(184,150,107,0.32) !important;
  color: var(--blackline-fg) !important;
}
.blackline-booking-inner.lush-template input:focus,
.blackline-booking-inner.lush-template textarea:focus,
.blackline-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--blackline-accent) !important;
}
.blackline-booking-inner.lush-template input::placeholder,
.blackline-booking-inner.lush-template textarea::placeholder {
  color: var(--blackline-fg-muted) !important;
}

/* Headings inside booking — Space Grotesk. */
.blackline-booking-inner.lush-template h2,
.blackline-booking-inner.lush-template h3 {
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
  font-weight: 500 !important;
  color: var(--blackline-fg) !important;
  letter-spacing: -0.01em !important;
}

/* Eyebrow labels — engine owns font-size + letter-spacing; template
   owns font-family + color (Phase 3 contract). */
.blackline-booking-inner.lush-template .brk-booking-block-label,
.blackline-booking-inner.lush-template .brk-booking-eyebrow,
.blackline-booking-inner.lush-template .brk-booking-step-num {
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
  color: var(--blackline-accent) !important;
}

/* Primary CTA — engine owns SIZE (padding, font-size, letter-spacing);
   template owns APPEARANCE (color, font-family, radius via wildcard). */
.blackline-booking-inner.lush-template .brk-booking-cta,
.blackline-booking-inner.lush-template button[class*="brk-booking-next"],
.blackline-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--blackline-accent) !important;
  color: var(--blackline-bg) !important;
  border: 1px solid var(--blackline-accent) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
}
.blackline-booking-inner.lush-template .brk-booking-cta:hover,
.blackline-booking-inner.lush-template button[class*="brk-booking-next"]:hover {
  opacity: 0.88 !important;
}

/* Secondary / back buttons — hairline outline, brass text. */
.blackline-booking-inner.lush-template button[class*="brk-booking-back"],
.blackline-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--blackline-accent) !important;
  border: 1px solid var(--blackline-accent) !important;
  font-family: 'Inter', sans-serif !important;
  text-transform: uppercase !important;
}

/* Active / selected state on slots, services, addons — soft brass fill. */
.blackline-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.blackline-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.blackline-booking-inner.lush-template [class*="brk-booking-service"][class*="active"],
.blackline-booking-inner.lush-template [class*="brk-booking-service"][class*="selected"] {
  border-color: var(--blackline-accent) !important;
  background: rgba(184,150,107,0.10) !important;
}
`
