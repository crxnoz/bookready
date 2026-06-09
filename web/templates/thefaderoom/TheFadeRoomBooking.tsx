'use client'

/**
 * TheFadeRoomBooking — neon re-skin of the platform booking flow.
 *
 * Replaces the legacy 1700-line custom TFR booking with the same shim
 * pattern Velvet Theory and Blackline use:
 *   1. Inject PLATFORM_BOOKING_CSS so all brk-booking-* classes resolve
 *   2. Wrap in .lush-template so the scoped rules match (M2c.2 interim
 *      pending the canonical CSS-variable theming hooks)
 *   3. Override Lush's CSS variables with TFR neon tokens
 *   4. Add rules to flatten Lush's cream-card vocabulary into TFR's
 *      dark + neon glow editorial language
 *
 * When M2c.3 ships --brk-booking-* canonical hooks, drop the
 * .lush-template wrapper and migrate the overrides.
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

export default function TheFadeRoomBooking(props: Props) {
  return (
    <TemplateBookingShell
      frameClass="tfr-booking-frame"
      scopeClass="tfr-booking-inner"
      themeCss={TFR_BOOKING_CSS}
    >
      <PlatformBookingFlow {...props} />
    </TemplateBookingShell>
  )
}

const TFR_BOOKING_CSS = `
.tfr-booking-frame {
  width: 100%;
  background: transparent;
  padding: var(--brk-space-md) 0 var(--brk-space-2xl);
}
.tfr-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* "Reserve Your Appointment" headline from the platform booking flow.
   Pull it into TFR's vocabulary: white Dancing Script with the same
   neon halo every other section title carries. The h2 lives inside
   .brk-booking-head from the platform shim — we don't control the
   markup, but we own the cascade. */
/* Phase 3 contract: engine owns SIZE (font-size, line-height); template
   owns APPEARANCE (font-family, color, text-shadow). */
.tfr-booking-inner.lush-template .brk-booking-head h2 {
  font-family: 'Dancing Script', 'Pacifico', cursive !important;
  font-weight: 700 !important;
  color: #fff !important;
  text-shadow:
    0 0 6px var(--tfr-accent),
    0 0 14px var(--tfr-accent),
    0 0 30px var(--tfr-accent),
    0 0 56px color-mix(in srgb, var(--tfr-accent) 80%, transparent) !important;
  text-transform: none !important;
}

/* Auth strips + summary need full-strength text on midnight canvas. */
.tfr-booking-inner.lush-template .lush-account-widget,
.tfr-booking-inner.lush-template .lush-account-widget *,
.tfr-booking-inner.lush-template .brk-booking-auth-thin,
.tfr-booking-inner.lush-template .brk-booking-auth-thin *,
.tfr-booking-inner.lush-template [class*="brk-booking-summary"],
.tfr-booking-inner.lush-template [class*="brk-booking-summary"] dt,
.tfr-booking-inner.lush-template [class*="brk-booking-summary"] dd {
  color: var(--tfr-fg) !important;
  opacity: 1 !important;
}

/* Account CTA — light Lush surface, force midnight text inside. */
.tfr-booking-inner.lush-template .brk-booking-account-cta,
.tfr-booking-inner.lush-template .brk-booking-account-cta *,
.tfr-booking-inner.lush-template .brk-booking-account-cta-body,
.tfr-booking-inner.lush-template .brk-booking-account-cta-eyebrow,
.tfr-booking-inner.lush-template .brk-booking-account-cta-title,
.tfr-booking-inner.lush-template .brk-booking-account-cta-sub,
.tfr-booking-inner.lush-template .brk-booking-account-cta-arrow {
  color: #0F0A1A !important;
  opacity: 1 !important;
}
.tfr-booking-inner.lush-template .brk-booking-account-cta:hover,
.tfr-booking-inner.lush-template .brk-booking-account-cta:hover * {
  color: var(--tfr-fg) !important;
}

/* Post-booking "All set / Go to dashboard" CTA. The card sits on a light
   Lush surface that bleeds through the TFR re-skin (no card-bg override),
   so the eyebrow/title/sub text stays readable on its own. The CTA anchor,
   though, is a dark-fill button with white text — and TFR's
   .tfr-template a { color: inherit } wins the cascade against the Lush
   .brk-booking-account-followup-cta { color:#FFF }, so the anchor
   inherits the card's dark color and renders invisibly. Force the dark
   button + white text back. */
