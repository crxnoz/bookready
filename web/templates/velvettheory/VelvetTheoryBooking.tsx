'use client'

/**
 * VelvetTheoryBooking — MVP shim.
 *
 * The Lush Studio booking flow is ~1700 lines and uses its own visual
 * vocabulary (pinks, rounded edges, friendly type). Velvet Theory's booking
 * deserves a full restyle in the editorial / sharp / champagne-gold
 * aesthetic, but that's a 4-6h follow-up.
 *
 * For now, render the Lush booking flow inside a Velvet Theory frame so the
 * tab is fully functional from day one. Tenants get the complete booking
 * experience (services, calendar, addons, staff picker, payment, etc.) —
 * just visually consistent with the Lush palette instead of the burgundy
 * Velvet Theory page wrapping it. We add a small "Reserve" eyebrow + a
 * gold rule so the seam isn't jarring.
 *
 * TODO: write a proper VelvetTheoryBooking — copy LushStudioBooking, swap
 * the class names + colors to the .vt-* token system, lose the rounded
 * corners, replace the heart iconography with hairline numerals.
 */

import LushStudioBooking from '../lushstudio/LushStudioBooking'
import { LushCustomerAuthProvider } from '../lushstudio/LushCustomerAuth'
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
  // The Lush booking flow uses useLushCustomerAuth() internally, which
  // throws if not wrapped in LushCustomerAuthProvider. Inject the provider
  // here so VelvetTheoryTemplate doesn't have to know about Lush internals.
  return (
    <LushCustomerAuthProvider>
      <div className="vt-booking-frame">
        <div className="vt-booking-eyebrow">
          <span>Reserve</span>
          <span className="vt-booking-rule" aria-hidden="true" />
        </div>
        <LushStudioBooking {...props} />
      </div>
    </LushCustomerAuthProvider>
  )
}
