'use client'

/**
 * BottegaCustomerAuth — re-export of the shared customer auth hook.
 * When this template grows its own auth UX, fork these re-exports into
 * real components.
 */
export {
  useCustomerAuth      as useBottegaCustomerAuth,
  useOpenCustomerAuth  as useOpenBottegaAuth,
} from '@bkrdy/platform/booking'
