// Phase S6 — auth state for the cookie-based session.
//
// Previously this module persisted the raw Sanctum token in localStorage,
// which meant any successful XSS could exfiltrate it and impersonate the
// owner indefinitely. The new flow keeps the actual token in an httpOnly
// cookie that the browser sends automatically and that JS cannot read.
//
// What this module now stores in localStorage is:
//   - br_authed   → '1' when the user is logged in (used by route
//                   guards to skip a /auth/me round-trip on first paint)
//   - br_tenant   → tenant slug, used as a fallback before /auth/me
//   - br_token    → LEGACY. Pre-S6 sessions wrote the raw token here.
//                   We never WRITE this key anymore. We still READ it as
//                   a one-time bridge so existing sessions don't get
//                   logged out on the deploy. clearAuth() wipes it.

const LEGACY_TOKEN_KEY = 'br_token'
const TENANT_KEY       = 'br_tenant'
const LOGGED_IN_KEY    = 'br_authed'

/**
 * LEGACY accessor — returns a token only for pre-S6 sessions that haven't
 * been cleared yet. New sessions return null because the token lives in
 * an httpOnly cookie.
 *
 * api.ts still sends an Authorization header when this returns non-null,
 * so a user with a pre-existing localStorage token keeps working until
 * they log out (at which point clearAuth() wipes the legacy key).
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LEGACY_TOKEN_KEY)
}

/**
 * Phase S6 — kept as a back-compat stub so existing login/register/Google
 * callers don't need to change shape. We deliberately do NOT write the
 * token to localStorage anymore; instead we just mark the session as
 * "logged in" so the UI guards know there's an active cookie session.
 */
export function setToken(_token: string): void {
  setLoggedIn()
}

export function setLoggedIn(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOGGED_IN_KEY, '1')
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  // Either flag is fine. Legacy sessions don't have br_authed set, so
  // a remaining br_token also counts as "logged in" for the guard.
  return localStorage.getItem(LOGGED_IN_KEY) === '1'
      || localStorage.getItem(LEGACY_TOKEN_KEY) !== null
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TENANT_KEY)
}

export function setTenantId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TENANT_KEY, id)
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(TENANT_KEY)
  localStorage.removeItem(LOGGED_IN_KEY)
}
