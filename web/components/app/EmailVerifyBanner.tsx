'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getCurrentUser, resendVerificationEmail } from '@/lib/api'

// Phase S6 part 2 — non-blocking banner that nags unverified owners to
// click the verify link in their inbox. We don't gate features on it
// (the user is paying and shouldn't be locked out for a bounced email),
// but we do remind them on every editor page until they confirm.
//
// Banner suppresses itself until the cookie session resolves so we
// don't flash an empty state then a banner. If /auth/me fails (logged
// out, etc.) we silently render nothing — auth guards handle that.

export default function EmailVerifyBanner() {
  const [verified, setVerified] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUser()
      .then(user => {
        if (cancelled) return
        setVerified(user.email_verified_at != null)
      })
      .catch(() => {
        if (cancelled) return
        // Treat unknown as "don't show banner" — covers logged-out
        // screens that AppShell happens to wrap.
        setVerified(true)
      })
    return () => { cancelled = true }
  }, [])

  async function handleResend() {
    setBusy(true); setErr(null)
    try {
      await resendVerificationEmail()
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send. Try again later.')
    } finally {
      setBusy(false)
    }
  }

  if (verified !== false) return null

  return (
    <div className="bg-[#fff8e6] border-b border-[#f1d486] px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle size={14} className="text-warning flex-shrink-0" />
      <p className="text-xs text-[#5a4500] leading-snug flex-1 min-w-0">
        <strong className="font-bold">Verify your email</strong>.{' '}
        We sent a link when you signed up.{' '}
        {sent
          ? <span className="text-[#3d6b16]">Sent. Check your inbox.</span>
          : err
            ? <span className="text-[#7a1f1f]">{err}</span>
            : null}
      </p>
      {! sent && (
        <button
          type="button"
          onClick={handleResend}
          disabled={busy}
          className="text-2xs font-bold tracking-[0.10em] uppercase text-[#5a4500] underline underline-offset-2 disabled:opacity-50 flex-shrink-0"
        >
          {busy ? 'Sending…' : 'Resend'}
        </button>
      )}
    </div>
  )
}
