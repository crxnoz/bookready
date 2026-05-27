'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { claimPreview, claimBooking, type ClaimPreview } from '@/lib/customerApi'
import { setCustomerLoggedIn } from '@/lib/customerAuth'
import AuthShell from '@/components/auth/AuthShell'

/**
 * Phase 4 — landing page for the "Save this booking" link in the
 * confirmation email.
 *
 * Two states:
 *
 *   1. Preview fetched, no account exists yet:
 *      Render a register-like form with the email shown as already
 *      verified. Submitting POSTs /customer/claim which creates the
 *      account + links every matching clients row across tenants.
 *
 *   2. Preview fetched, account already exists for this email:
 *      Soft-redirect to /account/login with a banner explaining the
 *      booking will auto-link on next sign-in (it doesn't actually
 *      auto-link in v1 — see Phase 2 ClaimController, where the
 *      account_exists case returns 409 with code=account_exists).
 *      For now we just route the user to sign in; the next booking
 *      they make while authed will link via PublicBookingController.
 *
 * Token validation is server-side; the GET preview returns 410 if the
 * token is invalid/expired and we surface that as an error state.
 */
export default function CustomerClaimPage() {
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

  const [preview, setPreview] = useState<ClaimPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setPreviewError('Missing save-booking token. The link in your email may have been truncated — try copying the full URL.')
      setLoadingPreview(false)
      return
    }
    let cancelled = false
    claimPreview(token)
      .then(p => { if (!cancelled) setPreview(p) })
      .catch(e => { if (!cancelled) setPreviewError(e instanceof Error ? e.message : 'Invalid link.') })
      .finally(() => { if (!cancelled) setLoadingPreview(false) })
    return () => { cancelled = true }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setSubmitting(true)
    try {
      await claimBooking({
        token,
        password,
        password_confirmation: confirm,
        name: name || undefined,
      })
      setCustomerLoggedIn()
      router.push('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPreview) {
    return <AuthShell><p className="text-xs text-muted-text">Checking your link…</p></AuthShell>
  }

  if (previewError || !preview) {
    return (
      <AuthShell>
        <div className="mb-6">
          <p className={eyebrow}>Save this booking</p>
          <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
            Link expired
          </h1>
          <p className="text-sm text-muted-text">
            {previewError || 'This save-booking link is invalid or has expired.'}
          </p>
        </div>
        <Link href="/account/register" className={submitCls + ' text-center inline-block'}>
          Create an account instead
        </Link>
        <p className="text-xs text-muted-text mt-6 text-center">
          Already have an account?{' '}
          <Link href="/account/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
            Sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (preview.already_account) {
    return (
      <AuthShell>
        <div className="mb-6">
          <p className={eyebrow}>Save this booking</p>
          <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
            You already have an account
          </h1>
          <p className="text-sm text-muted-text">
            We found a BookReady account for <strong>{preview.email}</strong>. Sign in to see your bookings.
          </p>
        </div>
        <Link href="/account/login" className={submitCls + ' text-center inline-block'}>
          Sign in
        </Link>
        <p className="text-xs text-muted-text mt-6 text-center">
          Forgot your password?{' '}
          <Link href="/account/forgot-password" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
            Reset it
          </Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <p className={eyebrow}>Save this booking</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Save your booking
        </h1>
        <p className="text-sm text-muted-text">
          Set a password and we&rsquo;ll save this booking — and any future ones — to your free BookReady account.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            disabled
            value={preview.email}
            className={inputCls + ' opacity-70 cursor-not-allowed'}
          />
          <p className="text-[10px] text-muted-text mt-1.5">
            Verified by clicking the link in your email.
          </p>
        </Field>

        <Field label="Your name">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </Field>

        <Field label="Password">
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

        <Field label="Confirm password">
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

        <button type="submit" disabled={submitting} className={submitCls}>
          {submitting ? 'Saving…' : 'Save booking + create account'}
        </button>
      </form>

      <p className="text-xs text-muted-text mt-6 text-center">
        <Link href="/account/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          I already have an account
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
