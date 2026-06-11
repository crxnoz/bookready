'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'
import { acceptStaffInvite } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Wave D — staff login bootstrap. The invite email links here with
 * ?token=...&tenant=.... The staff member sets a password; on success
 * the backend mints the same httpOnly Sanctum cookie as owner login and
 * returns the editor URL to land on (scoped to their own schedule).
 *
 * No EditorShell — this is a public auth surface, same shape as
 * /register/complete.
 */
export default function StaffAcceptInvitePage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <AcceptInner />
    </Suspense>
  )
}

function AcceptInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token  = searchParams.get('token') ?? ''
  const tenant = searchParams.get('tenant') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [error,    setError]      = useState('')
  const [loading,  setLoading]    = useState(false)

  // Missing token or tenant means a malformed / bookmarked link — show a
  // calm dead-end instead of a broken form.
  if (! token || ! tenant) {
    return (
      <AuthShell>
        <div className="mb-6">
          <p className={eyebrow}>Staff login</p>
          <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
            This link looks incomplete.
          </h1>
          <p className="text-sm text-muted-text">
            Open the most recent invite email and tap the button again, or ask
            the business owner to resend your invite.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase px-6 py-3 hover:bg-[#2a2a2a] transition-colors"
        >
          Go to sign in
        </Link>
      </AuthShell>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await acceptStaffInvite({ token, tenant, password })
      // Server already set the httpOnly session cookie. Mirror owner login:
      // flip the local "logged in" + tenant flags so the editor guard lets
      // the staff member straight through.
      setToken()
      if (res.user?.tenant_id) setTenantId(res.user.tenant_id)
      router.push(res.redirect_url || '/editor/appointments?scope=mine')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not finish setting up your login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>Staff login</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Set your password
        </h1>
        <p className="text-sm text-muted-text">
          Choose a password to finish setting up your account. You will use it
          to sign in and manage your own schedule.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-danger-bg border border-danger/30 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Password</label>
          <input
            type="password"
            required
            autoFocus
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className={labelCls}>Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={inputCls}
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || ! password || ! confirm}
          className={submitCls}
        >
          {loading
            ? <span className="inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Setting up…</span>
            : <span className="inline-flex items-center gap-2"><KeyRound size={13} /> Set password and sign in</span>
          }
        </button>
      </form>

      <p className="text-xs text-muted-text mt-6 text-center">
        Already set up?{' '}
        <Link href="/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

const eyebrow  = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
