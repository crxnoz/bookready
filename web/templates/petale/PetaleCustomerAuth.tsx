'use client'

/**
 * PetaleCustomerAuth — re-export of the shared customer auth hook.
 * When this template grows its own auth UX, fork these re-exports into
 * real components.
 */
export {
  useCustomerAuth      as usePetaleCustomerAuth,
  useOpenCustomerAuth  as useOpenPetaleAuth,
} from '@bkrdy/platform/booking'
