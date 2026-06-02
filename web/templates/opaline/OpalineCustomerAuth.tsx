'use client'

/**
 * OpalineCustomerAuth — re-export of the shared customer auth hooks.
 * When Opaline grows its own auth UX, fork these re-exports into real
 * components.
 */
export {
  useCustomerAuth     as useOpalineCustomerAuth,
  useOpenCustomerAuth as useOpenOpalineAuth,
} from '@bkrdy/platform/booking'
