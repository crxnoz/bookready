'use client'

/**
 * VtCustomerAuth — MVP shim.
 *
 * Re-exports Lush Studio's customer auth hook. See the note in
 * VelvetTheoryBooking.tsx — when we restyle the booking flow proper,
 * we'll fork this too.
 */

// M2a — source moved to _shared/booking.
export { useLushCustomerAuth as useVtCustomerAuth } from '../_shared/booking/LushCustomerAuth'
