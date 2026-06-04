'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { customerForgotPassword } from '@/lib/customerApi'
import AuthShell from '@/components/auth/AuthShell'
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/auth/TurnstileWidget'

/**
 * Phase 4 — forgot-password entry for customer accounts.
 *
 * Backend response is generic regardless of whether the email exists
 * (no enumeration oracle), so the success copy here doesn't claim
 * we found the account — just that "if it exists, a link is on its way."
 */
export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // #161: Turnstile CAPTCHA — same gate as owner forgot-password.
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
    setError('')
    setLoading(true)
    try {
      await customerForgotPassword(email, turnstileToken)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setTurnstileToken('')
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <p className={eyebrow}>Reset password</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-text">
          Enter your email and we&rsquo;ll send you a link to reset it.
        </p>
      </div>

      {submitted ? (
        <div className="px-4 py-4 bg-green-50 border border-green-200 text-xs text-green-700 leading-relaxed">
          If a BookReady account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </Field>
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
        <Link href="/account/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

const eyebrow  = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
