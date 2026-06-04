'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'

const VERIFY_SIGNAL_KEY = 'br_verified_at'

/**
 * Phase 4 — landing for the customer email-verification click.
 *
 * Server-side: EmailVerificationController::verify() redirects here
 * after stamping email_verified_at. Idempotent — clicking an
 * already-verified link still lands here.
 *
 * #160 — fires a cross-tab localStorage signal so the customer
 * /account/verify-email waiting screen in another tab advances
 * automatically without the user needing to refresh or come back here.
 */
export default function CustomerVerifyEmailSuccessPage() {
  useEffect(() => {
    try { localStorage.setItem(VERIFY_SIGNAL_KEY, String(Date.now())) }
    catch { /* localStorage disabled, no-op */ }
  }, [])

  return (
    <AuthShell>
      <div className="mb-6">
        <p className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
          Email verified
        </p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          You&rsquo;re all set
        </h1>
        <p className="text-sm text-muted-text">
          Your email is verified. If you have another tab open on the verification
          screen, it should move on automatically.
        </p>
      </div>

      <Link
        href="/account"
        className="block w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 text-center hover:bg-[#2a2a2a] transition-colors"
      >
        Go to my account
      </Link>
    </AuthShell>
  )
}
