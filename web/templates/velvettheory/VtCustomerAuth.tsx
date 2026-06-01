'use client'

/**
 * VtCustomerAuth — MVP shim.
 *
 * Re-exports Lush Studio's customer auth hook. See the note in
 * VelvetTheoryBooking.tsx — when we restyle the booking flow proper,
 * we'll fork this too.
 */

// Phase 0 step 2: source lives in @bkrdy/platform.
export { useCustomerAuth as useVtCustomerAuth } from '@bkrdy/platform/booking'
