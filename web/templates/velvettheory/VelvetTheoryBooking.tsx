'use client'

/**
 * VelvetTheoryBooking — MVP shim.
 *
 * The Lush Studio booking flow is ~1700 lines and uses its own scoped CSS
 * (LUSH_CSS, scoped to .lush-template). Rather than rewrite all that code,
 * we re-skin the embedded flow by:
 *   1. Injecting LUSH_CSS so all lush-booking-* classes resolve
 *   2. Wrapping in .lush-template so the scoped rules match
 *   3. Overriding Lush's CSS variables with VT tokens (champagne gold,
 *      burgundy, Fraunces + Inter)
 *   4. Adding pointed rules below to flatten Lush's rounded/card vocabulary
 *      into VT's flatter, sharper editorial language
 *   5. Wrapping in LushCustomerAuthProvider so the booking's auth hook works
 *
 * The booking now runs EDGE-TO-EDGE on the page (no card frame, no
 * max-width) so it reads as a native VT chapter, not a foreign embed.
 */

import LushStudioBooking from '../lushstudio/LushStudioBooking'
import { LushCustomerAuthProvider } from '../lushstudio/LushCustomerAuth'
import { LUSH_CSS } from '../lushstudio/LushStudioTemplate'
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

export default function VelvetTheoryBooking(props: Props) {
  return (
    <LushCustomerAuthProvider>
      <style>{LUSH_CSS}</style>
      <style>{VT_BOOKING_FRAME_CSS}</style>
      <div className="vt-booking-frame">
        <div className="vt-booking-header">
          <span className="vt-booking-eyebrow">Reserve</span>
          <span className="vt-booking-rule" aria-hidden="true" />
        </div>
        <div className="lush-template vt-booking-inner">
          <LushStudioBooking {...props} />
        </div>
      </div>
    </LushCustomerAuthProvider>
  )
}

