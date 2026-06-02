'use client'

/**
 * BlacklineCustomerAuth — re-export of the shared customer auth hook.
 * When this template grows its own auth UX, fork these re-exports into
 * real components.
 */
export {
  useCustomerAuth      as useBlacklineCustomerAuth,
  useOpenCustomerAuth  as useOpenBlacklineAuth,
} from '@bkrdy/platform/booking'
