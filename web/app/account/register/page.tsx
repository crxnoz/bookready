'use client'

import { Suspense, useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { customerRegister } from '@/lib/customerApi'
import { setCustomerLoggedIn, safeReturnTo } from '@/lib/customerAuth'
import AuthShell from '@/components/auth/AuthShell'
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/auth/TurnstileWidget'

/**
 * Phase 4 — direct customer signup at /account/register.
 *
 * For customers who came to BookReady before they had a booking to
 * "save" — they sign up here, then book at a tenant site later. The
 * usual onboarding flow is the booking-confirmation claim CTA instead;
 * this is the secondary entry point.
 *
 * Accepts ?return_to= to support the cross-subdomain entry point
 * from a tenant site (see TfrCustomerAccountWidget). After signup we
 * bounce the user back to where they were if it's a safe URL.
 */
export default function CustomerRegisterPage() {
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
  // Used to preserve the param when the user toggles to the Sign-in tab.
  const loginHref = returnTo
    ? `/account/login?return_to=${encodeURIComponent(returnTo)}`
    : '/account/login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phone, setPhone] = useState('')
  // #161: Turnstile CAPTCHA — same pattern as the owner /register page.
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const onTurnstileVerify = useCallback((t: string) => setTurnstileToken(t), [])
  const onTurnstileExpire = useCallback(() => setTurnstileToken(''), [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    if (! turnstileToken) {
      setError('Please complete the verification check below.')
      return
    }
    setLoading(true)
    try {
      await customerRegister({
        name,
        email,
        password,
        password_confirmation: confirm,
        phone: phone || undefined,
        turnstile_token: turnstileToken,
      })
      setCustomerLoggedIn()
      // #160 — send the customer to the verify-email waiting screen
      // (with return_to preserved). They can still book new appts
      // (the booking endpoint isn't email-gated), but cancel/reschedule
      // existing bookings IS gated, so the verify step matters for the
      // /account dashboard experience anyway.
      const next = returnTo ? `/account/verify-email?return_to=${encodeURIComponent(returnTo)}` : '/account/verify-email'
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed.')
      // #161: Reset for next attempt (single-use tokens).
      setTurnstileToken('')
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.12)] mb-7 overflow-hidden">
        <Link
          href={loginHref}
          className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase text-muted-text hover:text-near-black transition-colors"
        >
          Sign in
        </Link>
        <span className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black text-white">
          Sign up
        </span>
      </div>

      <div className="mb-6">
        <p className={eyebrow}>Create account</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          One login. Every booking.
        </h1>
        <p className="text-sm text-muted-text">
          Sign up once to see your bookings from every BookReady business in one place.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input
            required
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="Your name"
          />
        </Field>

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

        <Field label="Phone (optional)">
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className={inputCls}
            placeholder="(555) 555-5555"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </Field>

        <Field label="Confirm password">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={inputCls}
            placeholder="Re-enter password"
          />
        </Field>

        {/* #161: Turnstile CAPTCHA. */}
        <TurnstileWidget
          ref={turnstileRef}
          onVerify={onTurnstileVerify}
          onExpire={onTurnstileExpire}
        />

        <button type="submit" disabled={loading || !turnstileToken} className={submitCls}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-xs text-muted-text mt-6 text-center">
        Already have an account?{' '}
        <Link href={loginHref} className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Sign in
        </Link>
      </p>
      {/* This page is for END CUSTOMERS. Business owners belong on /register. */}
      <p className="text-xs text-muted-text mt-2 text-center">
        Want to put <em>your</em> business on BookReady?{' '}
        <Link href="/register" className="text-near-black underline underline-offset-2 hover:opacity-75">
          Create a business account →
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
