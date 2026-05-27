// Phase 4 of the customer-accounts feature — minimal browser-side
// auth state for the /account/* surface.
//
// Mirror of web/lib/auth.ts but for customers. Same caveats:
//   - The actual auth credential is the httpOnly bookready_customer_token
//     cookie set by api.bkrdy.me — this file just tracks a localStorage
//     flag so the React tree knows whether to render the authed shell or
//     bounce to /account/login on first paint.
//   - The localStorage flag can drift from the cookie (cookie expires
//     after 14 days, flag persists indefinitely until cleared). Pages
//     gated on isCustomerLoggedIn() should still tolerate a 401 from
//     the next /auth/me round-trip and redirect to login at that point.
//   - Deliberately distinct from the owner br_authed flag so an owner
//     who's also a customer in the same browser doesn't have one auth
//     state stomp on the other.

const LOGGED_IN_KEY = 'br_customer_authed'

export function setCustomerLoggedIn(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOGGED_IN_KEY, '1')
}

export function isCustomerLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LOGGED_IN_KEY) === '1'
}

export function clearCustomerAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOGGED_IN_KEY)
}
