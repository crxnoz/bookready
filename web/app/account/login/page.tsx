'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { customerLogin } from '@/lib/customerApi'
import { setCustomerLoggedIn, safeReturnTo } from '@/lib/customerAuth'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Phase 4 — customer login page at /account/login.
 *
 * Mirror of /login (owner side) but consumes /api/v1/customer/auth/login
 * and lands on /account on success. Reuses AuthShell so visual identity
 * matches the owner-side auth pages — customers might be both, and the
 * split is signaled by the URL prefix, not by a different color scheme.
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = safeReturnTo(searchParams?.get('return_to'))
  // Preserve return_to so toggling Sign up / Sign in tabs doesn't lose it.
  const registerHref = returnTo
    ? `/account/register?return_to=${encodeURIComponent(returnTo)}`
    : '/account/register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // #158 — Remember me, customer side. Same semantics as owner login.
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await customerLogin({ email, password, remember })
      setCustomerLoggedIn()
      if (returnTo) {
        // Cross-origin redirect — router.push won't work, hard-nav.
        window.location.href = returnTo
        return
      }
      router.push('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.12)] mb-7 overflow-hidden">
        <span className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black text-white">
          Sign in
        </span>
        <Link
          href={registerHref}
          className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase text-muted-text hover:text-near-black transition-colors"
        >
          Sign up
        </Link>
      </div>

      <div className="mb-6">
        <p className={eyebrow}>Your bookings</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-text">
          Sign in to see and manage your bookings across every BookReady business you&rsquo;ve booked with.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email address">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </Field>

        {/* #158 — Remember me + forgot. Mirrors the owner /login layout. */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-text cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-[#121212]"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link href="/account/forgot-password" className="text-muted-text hover:text-near-black transition-colors">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={submitCls}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-xs text-muted-text mt-6 text-center">
        New to BookReady?{' '}
        <Link href={registerHref} className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Create an account
        </Link>
      </p>
      {/* This page is for END CUSTOMERS managing their bookings. Business
          owners who run a salon on BookReady belong on /login. */}
      <p className="text-xs text-muted-text mt-2 text-center">
        Run a business on BookReady?{' '}
        <Link href="/login" className="text-near-black underline underline-offset-2 hover:opacity-75">
          Owner sign-in →
        </Link>
      </p>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted-text">
        <Link href="/terms" className="hover:text-near-black">Terms</Link>
        <Link href="/privacy" className="hover:text-near-black">Privacy</Link>
        <a href="mailto:hello@mybookready.com" className="hover:text-near-black">Help</a>
      </div>
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

const eyebrow  = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
