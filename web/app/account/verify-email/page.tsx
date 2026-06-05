'use client'

/**
 * #160 — Customer "Check your inbox" waiting screen.
 *
 * Mirror of /verify-email (owner side) but consumes the customer-side
 * /customer/auth/me + /customer/auth/verify-email/resend endpoints
 * and lands on /account on success.
 *
 * Cross-tab signal: /account/verify-email-success sets
 * localStorage.br_verified_at; this tab listens for the storage event
 * and advances without waiting for the 5s poll tick.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MailCheck, Loader2, AlertCircle, CheckCircle, Send, RefreshCw, LogOut } from 'lucide-react'
import { customerMe, customerResendVerification, customerVerifyEmailCode, customerLogout } from '@/lib/customerApi'
import { clearCustomerAuth, isCustomerLoggedIn, safeReturnTo } from '@/lib/customerAuth'

const VERIFY_SIGNAL_KEY = 'br_verified_at'
const POLL_INTERVAL_MS  = 5000

export default function CustomerVerifyEmailPage() {
  // Suspense wrapper — useSearchParams in Inner() needs a boundary
  // for Next 14 static prerendering to succeed.
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = safeReturnTo(searchParams?.get('return_to'))

  const [email, setEmail]   = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'verified' | 'error'>('pending')
  const [error, setError]   = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendOk, setResendOk]     = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  // A6 — code-entry state. Same UX as the owner page.
  const [code, setCode]           = useState('')
  const [codeBusy, setCodeBusy]   = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const advancingRef = useRef(false)

  const checkStatus = useCallback(async () => {
    if (advancingRef.current) return
    try {
      const u = await customerMe()
      setEmail(u.email)
      if (u.email_verified_at) {
        advancingRef.current = true
        setStatus('verified')
        setTimeout(() => {
          // If a return_to was provided (cross-subdomain entry from a
          // tenant site), hard-nav back there. Else go to the account
          // dashboard.
          if (returnTo) { window.location.href = returnTo; return }
          router.replace('/account')
        }, 900)
      }
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not check verification status.')
    }
  }, [router, returnTo])

  useEffect(() => {
    if (! isCustomerLoggedIn()) {
      const next = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''
      router.replace(`/account/login${next}`)
      return
    }
    function onStorage(e: StorageEvent) {
      if (e.key === VERIFY_SIGNAL_KEY && e.newValue) void checkStatus()
    }
    window.addEventListener('storage', onStorage)
    void checkStatus()
    const id = setInterval(() => void checkStatus(), POLL_INTERVAL_MS)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(id)
    }
  }, [router, checkStatus, returnTo])

  // A6 — submit the 6-digit code. On success advance via the same path
  // checkStatus uses (return_to or /account).
  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    if (codeBusy || code.length !== 6) return
    setCodeBusy(true); setCodeError(null)
    try {
      const res = await customerVerifyEmailCode(code)
      if (res.verified) {
        advancingRef.current = true
        setStatus('verified')
        setTimeout(() => {
          if (returnTo) { window.location.href = returnTo; return }
          router.replace('/account')
        }, 900)
      }
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : 'Could not verify the code. Try again.')
    } finally {
      setCodeBusy(false)
    }
  }

  async function handleResend() {
    setResendBusy(true); setResendOk(false); setError(null)
    try {
      await customerResendVerification()
      setResendOk(true)
      setTimeout(() => setResendOk(false), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the email. Try again.')
    } finally {
      setResendBusy(false)
    }
  }

  async function handleSignOut() {
    setSignOutBusy(true)
    try { await customerLogout() } catch { /* ignore */ }
    clearCustomerAuth()
    router.replace('/account/register')
  }

  // Destination for the "Already verified? Continue manually" link.
  const manualNext = returnTo ?? '/account'

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[rgba(18,18,18,0.10)] p-8">
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
              Email verified. Taking you to your account…
            </p>
          )}
          {status === 'error' && error && (
            <p className="text-[13px] text-[#b42828] leading-relaxed">{error}</p>
          )}
        </div>

        {/* A6 — code entry form, mirrors the owner page. */}
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

        {status === 'pending' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">or use the link</span>
            <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
          </div>
        )}

        {status === 'pending' && (
          <div className="mb-5 flex items-center justify-center gap-2 text-[11px] text-muted-text">
            <Loader2 size={11} className="animate-spin" />
            <span>Waiting for the link click…</span>
          </div>
        )}

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

        {status !== 'verified' && (
          <div className="mt-6 pt-5 border-t border-[rgba(18,18,18,0.08)] text-center">
            <p className="text-[11px] text-muted-text mb-2">Wrong email address?</p>
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

        <p className="mt-5 text-[10px] text-muted-text/80 text-center leading-relaxed">
          Once you click the link in your email, this tab will continue automatically.
          You can close the inbox tab after — no need to come back here.
        </p>

        {status === 'pending' && (
          <p className="mt-3 text-center">
            <Link href={manualNext} className="text-[10px] text-muted-text/70 hover:text-near-black underline underline-offset-2">
              Already verified? Continue manually
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
