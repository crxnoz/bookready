'use client'

/**
 * #160 — Owner "Check your inbox" waiting screen.
 *
 * Shown right after signup (email path; Google signups skip this
 * because Google has already verified the address). Polls /auth/me
 * every 5s for email_verified_at. Also listens for a localStorage
 * cross-tab signal from /auth/verify-email-success so when the user
 * clicks the link in their email (which opens a new tab), this tab
 * advances automatically without re-login.
 *
 * On verification, routes the owner onward to /checkout/trial — the
 * trial card-capture screen built in #155 Phase 2.
 *
 * "Use a different email" is a v1 follow-up. Today: a "Sign out + try
 * again" link gives them a clean restart if they typo'd the address.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MailCheck, Loader2, AlertCircle, CheckCircle, Send, RefreshCw, LogOut } from 'lucide-react'
import { getCurrentUser, resendVerificationEmail, verifyEmailCode, logout } from '@/lib/api'
import { clearAuth, isLoggedIn } from '@/lib/auth'

const VERIFY_SIGNAL_KEY = 'br_verified_at'
const POLL_INTERVAL_MS  = 5000

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail]   = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'verified' | 'error'>('pending')
  const [error, setError]   = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendOk, setResendOk]     = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  // A6 — code-entry state. Mirrors the password reset UX: 6-digit input,
  // submit, on success advance like the link path.
  const [code, setCode]             = useState('')
  const [codeBusy, setCodeBusy]     = useState(false)
  const [codeError, setCodeError]   = useState<string | null>(null)
  const advancingRef = useRef(false)

  // Single helper — checks /auth/me; advances if verified.
  const checkStatus = useCallback(async () => {
    if (advancingRef.current) return
    try {
      const u = await getCurrentUser()
      setEmail(u.email)
      if (u.email_verified_at) {
        advancingRef.current = true
        setStatus('verified')
        // Brief "Verified! Continue →" moment so the user sees what
        // happened, then follow the backend's redirect_url — usually
        // /editor/onboard now (signup-reorder), but could be any
        // later step if the user is mid-flow on a re-login.
        const next = u.redirect_url && u.redirect_url !== '/verify-email' ? u.redirect_url : '/editor/onboard'
        setTimeout(() => router.replace(next), 900)
      }
    } catch (e) {
      // If /auth/me 401s we lost the session — likely a stale page
      // after logout in another tab. Show a soft error + sign-in link.
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not check verification status.')
    }
  }, [router])

  // Boot: bounce out if already verified or signed out, then start polling.
  useEffect(() => {
    if (! isLoggedIn()) { router.replace('/login'); return }

    // Cross-tab signal. /auth/verify-email-success writes timestamp
    // here; any other open tab listening fires checkStatus + advances
    // without waiting for the 5-second poll tick.
    function onStorage(e: StorageEvent) {
      if (e.key === VERIFY_SIGNAL_KEY && e.newValue) {
        void checkStatus()
      }
    }
    window.addEventListener('storage', onStorage)

    void checkStatus()
    const id = setInterval(() => void checkStatus(), POLL_INTERVAL_MS)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(id)
    }
  }, [router, checkStatus])

  // A6 — submit the 6-digit code typed from the email. Same advance
  // path as the link click: brief "Verified!" moment, then onward.
  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    if (codeBusy || code.length !== 6) return
    setCodeBusy(true)
    setCodeError(null)
    try {
      const res = await verifyEmailCode(code)
      if (res.verified) {
        advancingRef.current = true
        setStatus('verified')
        setTimeout(() => router.replace('/checkout/trial'), 900)
      }
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : 'Could not verify the code. Try again.')
    } finally {
      setCodeBusy(false)
    }
  }

  async function handleResend() {
    setResendBusy(true)
    setResendOk(false)
    setError(null)
    try {
      await resendVerificationEmail()
      setResendOk(true)
      // Auto-clear the "sent" state after a few seconds so the button
      // doesn't get stuck on "Sent!" forever.
      setTimeout(() => setResendOk(false), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the email. Try again.')
    } finally {
      setResendBusy(false)
    }
  }

  async function handleSignOut() {
    setSignOutBusy(true)
    try { await logout() } catch { /* ignore — still want to clear local state */ }
    clearAuth()
    router.replace('/register')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[rgba(18,18,18,0.10)] p-8">
        {/* Icon + status */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            {status === 'verified' ? (
              <CheckCircle size={40} strokeWidth={1.5} className="text-[#1e7a3f]" />
            ) : status === 'error' ? (
              <AlertCircle size={40} strokeWidth={1.5} className="text-[#b42828]" />
            ) : (
              <MailCheck size={40} strokeWidth={1.5} className="text-near-black" />
            )}
          </div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
            {status === 'verified' ? 'Verified' : status === 'error' ? 'Hmm' : 'Check your inbox'}
          </p>
          <h1 className="text-[22px] font-bold text-near-black tracking-tight mb-2">
            {status === 'verified'
              ? <>You&rsquo;re in. <span className="italic">Continuing…</span></>
              : status === 'error'
                ? 'Something went wrong.'
                : <>Confirm your <span className="italic">email.</span></>}
          </h1>
          {status === 'pending' && (
            <p className="text-[13px] text-muted-text leading-relaxed">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-near-black break-all">
                {email || 'your email'}
              </span>. Enter it below — or click the link in the email
              if it&rsquo;s easier.
            </p>
          )}
          {status === 'verified' && (
            <p className="text-[13px] text-muted-text leading-relaxed">
              Email verified. Taking you to the next step…
            </p>
          )}
          {status === 'error' && error && (
            <p className="text-[13px] text-[#b42828] leading-relaxed">
              {error}
            </p>
          )}
        </div>

        {/* A6 — code entry form. Primary verification mechanism. The
            link-click + polling pipeline is still active below for
            users who prefer one-click, but this is the headline UX. */}
        {status === 'pending' && (
          <form onSubmit={handleSubmitCode} className="mb-5">
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2 text-center">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={e => {
                setCodeError(null)
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }}
              placeholder="••••••"
              className="w-full text-center text-[28px] font-bold tracking-[0.4em] py-3 px-3 bg-cream border border-[rgba(18,18,18,0.15)] focus:outline-none focus:border-near-black text-near-black placeholder:text-[#c4bcb6] font-mono mb-3"
              autoFocus
            />
            {codeError && (
              <p className="text-[11px] text-[#b42828] mb-3 text-center">{codeError}</p>
            )}
            <button
              type="submit"
              disabled={codeBusy || code.length !== 6}
              className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.10em] uppercase px-5 py-3 hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {codeBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              {codeBusy ? 'Verifying…' : 'Verify code'}
            </button>
          </form>
        )}

        {/* Or-divider above the link/resend path */}
        {status === 'pending' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">or use the link</span>
            <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
          </div>
        )}

        {/* Live polling indicator */}
        {status === 'pending' && (
          <div className="mb-5 flex items-center justify-center gap-2 text-[11px] text-muted-text">
            <Loader2 size={11} className="animate-spin" />
            <span>Waiting for the link click…</span>
          </div>
        )}

        {/* Resend control */}
        {status === 'pending' && (
          <>
            {resendOk ? (
              <div className="mb-4 px-4 py-3 bg-[rgba(20,140,80,0.06)] border border-[rgba(20,140,80,0.30)] text-[12px] text-[#0f6f3d] inline-flex items-center gap-2 w-full justify-center">
                <Send size={12} /> Sent. Check your inbox in a few seconds.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendBusy}
                className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.10em] uppercase px-5 py-3 hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {resendBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {resendBusy ? 'Sending…' : 'Resend email'}
              </button>
            )}
            {error && ! resendOk && (
              <p className="mt-3 text-[11px] text-[#b42828] text-center">{error}</p>
            )}
          </>
        )}

        {/* Sign-out restart — covers "wrong email" until #160 v2 ships
            a proper inline "change email" form. */}
        {status !== 'verified' && (
          <div className="mt-6 pt-5 border-t border-[rgba(18,18,18,0.08)] text-center">
            <p className="text-[11px] text-muted-text mb-2">
              Wrong email address?
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signOutBusy}
              className="text-[11px] font-semibold text-near-black hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            >
              <LogOut size={11} />
              {signOutBusy ? 'Signing out…' : 'Sign out and try again'}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="mt-5 text-[10px] text-muted-text/80 text-center leading-relaxed">
          Once you click the link in your email, this tab will continue automatically.
          You can close the inbox tab after — no need to come back here.
        </p>

        {/* Already-verified safety link in case auto-advance gets stuck */}
        {status === 'pending' && (
          <p className="mt-3 text-center">
            <Link href="/checkout/trial" className="text-[10px] text-muted-text/70 hover:text-near-black underline underline-offset-2">
              Already verified? Continue manually
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
