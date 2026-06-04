'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { register } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/auth/TurnstileWidget'

const TEMPLATE_KEY = 'br_template'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateSlug = searchParams.get('template') ?? 'thefaderoom'

  const [form, setForm] = useState({
    owner_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    business_name: '',
  })
  // Pre-launch (#117): explicit ToS acceptance. Tracked separately
  // from the text fields so it can be a boolean. Submit is disabled
  // until checked. Google flow uses its own checkbox on the
  // /register/complete page after OAuth returns.
  const [termsAccepted, setTermsAccepted] = useState(false)
  // #161: Cloudflare Turnstile token. Set by the widget callback once
  // the visitor solves (or auto-passes) the challenge. Submit blocked
  // until present. Reset after a failed submit so the next attempt
  // mints a fresh token (Cloudflare tokens are single-use).
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const onTurnstileVerify = useCallback((t: string) => setTurnstileToken(t), [])
  const onTurnstileExpire = useCallback(() => setTurnstileToken(''), [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Surface any error bounced back from the Google OAuth bridge.
  useEffect(() => {
    const gerr = searchParams?.get('google_error')
    if (gerr) setError(gerr)
  }, [searchParams])

  // Google signup is always allowed. If the user typed a business name we
  // bake it (and the optional owner_name) into the OAuth state so the
  // callback can provision a tenant immediately. If they didn't, we send
  // an empty payload and the backend bounces to /register/complete where
  // they pick a business name after returning from Google.
  const googleSignupHref = (() => {
    const bn = form.business_name.trim()
    const payload = btoa(JSON.stringify({
      business_name: bn || undefined,
      template:      templateSlug === 'thefaderoom' ? 'the-fade-room' : templateSlug,
      owner_name:    form.owner_name.trim() || undefined,
    }))
    return `${API_BASE}/auth/google/redirect?intent=signup&payload=${encodeURIComponent(payload)}`
  })()

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const slugPreview = form.business_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    if (! termsAccepted) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    if (! turnstileToken) {
      setError('Please complete the verification check below.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await register({
        owner_name: form.owner_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        business_name: form.business_name,
        // Seed the tenant with the template the user arrived with. The
        // checkout step can still change it (and re-applies via
        // selectActiveTemplate), but this makes the default correct when the
        // user came in from a template gallery link (?template=…).
        template: templateSlug,
        terms_accepted: termsAccepted,
        turnstile_token: turnstileToken,
      })
      setToken()
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      localStorage.setItem(TEMPLATE_KEY, templateSlug)
      // #155 / #156 — persist the signup intent (template + plan +
      // billing + sms_mult) from the marketing URL into localStorage
      // so /checkout/trial can read it without re-asking the user.
      // Falls back to sensible defaults when params are missing.
      const intent = {
        template: templateSlug,
        plan:     (searchParams.get('plan')     as 'solo' | 'studio' | 'salon' | null) ?? 'studio',
        billing:  (searchParams.get('billing')  as 'monthly' | 'annual' | null) ?? 'monthly',
        sms_mult: ((): 1 | 2 | 3 => {
          const raw = searchParams.get('sms')
          if (raw === '2x') return 2
          if (raw === '3x') return 3
          const num = parseInt(searchParams.get('sms_mult') ?? '1', 10)
          return (num === 2 || num === 3 ? num : 1) as 1 | 2 | 3
        })(),
      }
      try { localStorage.setItem('br_signup_intent', JSON.stringify(intent)) } catch { /* localStorage disabled */ }
      // Send the owner to the new trial card-capture screen instead of
      // the OLD /checkout (which double-picked template + cycle).
      router.push('/checkout/trial')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
      // #161: Cloudflare tokens are single-use — a failed POST consumed
      // ours. Wipe + re-render so the next attempt mints a fresh one.
      setTurnstileToken('')
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Mode switch */}
      <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.12)] mb-7 overflow-hidden">
        <Link
          href="/login"
          className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase text-muted-text hover:text-near-black transition-colors"
        >
          Log in
        </Link>
        <span className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black text-white">
          Sign up
        </span>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>Create account</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Start your booking website.
        </h1>
        <p className="text-sm text-muted-text">
          Create your BookReady account and launch your client-ready booking site.
        </p>
      </div>

      {/* #156 — confirmation line of what they're signing up for, when
          marketing-site CTAs forwarded plan/billing/template/sms. Small
          and unobtrusive — they already chose, this is just reassurance. */}
      <IntentSummary searchParams={searchParams} />

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Owner name">
          <input
            type="text"
            required
            autoComplete="name"
            value={form.owner_name}
            onChange={set('owner_name')}
            className={inputCls}
            placeholder="Ava Mendez"
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            placeholder="you@studio.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </Field>

        <Field label="Confirm password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password_confirmation}
            onChange={set('password_confirmation')}
            className={inputCls}
            placeholder="Repeat your password"
          />
        </Field>

        <Field
          label="Business name"
          hint={
            <span>
              Your site will be at{' '}
              <span className="font-semibold text-near-black">{slugPreview}.bkrdy.me</span>
              <span className="block text-[10px] text-muted-text mt-0.5">
                Letters and numbers only, no dashes.
              </span>
            </span>
          }
        >
          <input
            type="text"
            required
            value={form.business_name}
            onChange={set('business_name')}
            className={inputCls}
            placeholder="Lush Studio"
          />
        </Field>

        {/* Pre-launch (#117): explicit ToS checkbox. Unchecked by
            default; submit stays disabled until ticked. Stronger CYA
            than passive "by signing up you agree" copy under the
            button. Backend (RegisterController) rejects the request
            unless terms_accepted is true and stamps users.terms_accepted_at
            + terms_version on the user row. */}
        <label className="flex gap-2.5 items-start text-[11px] text-muted-text leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-near-black flex-shrink-0 cursor-pointer"
            aria-describedby="terms-text"
          />
          <span id="terms-text">
            I have read and agree to the{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-near-black">
              Terms of Service
            </Link>
            ,{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-near-black">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/refund" className="underline underline-offset-2 hover:text-near-black">
              Refund Policy
            </Link>
            {' '}of DaysGraphic LLC (d/b/a BookReady).
          </span>
        </label>

        {/* #161: Turnstile CAPTCHA. Renders Cloudflare's challenge widget;
            the token populates turnstileToken state, which the submit
            handler includes in the register payload. Submit is gated
            on it so a bot script can't just call the API. */}
        <TurnstileWidget
          ref={turnstileRef}
          onVerify={onTurnstileVerify}
          onExpire={onTurnstileExpire}
        />

        <button type="submit" disabled={loading || !termsAccepted || !turnstileToken} className={submitCls}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">or</span>
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
      </div>

      {/* Google sign-up — always enabled. If the business-name field is
          empty the backend will ask for it after Google returns. */}
      <a
        href={googleSignupHref}
        className="w-full flex items-center justify-center gap-3 border border-[rgba(18,18,18,0.15)] bg-white py-3 text-sm font-medium text-near-black hover:border-near-black transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </a>

      {/* Footer */}
      <p className="text-xs text-muted-text mt-6 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Sign in
        </Link>
      </p>
      {/* This page is for BUSINESS OWNERS signing up to run their salon
          on BookReady. Customers who just want to manage personal bookings
          belong on /account/register instead. */}
      <p className="text-xs text-muted-text mt-2 text-center">
        Not a business owner?{' '}
        <Link href="/account/register" className="text-near-black underline underline-offset-2 hover:opacity-75">
          Create a customer account →
        </Link>
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-muted-text">{hint}</p>}
    </div>
  )
}

