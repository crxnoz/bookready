'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { register } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

const TEMPLATE_KEY = 'br_template'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateSlug = searchParams.get('template') ?? 'thefaderoom'

  const [form, setForm] = useState({
    owner_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    business_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  // Slug preview: lowercase letters and numbers only, no dashes
  const slugPreview = form.business_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await register({
        owner_name: form.owner_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        business_name: form.business_name,
      })
      setToken(res.token)
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      localStorage.setItem(TEMPLATE_KEY, templateSlug)
      router.push(`/checkout?template=${templateSlug}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-2">
          Start your booking website.
        </h1>
        <p className="text-sm text-muted-text leading-relaxed">
          Create your BookReady account and launch your client-ready booking site.
        </p>
        {templateSlug && templateSlug !== 'thefaderoom' && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[rgba(18,18,18,0.12)] text-[10px] font-bold tracking-[0.14em] uppercase text-near-black">
            Template: {templateSlug}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Your Name">
          <input
            type="text"
            required
            autoComplete="name"
            value={form.owner_name}
            onChange={set('owner_name')}
            className={inputCls}
            placeholder="Alex Carter"
          />
        </AuthField>

        <AuthField
          label="Business Name"
          hint={
            <span className="text-[10px] text-muted-text">
              Your site will be at{' '}
              <span className="font-semibold text-near-black">{slugPreview}.bkrdy.me</span>
            </span>
          }
        >
          <input
            type="text"
            required
            value={form.business_name}
            onChange={set('business_name')}
            className={inputCls}
            placeholder="The Fade Room"
          />
        </AuthField>

        <AuthField label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            placeholder="you@yourbusiness.com"
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
            className={inputCls}
            placeholder="Min. 8 characters"
          />
        </AuthField>

        <AuthField label="Confirm Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password_confirmation}
            onChange={set('password_confirmation')}
            className={inputCls}
            placeholder="Repeat your password"
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className={submitCls}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-[10px] text-center text-muted-text pt-1">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      {/* Footer link */}
      <p className="text-xs text-muted-text mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-near-black font-semibold underline underline-offset-2 hover:text-[#2a2a2a]">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function AuthField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-near-black mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'

const submitCls =
  'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-2 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
