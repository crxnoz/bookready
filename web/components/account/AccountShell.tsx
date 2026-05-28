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

  // Page-level shell.
  return (
    <div className="min-h-screen bg-cream text-near-black">
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-cream">
        <div className="max-w-[1024px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/account" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
            </div>
            <span className="text-sm font-bold tracking-tight group-hover:opacity-75 transition-opacity">
              BookReady
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-[11px] font-bold tracking-[0.10em] uppercase">
            <NavLink href="/account"         active={pathname === '/account'}>Bookings</NavLink>
            <NavLink href="/account/profile" active={pathname.startsWith('/account/profile')}>Profile</NavLink>
            <button
              onClick={handleSignOut}
              className="px-2.5 sm:px-3 py-2 text-muted-text hover:text-near-black transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>

        {/* Email verification banner */}
        {profile && !profile.email_verified_at && (
          <div className="bg-blush border-t border-[rgba(18,18,18,0.10)]">
            <div className="max-w-[1024px] mx-auto px-6 sm:px-8 py-2.5 text-xs text-near-black flex items-center justify-between gap-4">
              <span>
                Verify your email to make sure you receive booking updates.
              </span>
              <ResendLink />
            </div>
          </div>
        )}

        {meError && (
          <div className="bg-red-50 border-t border-red-200 px-6 sm:px-8 py-2 text-xs text-red-700 text-center">
            {meError}
          </div>
        )}
      </header>

      <main className="max-w-[1024px] mx-auto px-6 sm:px-8 py-8">
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
        'px-2.5 sm:px-3 py-2 transition-colors ' +
        (active ? 'text-near-black underline underline-offset-4' : 'text-muted-text hover:text-near-black')
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
