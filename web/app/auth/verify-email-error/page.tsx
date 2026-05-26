import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

// Phase S6 part 2 — backend redirects here when the signed verification
// URL is invalid or expired. We surface the reason from the query string
// so the user knows whether to ask for a fresh link or get support.

export const metadata = {
  title: 'Email verification failed — BookReady',
}

export default function VerifyEmailErrorPage({
  searchParams,
}: {
  searchParams?: { reason?: string }
}) {
  const reason = searchParams?.reason
  const explanation =
    reason === 'expired'
      ? 'This verification link expired. Sign in and request a new one from your dashboard.'
      : 'This verification link is invalid. Sign in and request a new one from your dashboard.'

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[rgba(18,18,18,0.10)] p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-[#b42828]">
          <AlertCircle size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-[20px] font-bold text-near-black tracking-tight mb-2">
          Verification didn&rsquo;t go through
        </h1>
        <p className="text-[13px] text-muted-text leading-relaxed mb-6">
          {explanation}
        </p>
        <Link
          href="/login"
          className="inline-block bg-near-black text-white text-[12px] font-bold tracking-[0.10em] uppercase px-5 py-3 hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
