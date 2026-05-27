'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { customerResetPassword } from '@/lib/customerApi'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Phase 4 — landing page for the password-reset email link.
 *
 * Expects ?token=X&email=Y in the URL (the link the backend put in
 * CustomerPasswordResetMail). On success, bounces to /account/login —
 * we deliberately don't auto-sign-in since /reset already revoked all
 * Sanctum tokens for this customer.
 */
export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params?.get('token') ?? ''
  const email = params?.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token || !email) {
      setError('This reset link is invalid or has expired.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setLoading(true)
    try {
      await customerResetPassword({
        email,
        token,
        password,
        password_confirmation: confirm,
      })
      setDone(true)
      // Brief pause so the success message is visible before redirect.
      setTimeout(() => router.push('/account/login'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <p className={eyebrow}>Reset password</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Set a new password
        </h1>
        <p className="text-sm text-muted-text">
          {email ? <>For <strong>{email}</strong>.</> : 'Enter your new password below.'}
        </p>
      </div>

      {done ? (
        <div className="px-4 py-4 bg-green-50 border border-green-200 text-xs text-green-700 leading-relaxed">
          Password updated. Redirecting you to sign in…
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="New password">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="Re-enter password"
              />
            </Field>
            <button type="submit" disabled={loading} className={submitCls}>
              {loading ? 'Updating…' : 'Update password'}
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
