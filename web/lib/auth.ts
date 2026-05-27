const LEGACY_TOKEN_KEY = 'br_token'
const TENANT_KEY       = 'br_tenant'
const LOGGED_IN_KEY    = 'br_authed'

export function setToken(_token?: string): void {
  setLoggedIn()
}

export function setLoggedIn(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOGGED_IN_KEY, '1')
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LOGGED_IN_KEY) === '1'
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
