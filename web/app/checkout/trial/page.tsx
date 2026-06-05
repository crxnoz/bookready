'use client'

/**
 * #155 — Trial card-capture screen.
 *
 * After signup, the owner lands here. We collect a payment method via
 * Stripe Checkout in Setup mode and start a 14-day trial. NO charge
 * happens today — the first charge is the day-14 conversion attempt.
 *
 * The plan/cycle/SMS-bundle chosen on the marketing site is read from
 * localStorage (br_signup_intent, set by /register on successful
 * signup) with URL query params as a fallback. The owner sees what
 * they're starting; they don't re-pick.
 *
 * On submit, /billing/start-trial creates the Stripe Checkout Session
 * with trial_period_days=14 + payment_method_collection=always and
 * returns the URL we hand off to. Stripe collects the card, returns
 * to /checkout/success?trial=1 which routes onward into the editor
 * (where the dashboard gate auto-bounces to the onboarding wizard).
 */

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard, ShieldCheck, Loader2, AlertCircle, ChevronLeft, Pencil, X } from 'lucide-react'
import { startTrial, getBillingPlans, selectActiveTemplate, skipTrialSetup, type BillingPlansResponse } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import type { BillingCycle } from '@/lib/types'

const INTENT_KEY   = 'br_signup_intent'
const TEMPLATE_KEY = 'br_template'

type PlanKey = 'solo' | 'studio' | 'salon'
type SmsMult = 1 | 2 | 3

interface SignupIntent {
  template?: string
  plan?: PlanKey
  billing?: BillingCycle
  sms_mult?: SmsMult
}