.tfr-booking-inner.lush-template .brk-booking-account-followup-cta {
  background: #121212 !important;
  color: #FFFFFF !important;
  border-color: #121212 !important;
}
.tfr-booking-inner.lush-template .brk-booking-account-followup-cta:hover {
  background: #2a2a2a !important;
  color: #FFFFFF !important;
}

/* Step pills — active = filled neon w/ glow, done = outlined, upcoming = muted. */
.tfr-booking-inner.lush-template .brk-booking-step.is-active .brk-booking-step-num {
  background: var(--tfr-accent) !important;
  color: var(--tfr-bg) !important;
  border: 1px solid var(--tfr-accent) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-booking-inner.lush-template .brk-booking-step.is-done .brk-booking-step-num {
  background: transparent !important;
  color: var(--tfr-accent) !important;
  border: 1px solid var(--tfr-accent) !important;
}
.tfr-booking-inner.lush-template .brk-booking-step:not(.is-active):not(.is-done) .brk-booking-step-num {
  background: transparent !important;
  color: var(--tfr-fg-muted) !important;
  border: 1px solid var(--tfr-rule) !important;
}
.tfr-booking-inner.lush-template .brk-booking-step + .brk-booking-step::before {
  background: var(--tfr-rule) !important;
}
.tfr-booking-inner.lush-template .brk-booking-step.is-done + .brk-booking-step::before {
  background: var(--tfr-accent) !important;
}

/* Calendar — bone on midnight with neon active state. */
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button,
.tfr-booking-inner.lush-template [class*="brk-booking-day"] {
  color: var(--tfr-fg) !important;
  opacity: 1 !important;
}
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[disabled],
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-disabled="true"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][disabled],
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="disabled"],
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="unavailable"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][class*="disabled"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][class*="unavailable"] {
  color: rgba(240, 239, 245, 0.30) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[aria-selected="true"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][aria-selected="true"],
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="selected"],
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="active"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][class*="selected"],
.tfr-booking-inner.lush-template [class*="brk-booking-day"][class*="active"] {
  background: var(--tfr-accent) !important;
  color: var(--tfr-bg) !important;
  border-color: var(--tfr-accent) !important;
  font-weight: 700 !important;
}
.tfr-booking-inner.lush-template [class*="brk-booking-cal"] button[class*="today"] {
  border: 1px solid var(--tfr-accent) !important;
}

/* Lush-variable re-skin — paint embedded booking in TFR neon tokens.
   Phase 3 contract: radius is template-driven (set per-component below);
   sizes/padding/typography remain engine-owned. */
.tfr-booking-inner.lush-template {
  --lush-bg:          transparent;
  --lush-card:        rgba(240, 239, 245, 0.04);
  --lush-text:        var(--tfr-fg);
  --lush-muted:       var(--tfr-fg-muted);
  --lush-pink:        var(--tfr-accent);
  --lush-pink-rgb:    255, 61, 190;
  --lush-on-pink:     var(--tfr-bg);
  --lush-pink-soft:   color-mix(in srgb, var(--tfr-accent) 18%, transparent);
  --lush-dark-border: var(--tfr-rule);
  --lush-serif:       var(--tfr-display);
  --lush-sans:        var(--tfr-body);
  --lush-ui:          var(--tfr-body);
  /* Radius — TFR runs softer than Lush's 6px default. CTA pills (999px)
     match the engine default; only override card + input. */
  --brk-booking-radius-card:  8px;
  --brk-booking-radius-input: 8px;
  color: var(--lush-text);
  background: transparent;
}

/* Cards, slots, addons — dark surface, soft 8px corners, hairline border.
   Targeting specific classes (not substring) so we don't accidentally
   restyle every descendant with "brk-booking-X" in its class. */
.tfr-booking-inner.lush-template .brk-booking-card,
.tfr-booking-inner.lush-template .brk-booking-slot,
.tfr-booking-inner.lush-template .brk-booking-addon,
.tfr-booking-inner.lush-template [class*="brk-booking-summary"],
.tfr-booking-inner.lush-template [class*="brk-booking-staff"],
.tfr-booking-inner.lush-template [class*="brk-booking-cat"] {
  background: var(--tfr-card) !important;
  border-color: var(--tfr-rule) !important;
  box-shadow: none !important;
  color: var(--tfr-fg) !important;
}
/* Service CARDS keep the dark card surface — the feedback was the
   *container* around them had an unwanted box, not the cards. Service
   cards stay as cards; container collapses to bare grid. */
