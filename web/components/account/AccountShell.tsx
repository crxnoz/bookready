'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { customerLogout, customerMe, type CustomerProfile } from '@/lib/customerApi'
import { clearCustomerAuth, setCustomerLoggedIn } from '@/lib/customerAuth'

/**
 * Phase 4 — shell wrapper for every authed /account/* page.
 *
 * Three responsibilities:
 *   1. Auth gate: call /customer/auth/me. If it returns 200, render
 *      the authed shell and refresh the localStorage hint. If it 401s,
 *      clear the hint and redirect to /account/login. The /me round-
 *      trip is the AUTHORITATIVE check — the localStorage flag is
 *      just a same-origin nicety, and it would falsely deny a
 *      customer who signed in via the in-page modal on a tenant
 *      subdomain (localStorage is per-origin, so app.bkrdy.me has no
 *      hint about that session even though the api.bkrdy.me cookie
 *      is valid for both origins).
 *   2. Top navigation: Bookings + Profile + Sign out, plus the persistent
 *      BookReady logo.
 *   3. "Please verify your email" banner when /auth/me returns a customer
 *      with email_verified_at == null. The banner lives here so it shows
 *      on every page until the customer verifies.
 *
 * Pages render inside the centered <main> column and don't need to
 * worry about layout chrome.
 */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname() ?? ''
  const [profile, setProfile]   = useState<CustomerProfile | null>(null)
  const [loadingMe, setLoading] = useState(true)
  const [meError, setMeError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    customerMe()
      .then(p => {
        if (cancelled) return
        setProfile(p)
        setCustomerLoggedIn() // refresh the hint whenever /me confirms it
      })
      .catch(() => {
        if (cancelled) return
        // Either 401 (no cookie / expired) or network error — bounce to login.
        clearCustomerAuth()
        router.replace('/account/login')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [router])

  async function handleSignOut() {
    setMeError(null)
    try {
      await customerLogout()
    } catch {
      // Even if the call fails (network blip), clear local state and bounce.
    }
    clearCustomerAuth()
    router.replace('/account/login')
  }

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-xs text-muted-text">Loading your account…</p>
      </div>
    )
  }

  // "Bookings" stays active when the user is anywhere under /account
  // (dashboard + /account/bookings/[tenant]/[id] detail). /account/profile
  // is the only other top-level surface.
  const isBookings = pathname === '/account' || pathname.startsWith('/account/bookings')
  const isProfile  = pathname.startsWith('/account/profile')

  // Page-level shell.
  return (
    <div className="min-h-screen bg-cream text-near-black">
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-cream">
        <div className="max-w-[1024px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Logo + wordmark. Wordmark hides on phones to give the
              nav row room — the dark logo tile alone is recognizable. */}
          <Link href="/account" className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-75 transition-opacity">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center">
              <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
            </div>
            <span className="hidden sm:inline text-[11px] font-bold tracking-[0.20em] uppercase text-near-black">
              BookReady
            </span>
          </Link>

          {/* Borderless nav — three controls inline. Active tab uses the
              same bg-near-black + white treatment as the auth modal tabs.
              Idle tabs are muted text. Sign out sits at the end. */}
          <nav className="flex items-stretch text-[10px] sm:text-[11px] font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase">
            <NavLink href="/account"         active={isBookings}>BOOKINGS</NavLink>
            <NavLink href="/account/profile" active={isProfile}>PROFILE</NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 sm:px-4 text-muted-text hover:text-near-black transition-colors"
            >
              SIGN OUT
            </button>
          </nav>
        </div>

        {/* Email verification banner — compact strip with consistent
            inline action. */}
        {profile && !profile.email_verified_at && (
          <div className="bg-blush border-t border-[rgba(18,18,18,0.10)]">
            <div className="max-w-[1024px] mx-auto px-4 sm:px-8 py-2 text-[11px] sm:text-xs text-near-black flex items-center justify-between gap-3">
              <span className="leading-tight">
                <span className="hidden sm:inline">Verify your email to make sure you receive booking updates.</span>
                <span className="sm:hidden">Verify your email for booking updates.</span>
              </span>
              <ResendLink />
            </div>
          </div>
        )}

        {meError && (
          <div className="bg-red-50 border-t border-red-200 px-4 sm:px-8 py-2 text-xs text-red-700 text-center">
            {meError}
          </div>
        )}
      </header>

      <main className="max-w-[1024px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center px-3 sm:px-4 transition-colors ' +
        (active ? 'text-near-black' : 'text-muted-text hover:text-near-black')
      }
    >
      {children}
    </Link>
  )
}

function ResendLink() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleResend(e: React.MouseEvent) {
    e.preventDefault()
    if (state === 'sending' || state === 'sent') return
    setState('sending')
    try {
      const { customerResendVerification } = await import('@/lib/customerApi')
      await customerResendVerification()
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={handleResend}
      disabled={state === 'sending' || state === 'sent'}
      className="text-[11px] font-bold tracking-[0.10em] uppercase underline underline-offset-2 hover:opacity-75 disabled:opacity-60"
    >
      {state === 'sent'    && 'Sent — check your inbox'}
      {state === 'sending' && 'Sending…'}
      {state === 'error'   && 'Retry'}
      {state === 'idle'    && 'Resend link'}
    </button>
  )
}
