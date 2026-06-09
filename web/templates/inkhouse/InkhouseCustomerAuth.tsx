'use client'

/**
 * InkhouseCustomerAuth, re-export of the shared customer auth hook.
 * When this template grows its own auth UX, fork these re-exports into
 * real components.
 */
export {
  useCustomerAuth      as useInkhouseCustomerAuth,
  useOpenCustomerAuth  as useOpenInkhouseAuth,
} from '@bkrdy/platform/booking'
