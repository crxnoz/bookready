'use client'

import { useEffect, useState } from 'react'
import { UserCircle, BookmarkCheck, LogOut } from 'lucide-react'
import { customerMe, customerLogout, type CustomerProfile } from '@/lib/customerApi'

/**
 * Customer-account widget for tenant booking sites.
 *
 * Lives in the FadeRoom header. Three states:
 *   - loading: render nothing (avoids "Sign in" flash before authed state lands)
 *   - unauthed: small "Sign in" link → app.bkrdy.me/account/login?return_to=<here>
 *   - authed:   "Hi {firstName} · sign-out" chip pointing at app.bkrdy.me/account
 *
 * Why client-side fetch (and why this works across subdomains):
 *
 *   The customer cookie (bookready_customer_token) is host-only on
 *   api.bkrdy.me — see api/app/Support/CustomerAuthCookie.php which
 *   explicitly refuses dot-prefixed domains so the cookie cannot leak
 *   to tenant subdomains as a session cookie. That's the defensive
 *   posture we want.
 *
 *   BUT — any fetch from {slug}.bkrdy.me to api.bkrdy.me with
 *   credentials: 'include' still sends api.bkrdy.me's own cookies,
 *   and CORS (api/config/cors.php) allow-lists *.bkrdy.me with
 *   supports_credentials: true. So calling /customer/auth/me on
 *   mount tells us whether the visitor is signed into a central
 *   customer account, without giving the tenant origin direct
 *   access to the cookie.
 *
 * Why the URLs are absolute:
 *   This widget renders at {slug}.bkrdy.me, not app.bkrdy.me. Linking
 *   to "/account/login" would 404 on the tenant origin.
 */
export default function TfrCustomerAccountWidget() {
  const [state, setState] = useState<'loading' | 'authed' | 'unauthed'>('loading')
  const [user,  setUser]  = useState<CustomerProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    customerMe()
      .then(u => {
        if (cancelled) return
        setUser(u)
        setState('authed')
      })
      .catch(() => {
        if (cancelled) return
        setState('unauthed')
      })
    return () => { cancelled = true }
  }, [])

  if (state === 'loading') return null

  if (state === 'unauthed') {
    // window is always defined here — we render after mount via useEffect-derived state.
    const here = typeof window !== 'undefined' ? window.location.href : ''
    const loginUrl = `https://app.bkrdy.me/account/login?return_to=${encodeURIComponent(here)}`
    return (
      <a className="tfr-account-widget" href={loginUrl}>
        <UserCircle size={14} />
        <span>Sign in</span>
      </a>
    )
  }

  // authed
  const firstName = (user?.name ?? '').split(' ').filter(Boolean)[0] ?? 'you'

  async function handleSignOut() {
    try { await customerLogout() } catch { /* fail open — still flip UI */ }
    setUser(null)
    setState('unauthed')
  }

  return (
    <div className="tfr-account-widget tfr-account-widget--authed">
      <a
        className="tfr-account-widget-link"
        href="https://app.bkrdy.me/account"
        title="View your bookings"
      >
        <BookmarkCheck size={14} />
        <span>Hi {firstName}</span>
      </a>
      <button
        type="button"
        className="tfr-account-widget-signout"
        onClick={handleSignOut}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={12} />
      </button>
    </div>
  )
}
