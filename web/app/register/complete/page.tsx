'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'
import { completeGoogleSignup, checkSubdomain, getCurrentUser, type SubdomainCheckResponse } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import { normalizeTemplateSlug } from '@/lib/templates'
import CollapsibleTemplatePicker from '@/components/auth/CollapsibleTemplatePicker'
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
  // A7 mirror — debounced subdomain availability check, same UX as
  // the email signup form on /register.
  const [slugCheck, setSlugCheck] = useState<SubdomainCheckResponse | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATE_KEY)
    if (stored) setTemplate(normalizeTemplateSlug(stored))
  }, [])

  const slugPreview = useMemo(
    () => businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness',
    [businessName],
  )

  // A7 mirror — debounced availability check. 400ms debounce + cancel-
  // on-stale so we don't apply a response that's no longer relevant.
  useEffect(() => {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (slug.length < 3) {
      setSlugCheck(null)
      setSlugChecking(false)
      return
    }
    setSlugChecking(true)
    setSlugCheck(null)
    const handle = setTimeout(() => {
      let cancelled = false
      checkSubdomain(slug)
        .then(res => {
          if (cancelled) return
          const liveSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (liveSlug === slug) {
            setSlugCheck(res)
            setSlugChecking(false)
          }
        })
        .catch(() => {
          if (! cancelled) {
            setSlugCheck(null)
            setSlugChecking(false)
          }
        })
      return () => { cancelled = true }
    }, 400)
    return () => clearTimeout(handle)
  }, [businessName])

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
      // #167 — read the marketing-side intent that /register persisted
      // on mount (plan + billing + sms forwarded from the CTA URL).
      // Previously this hardcoded defaults, which silently dropped any
      // plan/billing choice the user made before clicking Sign up with
      // Google. Fall back to defaults only when nothing was persisted.
      try {
        const stored = localStorage.getItem('br_signup_intent')
        const prior  = stored ? JSON.parse(stored) : null
        localStorage.setItem('br_signup_intent', JSON.stringify({
          template,
          plan:     prior?.plan     ?? 'studio',
          billing:  prior?.billing  ?? 'monthly',
          sms_mult: prior?.sms_mult ?? 1,
        }))
      } catch { /* ignore */ }
      // Google completeSignup already marks email_verified_at on the
      // backend, so verify-email is skipped. Signup-reorder routes
      // Google signups through /editor/onboard → /checkout/plan →
      // /checkout/trial the same as email signups. Follow the
      // backend's redirect_url verbatim so the order stays in one
      // place (AuthController::redirectFor).
      try {
        const me = await getCurrentUser()
        router.push(me.redirect_url || '/editor/onboard')
      } catch {
        router.push('/editor/onboard')
      }
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

      {/* Carried-over marketing intent — shown when the user came in
          via a CTA that forwarded plan/billing/sms. The template chip
          is omitted here because the picker below IS the template
          confirmation; doubling up would feel redundant. */}
      <CarriedIntentBanner />

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
              {/* A7 mirror — live availability indicator. */}
              <span className="ml-2 inline-flex items-center gap-1 align-middle">
                {slugChecking && businessName.length >= 3 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-text">
                    <Loader2 size={10} className="animate-spin" /> Checking…
                  </span>
                )}
                {! slugChecking && slugCheck?.available && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#0f6f3d] font-semibold">
                    <Check size={11} strokeWidth={2.5} /> Available
                  </span>
                )}
                {! slugChecking && slugCheck && ! slugCheck.available && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#b42828] font-semibold">
                    <X size={11} strokeWidth={2.5} />
                    {slugCheck.reason === 'reserved' ? 'Reserved' : 'Taken'}
                  </span>
                )}
              </span>
              {! slugChecking && slugCheck?.suggested && (
                <span className="block text-[10px] text-muted-text mt-1">
                  Try{' '}
                  <span className="font-semibold text-near-black">{slugCheck.suggested}.bkrdy.me</span>
                  {' '}— available.
                </span>
              )}
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

        {/* Collapsible template picker — shows the current selection
            inline + an expand affordance for the others. Same component
            as the email signup form, so both flows feel identical. */}
        <CollapsibleTemplatePicker
          value={template}
          onChange={setTemplate}
        />

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
            {' '}of DaysGraphic LLC, the operator of the BookReady platform.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            loading
            || ! businessName.trim()
            || ! termsAccepted
            || (slugCheck != null && !slugCheck.available)
            || slugChecking
          }
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

/**
 * Reads br_signup_intent from localStorage (set by /register on mount
 * for any marketing-CTA arrival) and renders a small "Continuing with:
 * Studio · monthly · 2x SMS" confirmation banner. Renders nothing when
 * intent is missing or all-default — keeps the cold-Google-signup
 * journey clean.
 *
 * Template chip is intentionally NOT shown here — the picker below is
 * the template confirmation surface.
 */
function CarriedIntentBanner() {
  const [intent, setIntent] = useState<{
    plan?: string; billing?: string; sms_mult?: number
  } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('br_signup_intent')
      if (raw) setIntent(JSON.parse(raw))
    } catch { /* localStorage disabled */ }
  }, [])

  if (! intent) return null

  const parts: string[] = []
  if (intent.plan)    parts.push(intent.plan.charAt(0).toUpperCase() + intent.plan.slice(1))
  if (intent.billing) parts.push(intent.billing === 'annual' ? 'annual' : 'monthly')
  if (intent.sms_mult && intent.sms_mult > 1) parts.push(`${intent.sms_mult}x SMS`)
  if (parts.length === 0) return null

  return (
    <div className="mb-5 px-3 py-2.5 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center gap-3">
      <span className="text-near-black font-bold tracking-[0.08em] uppercase text-[9px]">Continuing with</span>
      <span className="text-[12px] font-semibold text-near-black">{parts.join(' · ')}</span>
    </div>
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

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