/**
 * #156 — Show "Signing up for: {Plan} · {cycle} · {Template}" when the
 * marketing-site CTAs forwarded any of those params. Hidden when there's
 * nothing to confirm (visitor arrived directly with no intent). Designed
 * to look like a quiet system note, not a value prop.
 */
function IntentSummary({ searchParams }: { searchParams: ReturnType<typeof useSearchParams> }) {
  const plan     = searchParams?.get('plan')
  const billing  = searchParams?.get('billing')
  const template = searchParams?.get('template')
  const sms      = searchParams?.get('sms')
  if (! plan && ! billing && ! template) return null

  const parts: string[] = []
  if (plan)     parts.push(plan.charAt(0).toUpperCase() + plan.slice(1))
  if (billing)  parts.push(billing === 'annual' ? 'annual' : 'monthly')
  if (sms && sms !== '1x') parts.push(`${sms} SMS`)
  if (template) parts.push(`${template} template`)

  return (
    <div className="mb-5 px-3 py-2.5 bg-cream border border-[rgba(18,18,18,0.10)] text-[11px] text-muted-text flex items-start gap-2">
      <span className="text-near-black font-bold tracking-[0.08em] uppercase text-[9px] mt-0.5">Signing up for</span>
      <span className="text-near-black">{parts.join(' · ')}</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.31a3.68 3.68 0 0 1-1.6 2.41v2h2.58c1.51-1.39 2.39-3.44 2.39-5.87Z" fill="#4285F4" />
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.95l-2.58-2a4.8 4.8 0 0 1-7.17-2.52H.88v2.07A8 8 0 0 0 8 16Z" fill="#34A853" />
      <path d="M3.55 9.53A4.8 4.8 0 0 1 3.3 8c0-.53.1-1.05.25-1.53V4.4H.88A8 8 0 0 0 0 8c0 1.29.31 2.51.88 3.6l2.67-2.07Z" fill="#FBBC04" />
      <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24L13.35 2.2A8 8 0 0 0 .88 4.4l2.67 2.07A4.77 4.77 0 0 1 8 3.2Z" fill="#EA4335" />
    </svg>
  )
}

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
