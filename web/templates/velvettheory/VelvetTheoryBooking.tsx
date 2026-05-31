'use client'

/**
 * VelvetTheoryBooking — MVP shim.
 *
 * The Lush Studio booking flow is ~1700 lines and uses its own scoped CSS
 * (LUSH_CSS, scoped to .lush-template). Velvet Theory's booking deserves a
 * full restyle in the editorial / sharp / champagne-gold aesthetic, but
 * that's a 4-6h follow-up.
 *
 * For now:
 *   1. Inject LUSH_CSS via a <style> tag so all lush-booking-* classes
 *      actually have styling when rendered inside a VT page.
 *   2. Wrap the booking in a div with class="lush-template" so Lush's
 *      scoped rules match.
 *   3. Wrap THAT in a .vt-booking-frame so VT controls the surrounding
 *      typography + transition.
 *   4. Inject LushCustomerAuthProvider so the booking's auth hook works.
 *
 * The booking flow renders in Lush's cream/pink palette inside the VT
 * burgundy page. Visually mismatched but functional + pretty. The full
 * VT-themed booking restyle is on the next-up list.
 *
 * TODO: write a proper VelvetTheoryBooking — copy LushStudioBooking, swap
 * the class names + colors to the .vt-* token system, lose the rounded
 * corners, replace heart iconography with hairline numerals.
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

// The VT side of the seam — title strip above the embedded Lush booking,
// plus an aggressive Lush-variable override that re-skins the embedded
// booking flow in Velvet Theory tokens (champagne gold accent, burgundy
// text on bone background, Fraunces + Inter typography). Same architectural
// approach Lush itself uses to swap accents — we just hijack the variables
// from outside.
const VT_BOOKING_FRAME_CSS = `
.vt-booking-frame {
  max-width: 1080px;
  margin: 0 auto;
  padding: 96px 32px 48px;
}
.vt-booking-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 36px;
}
.vt-booking-eyebrow {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #C9A876;
}
.vt-booking-rule {
  display: block;
  width: 40px;
  height: 1px;
  background: #C9A876;
}
/* The Lush booking flow is scoped to .lush-template — render it on its own
   bone surface so it reads as an intentional inset card inside the burgundy
   page. The Lush variable overrides below re-skin it in VT tokens. */
.vt-booking-inner {
  background: #F5EFE6;
  border: 1px solid rgba(201,168,118,0.32);
  padding: 8px 0 32px;
}

/* ── Lush-variable re-skin: paint the embedded booking in VT tokens ── */
.vt-booking-inner.lush-template {
  --lush-bg:          #F5EFE6;            /* Bone */
  --lush-card:        #FBF7F0;            /* Slightly warmer card surface */
  --lush-text:        #2D0F19;            /* Burgundy text */
  --lush-muted:       rgba(45,15,25,0.62);
  --lush-pink:        #C9A876;            /* Champagne gold accent */
  --lush-pink-rgb:    201, 168, 118;      /* Same accent as RGB triplet */
  --lush-on-pink:     #2D0F19;            /* Burgundy text on gold buttons */
  --lush-pink-soft:   #E0CFB0;            /* Lighter champagne */
  --lush-dark-border: rgba(45,15,25,0.18);
  --lush-serif:       'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --lush-sans:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --lush-ui:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--lush-text);
  background: var(--lush-bg);
}

/* Round corners are TFR/Lush vocabulary — VT is sharp. Flatten everything
   inside the booking card so it reads coherently with the rest of the VT
   page (gallery strips, manifesto, footer — all 0 radius). */
.vt-booking-inner.lush-template *,
.vt-booking-inner.lush-template *::before,
.vt-booking-inner.lush-template *::after {
  border-radius: 0 !important;
}

/* Hard-coded inline-style accent colors that bypass the variables —
   override them with attribute selectors so the deposit/full toggle and
   any other inline-styled accents read as champagne gold instead of sage. */
.vt-booking-inner.lush-template button[style*="#7FAF9A"] {
  border-color: #C9A876 !important;
}
.vt-booking-inner.lush-template [style*="rgba(127,175,154"] {
  background-color: rgba(201,168,118,0.10) !important;
  border-color: rgba(201,168,118,0.32) !important;
}

@media (max-width: 640px) {
  .vt-booking-frame { padding: 60px 20px 32px; }
}
`
