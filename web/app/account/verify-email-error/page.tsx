'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Phase 4 — error landing for the customer email-verification click.
 *
 * Server-side: EmailVerificationController::verify() redirects here
 * with ?reason=expired or ?reason=invalid when the link fails
 * validation (bad signature, expired, email-fingerprint mismatch
 * because the customer changed email after the link was minted, etc.).
 *
 * The right next step is "sign in and request a fresh link from the
 * dashboard." We surface that path here.
 */
export default function CustomerVerifyEmailErrorPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const params = useSearchParams()
  const reason = params?.get('reason') ?? 'invalid'
  const isExpired = reason === 'expired'

  return (
    <AuthShell>
      <div className="mb-6">
        <p className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
          Verification failed
        </p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          {isExpired ? 'Link expired' : 'Link invalid'}
        </h1>
        <p className="text-sm text-muted-text">
          {isExpired
            ? 'Verification links are valid for 24 hours. Sign in and request a fresh one from your dashboard.'
            : 'This verification link is invalid. Sign in and request a fresh one from your dashboard.'}
        </p>
      </div>

      <Link
        href="/account/login"
        className="block w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 text-center hover:bg-[#2a2a2a] transition-colors"
      >
        Sign in to request a new link
      </Link>

      <p className="text-xs text-muted-text mt-6 text-center">
        Need help?{' '}
        <a href="mailto:hello@mybookready.com" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Contact support
        </a>
      </p>
    </AuthShell>
  )
}
