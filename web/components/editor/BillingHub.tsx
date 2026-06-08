'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, ExternalLink, Loader2, RefreshCw, AlertCircle, Check, Sparkles,
} from 'lucide-react'
import {
  getBillingPlans,
  getBillingSubscription,
  getBillingPortalUrl,
  createCheckoutSession,
  type BillingPlansResponse,
  type BillingSubscription,
} from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Editor → Billing.
 *
 * Surfaces the current plan + included SMS quota + billing cycle pulled
 * from the live Stripe subscription (via BillingController::subscription).
 * Owner can:
 *   - Open the Stripe Customer Portal (manage card, see invoices, cancel)
 *   - Pick a different plan / SMS bundle and start a Checkout Session
 *     to switch (Stripe handles proration)
 *
 * For tenants without a subscription yet, this page is the on-ramp:
 * pick a plan, start checkout, return via /checkout/success which
 * confirms via the webhook-stamped TenantSubscription.
 */

type PlanKey = 'solo' | 'studio' | 'salon'
type SmsMult = 1 | 2 | 3
type Cycle   = 'monthly' | 'annual'

export default function BillingHub() {
  const [plans, setPlans] = useState<BillingPlansResponse | null>(null)
  const [sub,   setSub]   = useState<BillingSubscription | null>(null)
  const [err,   setErr]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Selected values for the plan picker. Default to the user's current
  // plan once the sub loads; otherwise studio @ monthly @ 1x (most-
  // popular tier, mirrors the marketing site's featured selection).
  const [pickedPlan,  setPickedPlan]  = useState<PlanKey>('studio')
  const [pickedCycle, setPickedCycle] = useState<Cycle>('monthly')
  const [pickedMult,  setPickedMult]  = useState<SmsMult>(1)

  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  async function refresh() {
    setErr(null)
    setLoading(true)
    try {
      const [planRes, subRes] = await Promise.all([
        getBillingPlans(),
        getBillingSubscription(),
      ])
      setPlans(planRes)
      setSub(subRes)
      // Sync picker to current subscription if there is one.
      if (subRes.plan)         setPickedPlan(subRes.plan)
      if (subRes.billing_cycle) setPickedCycle(subRes.billing_cycle)
      if (subRes.sms_mult)     setPickedMult(subRes.sms_mult as SmsMult)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load billing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const { url } = await getBillingPortalUrl()
      window.location.href = url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open billing portal')
      setPortalLoading(false)
    }
  }

  async function startCheckout() {
    if (pickedPlan === 'salon') {
      setErr('Salon is currently waitlist-only. Reach out to hello@mybookready.com to be onboarded.')
      return
    }
    setCheckoutLoading(true)
    setErr(null)
    try {
      const { checkout_url } = await createCheckoutSession(
        pickedCycle,
        'thefaderoom', // template stamp — doesn't affect billing
        { plan: pickedPlan, smsMult: pickedMult },
      )
      window.location.href = checkout_url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start checkout')
      setCheckoutLoading(false)
    }
  }

  // Pre-compute pricing per (plan, cycle, mult). Uplift is computed
  // from per_sms_uplift_dollars × sms_delta (same formula PHP uses in
  // CreateStripeProducts) so 47% margin holds across all plans. Don't
  // hardcode flat numbers here — they would drift from config/plans.php
  // the moment the per-SMS rate changes.
  const pricedPlans = useMemo(() => {
    if (! plans) return []
    return (Object.keys(plans.plans) as PlanKey[]).map(key => {
      const p             = plans.plans[key]
      const extraSms      = (pickedMult - 1) * p.sms_base
      const upliftMonthly = Math.round(extraSms * plans.per_sms_uplift_dollars * 100)
      const upliftBilled  = pickedCycle === 'monthly' ? upliftMonthly : upliftMonthly * 12
      const baseCents     = pickedCycle === 'monthly' ? p.monthly_base_cents : p.annual_base_cents
      const totalCents    = baseCents + upliftBilled
      const perMonthCents = pickedCycle === 'monthly' ? totalCents : Math.round(totalCents / 12)
      return {
        key,
        plan: p,
        smsIncluded: p.sms_base * pickedMult,
        totalCents,
        perMonthCents,
      }
    })
  }, [plans, pickedCycle, pickedMult])

  if (loading && ! plans) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-10">
        <Loader2 size={14} className="animate-spin" /> Loading billing…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Current subscription ──────────────────────────────────── */}
      <section className="bg-white border border-hairline-soft p-5">
        <header className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-near-black tracking-tight inline-flex items-center gap-2">
              <CreditCard size={16} /> Billing
            </h1>
            <p className="text-xs text-muted-text mt-0.5">
              Manage your BookReady plan, billing cycle, and text allowance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-50"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Refresh
          </button>
        </header>

        {err && (
          <div className="bg-danger-bg border border-danger p-3 text-xs text-danger flex items-center gap-2 mb-3">
            <AlertCircle size={14} /> {err}
          </div>
        )}

        {sub?.subscribed ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <Stat label="Plan" value={sub.plan ? capitalize(sub.plan) : '-'} />
            <Stat label="Billing" value={sub.billing_cycle ? capitalize(sub.billing_cycle) : '-'} />
            <Stat label="Texts / mo" value={sub.sms_included.toLocaleString()} hint={sub.sms_mult ? `${sub.sms_mult}× texts` : null} />
            <Stat label="Status" value="Active" tone="ok" />
          </div>
        ) : sub?.on_trial ? (
          <div className="mt-2 p-4 bg-cream border border-hairline-soft">
            <p className="text-sm text-near-black font-semibold">On trial</p>
            <p className="text-xs text-muted-text mt-1">
              {sub.trial_ends ? <>Trial ends {new Date(sub.trial_ends).toLocaleDateString()}.</> : 'Pick a plan below before your trial ends.'}
            </p>
          </div>
        ) : (
          <div className="mt-2 p-4 bg-cream border border-hairline-soft">
            <p className="text-sm text-near-black font-semibold">No active subscription</p>
            <p className="text-xs text-muted-text mt-1">
              Pick a plan below to start. You can switch or cancel any time from your billing portal.
            </p>
          </div>
        )}

        {sub?.subscribed && (
          <div className="mt-4 pt-4 border-t border-hairline-soft flex items-center justify-between flex-wrap gap-2">
            <p className="text-2xs text-muted-text">
              Manage your card, invoices, and cancellation in the billing portal.
            </p>
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black"
            >
              {portalLoading ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
              Open billing portal
            </button>
          </div>
        )}
      </section>

      {/* ── Plan picker ───────────────────────────────────────────── */}
      <section className="bg-white border border-hairline-soft p-5">
        <header className="mb-4">
          <h2 className="text-lg font-bold text-near-black tracking-tight">
            {sub?.subscribed ? 'Change plan' : 'Pick a plan'}
          </h2>
          <p className="text-xs text-muted-text mt-0.5">
            Switching plans is prorated automatically. Your text pack sets how many texts are included each cycle.
          </p>
        </header>

        {/* Cycle toggle */}
        <div className="inline-flex border border-hairline-strong bg-cream mb-4">
          <CycleBtn active={pickedCycle === 'monthly'} onClick={() => setPickedCycle('monthly')}>Monthly</CycleBtn>
          <CycleBtn active={pickedCycle === 'annual'} onClick={() => setPickedCycle('annual')}>
            Annual <span className="ml-1 text-eyebrow font-bold tracking-[0.06em] uppercase text-warning">2 mos free</span>
          </CycleBtn>
        </div>

        {/* SMS multiplier toggle. Uplift labels are intentionally NOT
            hardcoded — they vary per plan now (Solo +$3, Studio +$6,
            Salon +$15 for 2x). The per-card delta is shown on each plan
            card below; here we just show the bundle name. */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Text pack:</span>
          {([1, 2, 3] as SmsMult[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setPickedMult(m)}
              className={cn(
                'border px-2.5 py-1 text-2xs font-semibold',
                pickedMult === m
                  ? 'border-near-black bg-near-black text-white'
                  : 'border-hairline-strong bg-white text-near-black hover:border-near-black',
              )}
            >
              {m}× {m === 1 ? '(standard)' : `(more texts)`}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pricedPlans.map(({ key, plan, smsIncluded, totalCents, perMonthCents }) => {
            const isCurrent = sub?.plan === key && sub?.billing_cycle === pickedCycle && sub?.sms_mult === pickedMult
            const isPicked  = pickedPlan === key
            const isWaitlist = plan.waitlist
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPickedPlan(key)}
                disabled={isWaitlist}
                className={cn(
                  'text-left p-4 border bg-white transition-colors',
                  isPicked ? 'border-near-black ring-2 ring-near-black/10' : 'border-hairline-strong',
                  isWaitlist ? 'opacity-50 cursor-not-allowed' : 'hover:border-near-black cursor-pointer',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs font-bold tracking-[0.14em] uppercase text-near-black">{plan.label}</p>
                  {plan.featured && (
                    <span className="text-eyebrow font-bold tracking-[0.08em] uppercase text-warning bg-[rgba(255,200,0,0.10)] border border-[rgba(180,120,0,0.30)] px-1.5 py-0.5">
                      Popular
                    </span>
                  )}
                  {isWaitlist && (
                    <span className="text-eyebrow font-bold tracking-[0.08em] uppercase text-muted-text bg-cream border border-hairline-soft px-1.5 py-0.5">
                      Waitlist
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-near-black leading-none mt-2">
                  ${(perMonthCents / 100).toFixed(0)}
                  <span className="text-xs font-normal text-muted-text"> /mo</span>
                </p>
                <p className="text-eyebrow text-muted-text mt-1">
                  {pickedCycle === 'annual'
                    ? <>billed ${(totalCents / 100).toFixed(0)}/yr</>
                    : 'billed monthly'}
                </p>
                <p className="text-xs text-near-black mt-3 font-semibold">
                  {smsIncluded.toLocaleString()} texts / month
                </p>
                <p className="text-2xs text-muted-text mt-2 leading-relaxed">
                  {plan.description}
                </p>
                {isCurrent && (
                  <p className="text-eyebrow text-success font-bold uppercase tracking-[0.12em] mt-3 inline-flex items-center gap-1">
                    <Check size={10} /> Current
                  </p>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-hairline-soft flex items-center justify-between flex-wrap gap-3">
          <div className="text-2xs text-muted-text">
            <p>
              Extra texts: ${((plans?.sms_overage_cents ?? 3) / 100).toFixed(3)} each over your monthly allowance (billed automatically).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={checkoutLoading || pickedPlan === 'salon'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-4 py-2.5 hover:bg-white hover:text-near-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {sub?.subscribed ? `Switch to ${capitalize(pickedPlan)} ${pickedMult}× ${pickedCycle}` : `Start with ${capitalize(pickedPlan)} ${pickedMult}× ${pickedCycle}`}
          </button>
        </div>
      </section>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function Stat({ label, value, hint, tone }: {
  label: string
  value: string | number
  hint?: string | null
  tone?: 'ok' | 'warn'
}) {
  return (
    <div className="bg-cream border border-hairline-soft p-3">
      <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
      <p className={cn(
        'text-lg font-bold text-near-black leading-none mt-1.5',
        tone === 'ok' && 'text-success',
        tone === 'warn' && 'text-warning',
      )}>
        {value}
      </p>
      {hint && <p className="text-eyebrow text-muted-text mt-1.5">{hint}</p>}
    </div>
  )
}

function CycleBtn({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-2xs font-semibold tracking-[0.08em] uppercase',
        active ? 'bg-near-black text-white' : 'text-near-black hover:bg-white',
      )}
    >
      {children}
    </button>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