.tfr-booking-inner.lush-template .brk-booking-service-card {
  background: var(--tfr-card) !important;
  border: 1px solid var(--tfr-rule) !important;
  box-shadow: none !important;
  color: var(--tfr-fg) !important;
}
/* The wrapping .brk-booking-services grid is pure layout — no border,
   no background. Padding/gap are engine-owned (Phase 3 contract). */
.tfr-booking-inner.lush-template .brk-booking-services {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
/* Inner name+price row (.brk-booking-service-top) was inheriting the
   border from the old substring-match rule. Strip it. */
.tfr-booking-inner.lush-template .brk-booking-service-top {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Form fields — dark surface, accent focus glow. Radius is driven by
   --brk-booking-radius-input from the variable block above. */
.tfr-booking-inner.lush-template input,
.tfr-booking-inner.lush-template textarea,
.tfr-booking-inner.lush-template select {
  background: rgba(240, 239, 245, 0.04) !important;
  border: 1px solid var(--tfr-rule) !important;
  color: var(--tfr-fg) !important;
}
.tfr-booking-inner.lush-template input:focus,
.tfr-booking-inner.lush-template textarea:focus,
.tfr-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--tfr-accent) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tfr-accent) 22%, transparent) !important;
}
.tfr-booking-inner.lush-template input::placeholder,
.tfr-booking-inner.lush-template textarea::placeholder {
  color: var(--tfr-fg-muted) !important;
}

/* Section headings inside booking — display font. */
.tfr-booking-inner.lush-template h2,
.tfr-booking-inner.lush-template h3 {
  font-family: var(--tfr-display) !important;
  font-weight: 700 !important;
  color: var(--tfr-fg) !important;
  letter-spacing: -0.015em !important;
}

/* Eyebrow labels — tracked uppercase accent with subtle glow. Engine owns
   font-size + letter-spacing (typography sizing); template owns font-
   family + color + decoration. */
.tfr-booking-inner.lush-template .brk-booking-block-label,
.tfr-booking-inner.lush-template .brk-booking-eyebrow,
.tfr-booking-inner.lush-template .brk-booking-step-num {
  font-family: var(--tfr-body) !important;
  text-transform: uppercase !important;
  color: var(--tfr-accent) !important;
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
}

/* Primary CTA — neon fill, glow on hover. Engine owns SIZE (padding,
   font-size, letter-spacing) and SHAPE (radius via --brk-booking-radius-
   cta). Template owns APPEARANCE (color, font-family, glow). */
.tfr-booking-inner.lush-template .brk-booking-cta,
.tfr-booking-inner.lush-template button[class*="brk-booking-next"],
.tfr-booking-inner.lush-template button[class*="brk-booking-submit"] {
  background: var(--tfr-accent) !important;
  color: var(--tfr-bg) !important;
  border: 1px solid var(--tfr-accent) !important;
  font-family: var(--tfr-body) !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  transition: box-shadow 220ms ease !important;
}
.tfr-booking-inner.lush-template .brk-booking-cta:hover,
.tfr-booking-inner.lush-template button[class*="brk-booking-next"]:hover {
  box-shadow: 0 0 24px color-mix(in srgb, var(--tfr-accent) 55%, transparent) !important;
}

/* Secondary / back — outlined pill, same size contract. */
.tfr-booking-inner.lush-template button[class*="brk-booking-back"],
.tfr-booking-inner.lush-template button[class*="brk-booking-secondary"] {
  background: transparent !important;
  color: var(--tfr-accent) !important;
  border: 1px solid var(--tfr-accent) !important;
  font-family: var(--tfr-body) !important;
  text-transform: uppercase !important;
}

/* Active/selected service or slot — soft accent fill + glow ring. */
.tfr-booking-inner.lush-template [class*="brk-booking-slot"][class*="active"],
.tfr-booking-inner.lush-template [class*="brk-booking-slot"][class*="selected"],
.tfr-booking-inner.lush-template [class*="brk-booking-service"][class*="active"],
.tfr-booking-inner.lush-template [class*="brk-booking-service"][class*="selected"] {
  border-color: var(--tfr-accent) !important;
  background: color-mix(in srgb, var(--tfr-accent) 10%, var(--tfr-card)) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tfr-accent) 22%, transparent) !important;
}
`
