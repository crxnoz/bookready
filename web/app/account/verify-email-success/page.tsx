import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Phase 4 — landing for the customer email-verification click.
 *
 * Server-side: EmailVerificationController::verify() redirects here
 * after stamping email_verified_at. Idempotent — clicking an
 * already-verified link still lands here.
 */
export default function CustomerVerifyEmailSuccessPage() {
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
          Your email is verified. You can now see and manage your bookings.
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
