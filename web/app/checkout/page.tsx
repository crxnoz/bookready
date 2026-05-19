'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: 'mo',
    features: [
      'Public booking site',
      'Unlimited services',
      'Up to 3 staff profiles',
      'Gallery & policies',
      'Email notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    period: 'mo',
    popular: true,
    features: [
      'Everything in Starter',
      'Unlimited staff',
      'Custom domain',
      'SMS reminders',
      'Analytics dashboard',
      'Priority support',
    ],
  },
]

export default function CheckoutPage() {
  const [selected, setSelected] = useState('pro')
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      // TODO: call Stripe checkout session endpoint
      // const { url } = await createCheckoutSession(selected)
      // window.location.href = url
      console.log('checkout', selected)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-near-black tracking-tight mb-2">
            Choose your plan
          </h1>
          <p className="text-sm text-muted-text">
            Start free for 14 days. No credit card required.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full text-left border p-5 transition-all ${
                selected === plan.id
                  ? 'border-near-black bg-white'
                  : 'border-[rgba(18,18,18,0.12)] bg-white/60 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-near-black">{plan.name}</span>
                    {plan.popular && (
                      <span className="text-[9px] font-bold tracking-[0.15em] uppercase bg-near-black text-white px-2 py-0.5">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 mt-3">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-text">
                        <Check size={11} className="text-near-black flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xl font-bold text-near-black">${plan.price}</span>
                  <span className="text-xs text-muted-text">/{plan.period}</span>
                </div>
              </div>

              <div
                className={`mt-4 w-full h-0.5 transition-colors ${
                  selected === plan.id ? 'bg-near-black' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting…' : 'Start Free Trial →'}
        </button>

        <p className="text-center text-[10px] text-muted-text mt-4">
          Cancel anytime. Billed monthly after trial ends.
        </p>

        <p className="text-center text-xs text-muted-text mt-6">
          <Link href="/login" className="underline underline-offset-2">
            Already have an account?
          </Link>
        </p>
      </div>
    </div>
  )
}
