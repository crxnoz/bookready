'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { resetPassword } from '@/lib/api'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <ResetInner />
    </Suspense>
  )
}

function ResetInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const token = sp?.get('token') ?? ''
  const email = sp?.get('email') ?? ''

  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [done,       setDone]       = useState(false)

  const tokenMissing = ! token || ! email

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(''); setLoading(true)
    try {
      await resetPassword({
        email,
        token,
        password,
        password_confirmation: confirm,
      })
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <p className={eyebrow}>Reset password</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Set a new password.
        </h1>
        {email && (
          <p className="text-sm text-muted-text">
            For <span className="font-semibold text-near-black">{email}</span>
          </p>
        )}
      </div>

      {tokenMissing ? (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          This reset link is incomplete. Request a new one from{' '}
          <Link href="/forgot-password" className="font-semibold underline">/forgot-password</Link>.
        </div>
      ) : done ? (
        <div className="px-4 py-4 bg-[rgba(20,140,80,0.06)] border border-[rgba(20,140,80,0.30)] text-[13px] text-[#0f6f3d]">
          <p className="font-semibold mb-1">Password updated.</p>
          <p className="text-[12px] text-[#0f6f3d]/85">Redirecting you to sign in…</p>
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
              <label className={labelCls}>New password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="Repeat your new password"
              />
            </div>
            <button type="submit" disabled={loading} className={submitCls}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}

      <p className="text-xs text-muted-text mt-6 text-center">
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