export default function CheckoutTrialPage() {
  return (
    <Suspense fallback={<TrialShell><Spinner /></TrialShell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [intent, setIntent]   = useState<SignupIntent>({})
  const [plans, setPlans]     = useState<BillingPlansResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [cancelled, setCancelled] = useState(false)
  // A9 — inline picker visibility. Closed by default so the screen stays
  // focused on "start trial". Open click reveals plan/billing/sms/template
  // selects that mutate intent + persist back to localStorage on every change.
  const [pickerOpen, setPickerOpen] = useState(false)
  // A5 refinement — "Skip for now" busy/error state. Distinct from
  // `loading` (Start free trial) so the spinner shows on the right button.
  const [skipping, setSkipping] = useState(false)

  // Boot: confirm signed-in, read intent, pull plan catalog.
  useEffect(() => {
    if (! isLoggedIn()) { router.replace('/login'); return }
    if (searchParams.get('cancelled') === '1') setCancelled(true)

    // Read intent from localStorage first (the canonical source after
    // /register handoff). URL params are a fallback for direct links.
    let parsed: SignupIntent = {}
    try {
      const raw = localStorage.getItem(INTENT_KEY)
      if (raw) parsed = JSON.parse(raw) as SignupIntent
    } catch { /* corrupt JSON — ignore */ }

    const queryTemplate = searchParams.get('template')
    const queryPlan     = searchParams.get('plan')     as PlanKey | null
    const queryBilling  = searchParams.get('billing')  as BillingCycle | null
    const querySms      = searchParams.get('sms_mult')

    const merged: SignupIntent = {
      template: parsed.template ?? queryTemplate ?? localStorage.getItem(TEMPLATE_KEY) ?? 'thefaderoom',
      plan:     parsed.plan     ?? (queryPlan ?? 'studio'),
      billing:  parsed.billing  ?? (queryBilling ?? 'monthly'),
      sms_mult: parsed.sms_mult ?? (querySms ? (parseInt(querySms, 10) as SmsMult) : 1),
    }
    setIntent(merged)

    // Pull the plan catalog so we can show real prices.
    // A11 — 15-second timeout so a hung fetch (CORS preflight failure
    // mid-cookie-propagation after Google signup, intermittent network,
    // etc.) doesn't leave the user staring at a loading spinner forever.
    // Whatever resolves first wins; the timeout surfaces a real error
    // banner with a hint instead of an infinite spinner.
    const timeoutMs = 15_000
    const planPromise = getBillingPlans()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    )
    Promise.race([planPromise, timeoutPromise])
      .then(p => setPlans(p as Awaited<typeof planPromise>))
      .catch(e => {
        const msg = e instanceof Error && e.message === 'timeout'
          ? 'Plan details took too long to load. Refresh the page and try again — or click "Skip for now" below to continue.'
          : 'Could not load your plan details. Refresh the page.'
        setError(msg)
      })
  }, [router, searchParams])

  // Compute the price the same way BillingHub does — uplift driven by
  // per_sms_uplift_dollars × sms_delta so this view never drifts from
  // the editor's billing view.
  const summary = useMemo(() => {
    if (! plans || ! intent.plan) return null
    const plan       = plans.plans[intent.plan]
    if (! plan) return null
    const cycle      = intent.billing ?? 'monthly'
    const mult       = intent.sms_mult ?? 1
    const extraSms   = (mult - 1) * plan.sms_base
    const upliftMo   = Math.round(extraSms * plans.per_sms_uplift_dollars * 100)
    const upliftBill = cycle === 'monthly' ? upliftMo : upliftMo * 12
    const baseCents  = cycle === 'monthly' ? plan.monthly_base_cents : plan.annual_base_cents
    const totalCents = baseCents + upliftBill
    return {
      planLabel:   plan.label,
      cycleLabel:  cycle === 'monthly' ? 'Monthly' : 'Annual',
      smsLabel:    `${mult}× (${(plan.sms_base * mult).toLocaleString()} SMS/mo)`,
      totalDollars: (totalCents / 100).toFixed(2),
      cycle,
      mult,
      // First charge: 14 days from today.
      firstChargeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    }
  }, [plans, intent])

  // A9 — write back to localStorage on every intent change so a refresh
  // doesn't lose the user's edits. Backend selectActiveTemplate runs at
  // Start-trial time so the template choice carries into the editor.
  function updateIntent(patch: Partial<SignupIntent>) {
    setIntent(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(INTENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // A5 refinement — "Skip for now" button. Stamps trial_acknowledged_at
  // so the post-login redirect won't bounce us back here, then advances
  // to /editor. Selecting the chosen template still runs so the editor
  // opens to the right skin.
  async function handleSkip() {
    if (skipping) return
    setSkipping(true); setError('')
    try {
      if (intent.template) {
        try { await selectActiveTemplate(intent.template) } catch { /* non-fatal */ }
      }
      await skipTrialSetup()
      router.replace('/editor')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not skip the trial setup. Try again.')
      setSkipping(false)
    }
  }

  async function handleStartTrial() {
    if (! intent.plan || ! intent.billing) {
      setError('Missing plan info. Pick a plan from the pricing page.')
      return
    }
    setError(''); setLoading(true)
    try {
      // Apply the chosen template before leaving for Stripe — same
      // pattern the old /checkout used. Best-effort; failure here
      // doesn't block trial start (owner can change the template
      // in the editor anyway).
      if (intent.template) {
        try { await selectActiveTemplate(intent.template) } catch { /* non-fatal */ }
      }
      const { checkout_url } = await startTrial(
        intent.billing,
        intent.template ?? 'thefaderoom',
        { plan: intent.plan, smsMult: intent.sms_mult },
      )
      window.location.href = checkout_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start your trial. Try again.')
      setLoading(false)
    }
  }

  return (
    <TrialShell>
      {cancelled && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
          You closed Stripe before adding a card. Try again whenever you&rsquo;re ready — your data is safe.
        </div>
      )}

      {/* Heading */}
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
          One last step
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-near-black tracking-tight mb-2">
          Start your <span className="italic">14-day free trial.</span>
        </h1>
        <p className="text-sm text-muted-text max-w-lg leading-relaxed">
          Add a card to start your trial. We won&rsquo;t charge it today — your first payment is on{' '}
          <span className="font-semibold text-near-black">{summary?.firstChargeDate ?? '—'}</span>.
          Cancel any time from your billing settings before then.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Plan summary */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text">
            Your trial includes
          </p>
          {/* A9 — change-plan toggle. Hidden inside the picker prevents
              accidental re-edits once the user is happy with the pick. */}
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            disabled={! plans}
            className="text-[11px] font-bold tracking-[0.10em] uppercase text-near-black inline-flex items-center gap-1 hover:opacity-70 disabled:opacity-40"
          >
            {pickerOpen
              ? <><X size={11} /> Done</>
              : <><Pencil size={11} /> Change</>}
          </button>
        </div>
        {summary ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label="Plan"     value={summary.planLabel} />
              <Stat label="Billing"  value={summary.cycleLabel} />
              <Stat label="SMS"      value={summary.smsLabel} />
              <Stat label="Template" value={prettyTemplate(intent.template)} />
            </div>
            <div className="border-t border-[rgba(18,18,18,0.08)] pt-3 flex items-baseline justify-between">
              <p className="text-[11px] text-muted-text">After trial ({summary.cycleLabel.toLowerCase()})</p>
              <p className="text-2xl font-bold text-near-black tracking-tight">
                ${summary.totalDollars}<span className="text-sm font-normal text-muted-text">/{summary.cycle === 'monthly' ? 'mo' : 'yr'}</span>
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-text">
            <Spinner /> Loading your selection…
          </div>
        )}
      </section>

      {/* A9 — inline picker. Mutates intent on every change; updates
          localStorage so a refresh doesn't lose the edit. Closed by
          default to keep the screen focused on the trial CTA. */}
      {pickerOpen && plans && (
        <section className="bg-cream border border-[rgba(18,18,18,0.15)] p-5 mb-5">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-4">
            Change your plan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Picker label="Plan">
              <select
                value={intent.plan ?? 'studio'}
                onChange={e => updateIntent({ plan: e.target.value as PlanKey })}
                className={selectCls}
              >
                {(Object.entries(plans.plans) as Array<[PlanKey, { label: string }]>).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Picker>
            <Picker label="Billing">
              <select
                value={intent.billing ?? 'monthly'}
                onChange={e => updateIntent({ billing: e.target.value as BillingCycle })}
                className={selectCls}
              >
                {(Object.entries(plans.cycles) as Array<[BillingCycle, { label: string }]>).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Picker>
            <Picker label="SMS bundle">
              <select
                value={String(intent.sms_mult ?? 1)}
                onChange={e => updateIntent({ sms_mult: parseInt(e.target.value, 10) as SmsMult })}
                className={selectCls}
              >
                {(Object.entries(plans.sms_multipliers) as Array<[string, { label: string }]>).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Picker>
            <Picker label="Template">
              <select
                value={intent.template ?? 'thefaderoom'}
                onChange={e => updateIntent({ template: e.target.value })}
                className={selectCls}
              >
                <option value="thefaderoom">The Fade Room</option>
                <option value="lushstudio">Lush Studio</option>
                <option value="velvettheory">Velvet Theory</option>
              </select>
            </Picker>
          </div>
          <p className="text-[10px] text-muted-text mt-3 leading-relaxed">
            Changes apply when you start the trial. You can also switch plans + templates later from your editor.
          </p>
        </section>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        <TrustLine icon={ShieldCheck}>14 days free — no charge today</TrustLine>
        <TrustLine icon={CheckCircle2}>Cancel anytime from billing</TrustLine>
        <TrustLine icon={CreditCard}>Card stored securely by Stripe</TrustLine>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleStartTrial}
        disabled={loading || skipping || ! summary}
        className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.16em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {loading ? <Spinner /> : <CreditCard size={14} />}
        {loading ? 'Opening Stripe…' : 'Start free trial'}
      </button>

      <p className="text-[11px] text-muted-text mt-4 text-center leading-relaxed">
        By starting your trial you agree to BookReady&rsquo;s{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-near-black">Terms</Link>{' '}and{' '}
        <Link href="/refund" className="underline underline-offset-2 hover:text-near-black">Refund Policy</Link>.
        We&rsquo;ll email you 3 days before your trial ends.
      </p>

      {/* A5 refinement — explicit Skip-for-now path. Card capture is
          optional, but the trial-info screen is mandatory; the only way
          to bypass it is this button (NOT signing out + back in, which
          now correctly bounces back here). 14-day trial countdown still
          starts; the existing /editor/billing flow handles adding a
          card later. */}
      <div className="mt-6 pt-5 border-t border-[rgba(18,18,18,0.08)] text-center">
        <p className="text-[11px] text-muted-text mb-2 leading-relaxed">
          Want to add your card later? Your 14-day trial still starts now.
        </p>
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={loading || skipping}
          className="text-[11px] font-bold tracking-[0.14em] uppercase text-near-black hover:opacity-70 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {skipping ? <Spinner /> : null}
          {skipping ? 'Skipping…' : 'Skip for now →'}
        </button>
      </div>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-xs text-muted-text hover:text-near-black inline-flex items-center gap-1">
          <ChevronLeft size={11} /> Back to login
        </Link>
      </div>
    </TrialShell>
  )
}

// ── Shell + helpers ────────────────────────────────────────────────────

function TrialShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-7 h-7" />
          <span className="text-sm font-bold text-near-black tracking-tight">BookReady</span>
        </div>
        <p className="text-xs text-muted-text hidden sm:flex items-center gap-1">
          <ShieldCheck size={12} /> Secure setup via Stripe
        </p>
      </header>
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream border border-[rgba(18,18,18,0.10)] p-3">
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
      <p className="text-[14px] font-bold text-near-black mt-1 capitalize">{value}</p>
    </div>
  )
}

function TrustLine({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-3 py-2.5 text-[11px] text-near-black flex items-center gap-2">
      <Icon size={12} className="text-[#1e7a3f] flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Spinner() {
  return <Loader2 size={14} className="animate-spin" />
}

// A9 — inline picker subcomponents. Mirror the editor's Tailwind palette
// so the change-plan UX feels native to the rest of the auth surface.

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const selectCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black appearance-none cursor-pointer'

/** A9 — friendly template name for the summary card. The slug stays
 *  canonical (thefaderoom etc) so the picker + backend talk in slugs;
 *  this is purely cosmetic. */
function prettyTemplate(slug?: string): string {
  switch (slug) {
    case 'thefaderoom':  return 'The Fade Room'
    case 'lushstudio':   return 'Lush Studio'
    case 'velvettheory': return 'Velvet Theory'
    default:             return slug ?? '—'
  }
}
