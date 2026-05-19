'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCheckoutSession } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { BillingCycle } from '@/lib/types'

const TEMPLATE_KEY = 'br_template'

const TEMPLATES = [
  { slug: 'thefaderoom',  label: 'The Fade Room',  desc: 'Dark, moody, premium barbershop' },
  { slug: 'lushstudio',   label: 'Lush Studio',    desc: 'Clean, feminine salon aesthetic' },
  { slug: 'cleanbeauty',  label: 'Clean Beauty',   desc: 'Minimal, spa-inspired look' },
]

const BILLING: {
  id: BillingCycle
  label: string
  monthly: number
  tagline: string
  badge?: string
}[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    monthly: 25,
    tagline: 'Billed $25 every month',
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    monthly: 22,
    tagline: 'Billed $66 every 3 months',
  },
  {
    id: 'annual',
    label: 'Annual',
    monthly: 17,
    tagline: 'Billed $204 yearly',
    badge: 'Best Value',
  },
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
    // Token guard
    if (!getToken()) {
      router.replace('/login')
      return
    }
    // Read template from query param first, then localStorage fallback
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

  return (
    <div className="min-h-screen bg-cream px-4 py-12">
      <div className="max-w-lg mx-auto space-y-8">

        {/* Wordmark */}
        <div className="text-center">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight mb-1">
            Almost there
          </h1>
          <p className="text-sm text-muted-text">Choose your template and billing cycle.</p>
        </div>

        {cancelled && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Your payment was cancelled. You can try again below.
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Template selector */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
            Selected Template
          </p>
          <div className="space-y-2">
            {TEMPLATES.map(t => (
              <button
                key={t.slug}
                onClick={() => selectTemplate(t.slug)}
                className={`w-full text-left flex items-center gap-4 px-4 py-3 border transition-colors ${
                  template === t.slug
                    ? 'border-near-black bg-white'
                    : 'border-[rgba(18,18,18,0.10)] bg-white/60 hover:bg-white'
                }`}
              >
                {/* Swatch */}
                <div
                  className={`w-8 h-8 flex-shrink-0 ${
                    t.slug === 'thefaderoom'
                      ? 'bg-[#0A0A0A]'
                      : t.slug === 'lushstudio'
                      ? 'bg-[#F3E8F0]'
                      : 'bg-[#F8F8F6]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-near-black">{t.label}</p>
                  <p className="text-xs text-muted-text">{t.desc}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    template === t.slug
                      ? 'border-near-black bg-near-black'
                      : 'border-[rgba(18,18,18,0.20)]'
                  }`}
                />
              </button>
            ))}
          </div>
        </section>

        {/* Billing cycle */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
            Billing Cycle
          </p>
          <div className="space-y-2">
            {BILLING.map(b => (
              <button
                key={b.id}
                onClick={() => setBilling(b.id)}
                className={`w-full text-left flex items-center gap-4 px-4 py-3.5 border transition-colors ${
                  billing === b.id
                    ? 'border-near-black bg-white'
                    : 'border-[rgba(18,18,18,0.10)] bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-near-black">{b.label}</span>
                    {b.badge && (
                      <span className="text-[9px] font-bold tracking-[0.15em] uppercase bg-near-black text-white px-1.5 py-0.5">
                        {b.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-text">{b.tagline}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-lg font-bold text-near-black">${b.monthly}</span>
                  <span className="text-xs text-muted-text">/mo</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Order summary */}
        <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-4">
            Order Summary
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-text">Template</span>
              <span className="font-semibold text-near-black">{selectedTemplate.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-text">Billing</span>
              <span className="font-semibold text-near-black">{selectedBilling.label}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[rgba(18,18,18,0.08)]">
              <span className="text-muted-text">Price</span>
              <span className="font-bold text-near-black">
                ${selectedBilling.monthly}/mo
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-text mt-3">{selectedBilling.tagline}. Cancel anytime.</p>
        </section>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting to Stripe…' : 'Start BookReady →'}
        </button>

        <p className="text-center text-[10px] text-muted-text -mt-4">
          Secure payment via Stripe. You won&apos;t be charged until after checkout.
        </p>
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
