'use client'

/**
 * VtCustomerAuth — MVP shim.
 *
 * Re-exports Lush Studio's customer auth hook. See the note in
 * VelvetTheoryBooking.tsx — when we restyle the booking flow proper,
 * we'll fork this too.
 */

export { useLushCustomerAuth as useVtCustomerAuth } from '../lushstudio/LushCustomerAuth'
