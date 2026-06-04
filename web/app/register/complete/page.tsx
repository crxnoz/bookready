'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeGoogleSignup } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import { SITE_TEMPLATES, normalizeTemplateSlug } from '@/lib/templates'
import AuthShell from '@/components/auth/AuthShell'

const TEMPLATE_KEY = 'br_template'

/**
 * Deferred-name Google signup completion. The OAuth callback handler
 * parked the verified Google identity in the server cache under `handoff`
 * and redirected here. The user picks a business name and we POST
 * back to /auth/google/complete-signup to actually provision the tenant.
 */
export default function CompleteGoogleSignupPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <CompleteInner />
    </Suspense>
  )
}

function CompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handoff = searchParams.get('handoff') ?? ''
  const email   = searchParams.get('email') ?? ''
  const googleName = searchParams.get('name') ?? ''

  const [businessName, setBusinessName] = useState('')
  // Pre-launch (#117): Google deferred-name signup also requires
  // explicit ToS acceptance. The /register page collects it for the
  // email flow; the Google flow returns here without going through
  // that page, so we re-collect on this screen.
  const [termsAccepted, setTermsAccepted] = useState(false)
  // Template the user picks here. Seed from whatever was chosen before
  // OAuth (stored in localStorage on /register), default to The Fade Room.
  const [template, setTemplate] = useState('thefaderoom')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATE_KEY)
    if (stored) setTemplate(normalizeTemplateSlug(stored))
  }, [])

  const slugPreview = useMemo(
    () => businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness',
    [businessName],
  )

  // Missing handoff means someone hit this URL directly (refresh, bookmark)
  // — bounce them back to /register instead of showing a broken form.
  if (! handoff) {
    return (
      <AuthShell>
        <div className="mb-6">
          <p className={eyebrow}>Sign up with Google</p>
          <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
            Session expired.
          </h1>
          <p className="text-sm text-muted-text">
            Start the Google sign-up again from the register page.
          </p>
        </div>
        <Link
          href="/register"
          className="inline-block bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase px-6 py-3 hover:bg-[#2a2a2a] transition-colors"
        >
          Back to sign up
        </Link>
      </AuthShell>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (! termsAccepted) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await completeGoogleSignup({
        handoff,
        business_name: businessName.trim(),
        terms_accepted: termsAccepted,
        template,
      })
      setToken()
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      localStorage.setItem(TEMPLATE_KEY, template)
      // #155 — persist intent + send to trial card-capture screen.
      // Google flow doesn't carry plan/billing in the OAuth payload,
      // so we land on sensible defaults; the user can change at the
      // trial screen if needed (Phase 3 will surface intent more
      // explicitly).
      try {
        localStorage.setItem('br_signup_intent', JSON.stringify({
          template, plan: 'studio', billing: 'monthly', sms_mult: 1,
        }))
      } catch { /* ignore */ }
      // Google completeSignup already marks email_verified_at on the
      // backend (Google did the verification), so we skip /verify-email
      // and jump straight to the trial card-capture screen.
      router.push('/checkout/trial')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not finish signup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>One last step</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          {googleName ? `Hi ${firstName(googleName)} —` : 'Almost there —'}
        </h1>
        <p className="text-sm text-muted-text">
          Name your business so we can spin up your booking site.
          {email && (
            <>
              {' '}You&rsquo;re signing in as{' '}
              <span className="text-near-black font-semibold">{email}</span>.
            </>
          )}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoFocus
            maxLength={100}
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className={inputCls}
            placeholder="Lush Studio"
          />
        </Field>

        {/* Template picker — lets Google signups choose their site look
            here (the email flow picks it on /checkout). The selection is
            sent to complete-signup, which seeds template_settings, and is
            re-applied on /checkout via selectActiveTemplate. */}
        <div>
          <label className={labelCls}>Template</label>
          <div className="space-y-1.5">
            {SITE_TEMPLATES.map(t => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTemplate(t.slug)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border transition-colors ${
                  template === t.slug
                    ? 'border-near-black bg-white'
                    : 'border-[rgba(18,18,18,0.12)] bg-white hover:bg-cream'
                }`}
              >
                <span
                  className="w-6 h-6 flex-shrink-0 border border-[rgba(18,18,18,0.10)]"
                  style={{ background: t.color }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-near-black leading-tight">{t.label}</span>
                  <span className="block text-[11px] text-muted-text truncate">{t.desc}</span>
                </span>
                {template === t.slug && (
                  <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-near-black text-white px-1.5 py-0.5 flex-shrink-0">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-text">You can change this anytime in the editor.</p>
        </div>

        {/* Pre-launch (#117): explicit ToS checkbox on the Google
            deferred-name completion page. Mirrors the email signup
            flow on /register so consent is collected in both paths. */}
        <label className="flex gap-2.5 items-start text-[11px] text-muted-text leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-near-black flex-shrink-0 cursor-pointer"
            aria-describedby="terms-text-google"
          />
          <span id="terms-text-google">
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

        <button
          type="submit"
          disabled={loading || ! businessName.trim() || ! termsAccepted}
          className={submitCls}
        >
          {loading ? 'Creating workspace…' : 'Finish signup'}
        </button>
      </form>

      {/* Wrong account exit */}
      <p className="text-xs text-muted-text mt-6 text-center">
        Signed in with the wrong Google account?{' '}
        <Link href="/register" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Start over
        </Link>
      </p>
    </AuthShell>
  )
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full
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

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
