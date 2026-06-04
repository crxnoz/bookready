'use client'

/**
 * #160 — Owner verify-email success landing page.
 *
 * Backend redirects here after a successful click on the link in the
 * inbox. The verification work happened on the backend already; this
 * page just (a) fires a cross-tab signal so the /verify-email waiting
 * screen in another tab advances automatically, and (b) confirms the
 * verification so the user can close this tab or click through.
 */

import Link from 'next/link'
import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

const VERIFY_SIGNAL_KEY = 'br_verified_at'

export default function VerifyEmailSuccessPage() {
  // Fire the cross-tab signal. The owner waiting screen at /verify-email
  // listens for a storage event on this key and advances onward when
  // it sees a fresh timestamp.
  useEffect(() => {
    try { localStorage.setItem(VERIFY_SIGNAL_KEY, String(Date.now())) }
    catch { /* localStorage disabled, no-op */ }
  }, [])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[rgba(18,18,18,0.10)] p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-[#1e7a3f]">
          <CheckCircle size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-[20px] font-bold text-near-black tracking-tight mb-2">
          Email verified
        </h1>
        <p className="text-[13px] text-muted-text leading-relaxed mb-6">
          Thanks for confirming your email. If you have another tab open
          on the verification screen, it should move on automatically.
        </p>
        <Link
          href="/editor"
          className="inline-block bg-near-black text-white text-[12px] font-bold tracking-[0.10em] uppercase px-5 py-3 hover:opacity-90"
        >
          Continue to dashboard
        </Link>
      </div>
    </div>
  )
}
