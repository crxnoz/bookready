'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getCheckoutSession } from '@/lib/api'
import { CheckoutSessionData } from '@/lib/types'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [session, setSession] = useState<CheckoutSessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }
    getCheckoutSession(sessionId)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [sessionId])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-8 text-center">
          {/* Checkmark */}
          <div className="w-12 h-12 bg-near-black flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11L9 16L18 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-near-black tracking-tight mb-2">
            Payment received.
          </h1>
          <p className="text-sm text-muted-text mb-6">
            We&apos;re setting up your workspace. Head to the editor to get started.
          </p>

          {/* Session details */}
          {loading && (
            <p className="text-xs text-muted-text mb-6">Confirming payment…</p>
          )}

          {!loading && session && (
            <div className="text-left bg-cream p-4 mb-6 space-y-2">
              <Detail label="Status" value={session.status} />
              <Detail label="Payment" value={session.payment_status} />
              {session.subscription && (
                <Detail label="Subscription" value={session.subscription} mono />
              )}
            </div>
          )}

          {/* TODO: Webhook handler (checkout.session.completed) will activate the
              subscription reliably. This page is confirmation-only. */}

          {/* #155/#157 — route to /editor which auto-redirects new
              tenants to /editor/onboard (the wizard). Old path was
              /editor/website?tab=business which conflicted with the
              wizard-first design. */}
          <Link
            href="/editor"
            className="block w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors text-center"
          >
            Set up your site →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-text">{label}</span>
      <span className={`font-semibold text-near-black ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
