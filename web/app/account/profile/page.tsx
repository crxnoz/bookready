'use client'

import { useEffect, useState } from 'react'
import {
  changeCustomerPassword,
  getCustomerProfile,
  updateCustomerEmail,
  updateCustomerProfile,
  type CustomerProfile,
} from '@/lib/customerApi'
import AccountShell from '@/components/account/AccountShell'

/**
 * Phase 4 — profile editor at /account/profile.
 *
 * Three independent forms in one page:
 *   1. Identity (name + phone) — single PATCH
 *   2. Email change — separate endpoint because it triggers re-verification
 *   3. Password change — separate endpoint, requires current-password
 *
 * Per-business preferences (preferred staff, allergy notes, VIP, tags)
 * stay owner-controlled in the per-tenant clients table. They are
 * intentionally NOT editable here — they're the business's CRM data
 * about the customer, not the customer's profile.
 */
export default function CustomerProfilePage() {
  return (
    <AccountShell>
      <Inner />
    </AccountShell>
  )
}

function Inner() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function reload() {
    setLoadError(null)
    try {
      setProfile(await getCustomerProfile())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load profile.')
    }
  }

  useEffect(() => { reload() }, [])

  if (loadError) {
    return (
      <div className="px-4 py-4 bg-red-50 border border-red-200 text-xs text-red-700">{loadError}</div>
    )
  }

  if (!profile) {
    return <p className="text-xs text-muted-text">Loading profile…</p>
  }

  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight mb-6">Profile</h1>

      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8 mb-6">
        <h2 className="text-base font-bold mb-1">Your details</h2>
        <p className="text-xs text-muted-text mb-5">
          Name and phone are visible to businesses you book with.
        </p>
        <IdentityForm profile={profile} onSaved={p => setProfile(p)} />
      </section>

      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8 mb-6">
        <h2 className="text-base font-bold mb-1">Email</h2>
        <p className="text-xs text-muted-text mb-5">
          Changing your email will require you to verify the new address before you can manage bookings again.
        </p>
        <EmailForm profile={profile} onSaved={p => setProfile(p)} />
      </section>

      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8">
        <h2 className="text-base font-bold mb-1">Password</h2>
        <p className="text-xs text-muted-text mb-5">
          Changing your password signs out other devices for security.
        </p>
        <PasswordForm />
      </section>
    </>
  )
}

function IdentityForm({ profile, onSaved }: { profile: CustomerProfile; onSaved: (p: CustomerProfile) => void }) {
  const [name, setName]   = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      const updated = await updateCustomerProfile({ name, phone: phone || null })
      onSaved(updated)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not save.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required maxLength={100} />
      </Field>
      <Field label="Phone (optional)">
        <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} maxLength={30} />
      </Field>
      <SaveBar status={status} idle="Save changes" />
    </form>
  )
}

function EmailForm({ profile, onSaved }: { profile: CustomerProfile; onSaved: (p: CustomerProfile) => void }) {
  const [email, setEmail] = useState(profile.email)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email === profile.email) return
    if (! confirm(`Change your email to ${email}? You'll need to verify the new address.`)) return
    setStatus('saving')
    setError(null)
    try {
      const updated = await updateCustomerEmail(email)
      onSaved(updated)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not save.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      <Field label="Email address">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required maxLength={255} />
        {profile.email_verified_at
          ? <p className="text-[11px] text-green-700 mt-1.5">Verified</p>
          : <p className="text-[11px] text-near-black mt-1.5">Not verified — check your inbox.</p>
        }
      </Field>
      <SaveBar status={status} idle="Update email" disabled={email === profile.email} />
    </form>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [status, setStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [revoked, setRevoked] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (next !== confirmPw) {
      setError('New passwords don’t match.')
      return
    }
    setStatus('saving')
    try {
      const res = await changeCustomerPassword({
        current_password:           current,
        new_password:               next,
        new_password_confirmation:  confirmPw,
      })
      setStatus('saved')
      setRevoked(res.revoked_count)
      setCurrent(''); setNext(''); setConfirmPw('')
      setTimeout(() => { setStatus('idle'); setRevoked(null) }, 3000)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Could not change password.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      {status === 'saved' && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-xs text-green-700">
          Password updated.{revoked !== null && revoked > 0 ? ` ${revoked} other session${revoked === 1 ? '' : 's'} signed out.` : ''}
        </div>
      )}
      <Field label="Current password">
        <input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={inputCls} />
      </Field>
      <Field label="New password">
        <input type="password" required autoComplete="new-password" minLength={8} value={next} onChange={e => setNext(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Confirm new password">
        <input type="password" required autoComplete="new-password" minLength={8} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} />
      </Field>
      <SaveBar status={status} idle="Change password" />
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SaveBar({ status, idle, disabled }: { status: 'idle' | 'saving' | 'saved' | 'error'; idle: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      {status === 'saved' && <span className="text-xs text-green-700">Saved</span>}
      <button
        type="submit"
        disabled={status === 'saving' || disabled}
        className="px-5 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase bg-near-black text-white hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'saving' ? 'Saving…' : idle}
      </button>
    </div>
  )
}

const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black transition-colors'
