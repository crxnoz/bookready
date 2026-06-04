'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import { requestPasswordReset } from '@/lib/api'
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/auth/TurnstileWidget'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  // #161: Turnstile gate — forgot-password fires an email send + DB
  // write per request, so it's a great abuse target without CAPTCHA.
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const onTurnstileVerify = useCallback((t: string) => setTurnstileToken(t), [])
  const onTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (! turnstileToken) {
      setError('Please complete the verification check below.')
      return
    }
    setError(''); setLoading(true)
    try {
      await requestPasswordReset(email.trim(), turnstileToken)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
      // #161: Single-use token — reset for next attempt.
      setTurnstileToken('')
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <p className={eyebrow}>Forgot password</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Reset your password.
        </h1>
        <p className="text-sm text-muted-text">
          Enter the email on your BookReady account and we&rsquo;ll send a reset link.
        </p>
      </div>

      {submitted ? (
        <div className="px-4 py-4 bg-[rgba(20,140,80,0.06)] border border-[rgba(20,140,80,0.30)] text-[13px] text-[#0f6f3d]">
          <p className="font-semibold mb-1">Check your inbox.</p>
          <p className="text-[12px] text-[#0f6f3d]/85">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            The link works for 60 minutes.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@studio.com"
              />
            </div>
            <TurnstileWidget
              ref={turnstileRef}
              onVerify={onTurnstileVerify}
              onExpire={onTurnstileExpire}
            />
            <button type="submit" disabled={loading || !turnstileToken} className={submitCls}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}

      <p className="text-xs text-muted-text mt-6 text-center">
        Remembered it?{' '}
        <Link href="/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
