'use client'

/**
 * Signup-reorder — plan picker (between onboarding and card-capture).
 *
 * Owner just finished the onboarding wizard. They've invested 20-ish
 * minutes building their site. Now they pick a billing structure
 * BEFORE entering a card. The choice gets stamped on the central
 * tenants row via POST /billing/select-plan; the next screen
 * (/checkout/trial) reads it and creates the Stripe Checkout Session.
 *
 * Lightweight by design: no feature comparison table, no SMS pack
 * picker, no Salon tier (waitlist-only). Just 2 cards + monthly /
 * annual toggle. Annual saves the standard ~17% (12 months priced
 * as 10 — same rule the marketing site uses).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react'
import { isLoggedIn } from '@/lib/auth'
import { getBillingPlans, selectBillingPlan, type BillingPlansResponse } from '@/lib/api'
import type { BillingCycle } from '@/lib/types'

type PlanKey = 'solo' | 'studio'

const INTENT_KEY = 'br_signup_intent'

export default function CheckoutPlanPage() {
  const router = useRouter()
  const [plans, setPlans]   = useState<BillingPlansResponse | null>(null)
  const [picked, setPicked] = useState<PlanKey>('studio')
  const [cycle,  setCycle]  = useState<BillingCycle>('monthly')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (! isLoggedIn()) { router.replace('/login'); return }
    getBillingPlans()
      .then(setPlans)
      .catch(() => setError('Could not load plans. Refresh and try again.'))
  }, [router])

  async function handleContinue() {
    if (submitting) return
    setSubmitting(true); setError(null)
    try {
      await selectBillingPlan(picked, cycle)
      // Mirror to localStorage so /checkout/trial's existing intent-
      // reader path keeps working without a server round-trip. The
      // tenant row is the source of truth either way.
      try {
        const prev = JSON.parse(localStorage.getItem(INTENT_KEY) || '{}')
        localStorage.setItem(INTENT_KEY, JSON.stringify({ ...prev, plan: picked, billing: cycle }))
      } catch { /* ignore — backend has the truth */ }
      router.replace('/checkout/trial')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your plan. Try again.')
      setSubmitting(false)
    }
  }

  // Pricing — read straight off the catalog so a change to
  // config/plans.php propagates without a frontend edit. Annual
  // multiplier is whatever the catalog says (typically ~10x the
  // monthly base, the standard "2 months free" promise).
  function priceFor(plan: PlanKey, c: BillingCycle): { dollars: number, perMo: number } {
    if (! plans) return { dollars: 0, perMo: 0 }
    const p = plans.plans[plan]
    if (! p) return { dollars: 0, perMo: 0 }
    const base = c === 'monthly' ? p.monthly_base_cents : p.annual_base_cents
    const dollars = Math.round(base / 100)
    const perMo   = c === 'monthly' ? dollars : Math.round(dollars / 12)
    return { dollars, perMo }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-7 h-7" />
          <span className="text-2xs font-bold tracking-[0.18em] uppercase text-near-black">BookReady</span>
        </div>
        <Link href="/editor/onboard" className="text-xs text-muted-text hover:text-near-black inline-flex items-center gap-1">
          <ChevronLeft size={11} /> Back to setup
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <p className="text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2 inline-flex items-center gap-1.5">
          <Sparkles size={11} /> Your site is built
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-near-black tracking-tight mb-2">
          Pick a plan to <span className="italic">publish it.</span>
        </h1>
        <p className="text-sm text-muted-text leading-relaxed max-w-lg mb-8">
          You can switch plans any time from your editor. Annual saves the equivalent of 2 months — same as the marketing site.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Cycle toggle */}
        <div className="mb-5 inline-flex border border-[rgba(18,18,18,0.15)] bg-white">
          {(['monthly', 'annual'] as BillingCycle[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              disabled={submitting}
              className={`px-4 py-2 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors ${
                cycle === c
                  ? 'bg-near-black text-white'
                  : 'text-muted-text hover:text-near-black'
              }`}
            >
              {c === 'monthly' ? 'Monthly' : 'Annual'}
              {c === 'annual' && <span className="ml-1.5 text-[9px] opacity-70 normal-case font-normal">save 17%</span>}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {(['solo', 'studio'] as PlanKey[]).map(plan => {
            const isPicked = picked === plan
            const { dollars, perMo } = priceFor(plan, cycle)
            const label = plan === 'solo' ? 'Solo' : 'Studio'
            const tagline = plan === 'solo'
              ? 'For a single pro running their own calendar.'
              : 'For a multi-pro studio with per-staff calendars + payouts.'
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setPicked(plan)}
                disabled={submitting}
                aria-pressed={isPicked}
                className={`text-left p-5 border bg-white transition-colors ${
                  isPicked
                    ? 'border-near-black ring-1 ring-near-black'
                    : 'border-[rgba(18,18,18,0.15)] hover:border-[rgba(18,18,18,0.30)]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">{label}</span>
                  {isPicked && <CheckCircle2 size={14} className="text-near-black" />}
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-near-black tracking-tight">${perMo}</span>
                  <span className="text-xs text-muted-text">/mo</span>
                </div>
                <p className="text-[10px] text-muted-text mb-3">
                  {cycle === 'annual' ? `Billed $${dollars} annually` : 'Billed monthly'}
                </p>
                <p className="text-xs text-muted-text leading-relaxed">{tagline}</p>
              </button>
            )
          })}
        </div>

        {/* Trust strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          <TrustLine>14-day free trial</TrustLine>
          <TrustLine>No charge today</TrustLine>
          <TrustLine>Cancel any time</TrustLine>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting || ! plans}
          className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.16em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Saving…' : 'Continue to trial setup'}
        </button>

        <p className="text-[11px] text-muted-text mt-4 text-center leading-relaxed">
          Next step adds a card to start your 14-day trial. We will not charge it today.
        </p>
      </main>
    </div>
  )
}

function TrustLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[rgba(18,18,18,0.08)] text-[11px] text-near-black">
      <CheckCircle2 size={12} className="text-near-black" />
      <span>{children}</span>
    </div>
  )
}
