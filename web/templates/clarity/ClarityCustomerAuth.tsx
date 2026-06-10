'use client'

/**
 * ClarityCustomerAuth, re-export of the shared customer auth hooks.
 * When Clarity grows its own auth UX, fork these re-exports into real
 * components.
 */
export {
  useCustomerAuth     as useClarityCustomerAuth,
  useOpenCustomerAuth as useOpenClarityAuth,
} from '@bkrdy/platform/booking'