// Full-width VT booking surface. The Lush variable overrides force the
// embedded booking to inherit VT colors. Additional rules below pull Lush's
// "white cards on cream" vocabulary into VT's flatter, sharper editorial
// language — hairline gold borders, no shadows, flat surfaces, sharp edges.
const VT_BOOKING_FRAME_CSS = `
/* Full-width — sit directly on the VT page background. The booking's
   internal max-width (.lush-booking-section { max-width: 860px }) keeps
   content readable. */
.vt-booking-frame {
  width: 100%;
  margin: 0;
  padding: 80px 0 32px;
  background: var(--vt-bg);
}
.vt-booking-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 56px;
  padding: 0 24px;
}
.vt-booking-eyebrow {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--vt-accent);
}
.vt-booking-rule {
  display: block;
  width: 36px;
  height: 1px;
  background: var(--vt-accent);
}
/* No card framing — booking lives DIRECTLY on the VT page background. */
.vt-booking-inner {
  background: transparent !important;
  padding: 0;
}

/* ── Lush-variable re-skin: paint embedded booking in VT tokens ── */
.vt-booking-inner.lush-template {
  --lush-bg:          transparent;              /* Inherit page bg */
  --lush-card:        rgba(245,239,230,0.04);   /* Subtle warm tint */
  --lush-text:        var(--vt-fg);             /* Bone text on burgundy */
  --lush-muted:       var(--vt-fg-muted);
  --lush-pink:        #C9A876;                  /* Champagne gold */
  --lush-pink-rgb:    201, 168, 118;
  --lush-on-pink:     var(--vt-bg);             /* Burgundy text on gold */
  --lush-pink-soft:   rgba(201,168,118,0.20);
  --lush-dark-border: var(--vt-rule);
  --lush-serif:       'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --lush-sans:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-ui:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--lush-text);
  background: transparent;
}

/* Flatten round corners — VT is sharp throughout. */
.vt-booking-inner.lush-template *,
.vt-booking-inner.lush-template *::before,
.vt-booking-inner.lush-template *::after {
  border-radius: 0 !important;
}

/* Service cards, slots, addons — strip white-card vocabulary, replace with
   hairline gold borders on transparent backgrounds. Reads as ledger rows
   not floating cards. */
.vt-booking-inner.lush-template [class*="lush-booking-card"],
.vt-booking-inner.lush-template [class*="lush-booking-slot"],
.vt-booking-inner.lush-template [class*="lush-booking-service"],
.vt-booking-inner.lush-template [class*="lush-booking-addon"],
.vt-booking-inner.lush-template [class*="lush-booking-summary"],
.vt-booking-inner.lush-template [class*="lush-booking-staff"],
.vt-booking-inner.lush-template [class*="lush-booking-cat"] {
  background: transparent !important;
  border-color: rgba(201,168,118,0.28) !important;
  box-shadow: none !important;
  color: var(--vt-fg) !important;
}

/* Form fields — flat, hairline-bordered, gold focus ring. */
.vt-booking-inner.lush-template input,
.vt-booking-inner.lush-template textarea,
.vt-booking-inner.lush-template select {
  background: rgba(245,239,230,0.06) !important;
  border: 1px solid rgba(201,168,118,0.32) !important;
  color: var(--vt-fg) !important;
  border-radius: 0 !important;
}
.vt-booking-inner.lush-template input:focus,
.vt-booking-inner.lush-template textarea:focus,
.vt-booking-inner.lush-template select:focus {
  outline: none !important;
  border-color: var(--vt-accent) !important;
}
.vt-booking-inner.lush-template input::placeholder,
.vt-booking-inner.lush-template textarea::placeholder {
  color: var(--vt-fg-muted) !important;
}

/* Section titles inside booking — Fraunces with VT cadence. */
.vt-booking-inner.lush-template h2,
.vt-booking-inner.lush-template h3 {
  font-family: 'Fraunces', Georgia, serif !important;
  font-weight: 400 !important;
  color: var(--vt-fg) !important;
  letter-spacing: -0.01em !important;
}

/* Eyebrow labels (e.g. "Your Appointment", "Step 1 of 5"). */
.vt-booking-inner.lush-template .lush-booking-block-label,
.vt-booking-inner.lush-template .lush-booking-eyebrow,
.vt-booking-inner.lush-template .lush-booking-step-num {
  font-family: 'Inter', sans-serif !important;
  font-size: 10px !important;
  letter-spacing: 0.32em !important;
  text-transform: uppercase !important;
  color: var(--vt-accent) !important;
}

/* Primary CTA: gold fill, burgundy text, sharp, tracked uppercase. */
.vt-booking-inner.lush-template .lush-booking-cta,
.vt-booking-inner.lush-template button[class*="lush-booking-next"],
.vt-booking-inner.lush-template button[class*="lush-booking-submit"] {
  background: var(--vt-accent) !important;
  color: var(--vt-bg) !important;
  border: 1px solid var(--vt-accent) !important;
  border-radius: 0 !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: 0.18em !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  padding: 16px 28px !important;
}
.vt-booking-inner.lush-template .lush-booking-cta:hover,
.vt-booking-inner.lush-template button[class*="lush-booking-next"]:hover {
  opacity: 0.88 !important;
}

/* Secondary/back buttons — hairline-bordered, gold text. */
.vt-booking-inner.lush-template button[class*="lush-booking-back"],
.vt-booking-inner.lush-template button[class*="lush-booking-secondary"] {
  background: transparent !important;
  color: var(--vt-accent) !important;
  border: 1px solid var(--vt-accent) !important;
  border-radius: 0 !important;
  font-family: 'Inter', sans-serif !important;
  letter-spacing: 0.18em !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  padding: 16px 24px !important;
}

/* Active/selected state on slots, services, addons — subtle gold fill. */
.vt-booking-inner.lush-template [class*="lush-booking-slot"][class*="active"],
.vt-booking-inner.lush-template [class*="lush-booking-slot"][class*="selected"],
.vt-booking-inner.lush-template [class*="lush-booking-service"][class*="active"],
.vt-booking-inner.lush-template [class*="lush-booking-service"][class*="selected"] {
  border-color: var(--vt-accent) !important;
  background: rgba(201,168,118,0.10) !important;
}

/* Hard-coded inline sage from the deposit/full payment toggle. */
.vt-booking-inner.lush-template button[style*="#7FAF9A"] {
  border-color: #C9A876 !important;
  background-color: rgba(201,168,118,0.10) !important;
}
.vt-booking-inner.lush-template [style*="rgba(127,175,154"] {
  background-color: rgba(201,168,118,0.10) !important;
  border-color: rgba(201,168,118,0.32) !important;
}

@media (max-width: 640px) {
  .vt-booking-frame { padding: 56px 0 32px; }
  .vt-booking-header { padding: 0 20px; margin-bottom: 40px; }
}
`
