/**
 * @bkrdy/platform/booking — barrel for the shared booking module.
 *
 * Templates wrap PlatformBookingFlow (currently named LushStudioBooking
 * pending the M2c.2-4 rename + theming finalization) and inject the
 * platform CSS (currently LUSH_CSS, prefixed brk-booking-*) to render
 * the canonical 5-step booking experience.
 *
 * See ../../AUTHORING.md for the wrap pattern and required behavior.
 */

// Component — the 5-step booking flow.
export { default as PlatformBookingFlow } from './LushStudioBooking'

// Customer auth — Provider + hook + Modal. Templates wrap PlatformBookingFlow
// in CustomerAuthProvider so the customer-account widget and the booking
// form's "View your bookings" CTA can read shared auth state.
export {
  LushCustomerAuthProvider as CustomerAuthProvider,
  useLushCustomerAuth      as useCustomerAuth,
  useOpenLushAuth          as useOpenCustomerAuth,
} from './LushCustomerAuth'

// Account widget — the floating "Sign in / Hi Jane" pill that lives in
// the template header.
export { default as CustomerAccountWidget } from './LushCustomerAccountWidget'

// CSS — inject in a <style>{PLATFORM_BOOKING_CSS}</style> at the root of
// your booking wrapper. Currently named LUSH_CSS for backward compat
// with VT's existing shim; renamed in M2c.3 once CSS variable theming
// hooks are introduced.
export { LUSH_CSS as PLATFORM_BOOKING_CSS } from './lushBookingCss'
