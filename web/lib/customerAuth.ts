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

/**
 * Validate a `return_to` query param. Used by /account/login and
 * /account/register so a customer who clicked "Sign in" from a tenant
 * site (e.g. https://lushstudio.bkrdy.me) bounces back there after
 * authentication instead of landing on /account.
 *
 * Security:
 *   - Only absolute URLs accepted (relative paths could be ambiguous
 *     after the auth subdomain hop).
 *   - https: only in production. http://localhost is permitted as a
 *     dev convenience.
 *   - Hostname must be `bkrdy.me` or `*.bkrdy.me`. Anything else
 *     returns null — prevents open-redirect attacks where an attacker
 *     phishes "https://app.bkrdy.me/account/login?return_to=https://
 *     evil.com" hoping the post-auth redirect lands the user on a
 *     lookalike page.
 *   - URLs with embedded credentials (user:pass@) are rejected.
 *
 * Returns the normalized URL string (URL.toString() form) or null.
 */
export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { return null }
  if (url.username || url.password) return null
  // Dev allowance — http://localhost only.
  if (url.protocol === 'http:' && url.hostname === 'localhost') return url.toString()
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  if (host !== 'bkrdy.me' && !host.endsWith('.bkrdy.me')) return null
  return url.toString()
}
