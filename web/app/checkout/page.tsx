'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCheckoutSession } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { BillingCycle } from '@/lib/types'

const TEMPLATE_KEY = 'br_template'

const TEMPLATES = [
  { slug: 'thefaderoom', label: 'The Fade Room', desc: 'Dark editorial barbershop', color: '#0A0A0A' },
  { slug: 'lushstudio', label: 'Lush Studio', desc: 'Clean feminine salon aesthetic', color: '#F3E8F0' },
  { slug: 'cleanbeauty', label: 'Clean Beauty', desc: 'Minimal spa-inspired look', color: '#F8F8F6' },
]

const BILLING: {
  id: BillingCycle
  label: string
  monthly: number
  total: string
  tagline: string
  badge?: string
}[] = [
  { id: 'monthly', label: 'Monthly', monthly: 25, total: '$25/mo', tagline: 'Billed $25 every month' },
  { id: 'quarterly', label: 'Quarterly', monthly: 22, total: '$66 / 3 months', tagline: 'Save $9 vs monthly' },
  { id: 'annual', label: 'Annual', monthly: 17, total: '$204 / year', tagline: 'Save $96 vs monthly', badge: 'Best Value' },
]

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [template, setTemplate] = useState('thefaderoom')
  const [billing, setBilling] = useState<BillingCycle>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    // Phase S6 — guard via the in-memory "logged in" flag instead of
    // the legacy localStorage token. Cookie session is verified by the
    // first /billing/* call.
    if (!isLoggedIn()) { router.replace('/login'); return }
    const fromQuery = searchParams.get('template')
    const fromStorage = localStorage.getItem(TEMPLATE_KEY)
    const resolved = fromQuery ?? fromStorage ?? 'thefaderoom'
    setTemplate(resolved)
    localStorage.setItem(TEMPLATE_KEY, resolved)
    if (searchParams.get('cancelled') === '1') setCancelled(true)
  }, [router, searchParams])

  function selectTemplate(slug: string) {
    setTemplate(slug)
    localStorage.setItem(TEMPLATE_KEY, slug)
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const { checkout_url } = await createCheckoutSession(billing, template)
      window.location.href = checkout_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const selectedBilling = BILLING.find(b => b.id === billing)!
  const selectedTemplate = TEMPLATES.find(t => t.slug === template) ?? TEMPLATES[0]

  const total = billing === 'annual' ? 204 : billing === 'quarterly' ? 66 : 25
  const savings = billing === 'annual' ? 96 : billing === 'quarterly' ? 9 : 0

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
          </div>
          <span className="text-sm font-bold text-near-black tracking-tight">BookReady</span>
        </div>
        <p className="text-xs text-muted-text hidden sm:block">Secure checkout</p>
      </header>

      <div className="max-w-[1060px] mx-auto px-4 py-8 md:py-12">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">Get launched</p>
          <h1 className="text-2xl md:text-3xl font-bold text-near-black tracking-tight mb-2">
            Choose your plan and launch your booking website.
          </h1>
          <p className="text-sm text-muted-text max-w-lg">
            Start with a clean booking site, online appointments, client tools, and mobile-ready templates.
          </p>
        </div>

        {/* Alerts */}
        {cancelled && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Your payment was cancelled. You can try again below.
          </div>
        )}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* Left: selectors */}
          <div className="space-y-6">

            {/* Template selector */}
            <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">Selected template</p>
              <h2 className="text-sm font-bold text-near-black tracking-tight mb-4">Pick how your site looks</h2>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.slug}
                    onClick={() => selectTemplate(t.slug)}
                    className={`w-full text-left flex items-center gap-4 px-4 py-3.5 border transition-colors ${
                      template === t.slug
                        ? 'border-near-black bg-white'
                        : 'border-[rgba(18,18,18,0.10)] bg-white hover:bg-cream'
                    }`}
                  >
                    <div
                      className="w-9 h-9 flex-shrink-0 border border-[rgba(18,18,18,0.10)]"
                      style={{ background: t.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-near-black">{t.label}</p>
                      <p className="text-xs text-muted-text">{t.desc}</p>
                    </div>
                    {template === t.slug && (
                      <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-near-black text-white px-2 py-0.5 flex-shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Billing cycle */}
            <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">Billing cycle</p>
              <h2 className="text-sm font-bold text-near-black tracking-tight mb-4">Pick how you&apos;d like to pay</h2>
              <div className="space-y-2">
                {BILLING.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBilling(b.id)}
                    className={`w-full text-left flex items-center gap-4 px-4 py-4 border transition-colors ${
                      billing === b.id
                        ? 'border-near-black bg-white'
                        : 'border-[rgba(18,18,18,0.10)] bg-white hover:bg-cream'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-near-black">{b.label}</span>
                        {b.badge && (
                          <span className="text-[9px] font-bold tracking-[0.10em] uppercase bg-blush text-near-black px-1.5 py-0.5">
                            {b.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-text">{b.tagline}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-bold text-near-black">${b.monthly}</span>
                      <span className="text-xs text-muted-text">/mo</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right: order summary */}
          <aside className="space-y-4">
            <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5 sticky top-6">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">Order summary</p>
              <h2 className="text-sm font-bold text-near-black tracking-tight mb-4">Your launch</h2>

              <div className="border-t border-[rgba(18,18,18,0.08)] pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-text">Plan</span>
                  <span className="font-semibold text-near-black">BookReady</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Billing cycle</span>
                  <span className="font-semibold text-near-black">{selectedBilling.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Template</span>
                  <span className="font-semibold text-near-black">{selectedTemplate.label}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Annual savings</span>
                    <span className="font-semibold">−${savings}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[rgba(18,18,18,0.10)] mt-4 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-near-black">Total due today</span>
                  <span className="text-xl font-bold text-near-black">${total}</span>
                </div>
                <p className="text-[10px] text-muted-text mt-1">{selectedBilling.tagline}. Cancel anytime.</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-4 mt-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Redirecting to Stripe…' : 'Start BookReady →'}
              </button>

              <p className="text-[10px] text-muted-text text-center mt-3">
                Secure payment via Stripe · No setup fees
              </p>
              <p className="text-[10px] text-muted-text text-center mt-1.5">
                Subscription payments are processed by DaysGraphic LLC.
              </p>
            </section>

            {/* Trust strip */}
            <div className="grid grid-cols-3 border border-[rgba(18,18,18,0.10)] divide-x divide-[rgba(18,18,18,0.10)]">
              {[
                { icon: '🔒', text: 'Secure checkout' },
                { icon: '✕', text: 'Cancel anytime' },
                { icon: '✨', text: 'Launch-ready' },
              ].map(item => (
                <div key={item.text} className="bg-white p-3 text-center">
                  <div className="text-base mb-1">{item.icon}</div>
                  <p className="text-[9px] font-semibold text-muted-text leading-tight">{item.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
