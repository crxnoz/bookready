'use client'

import { useState } from 'react'
import Link from 'next/link'
import { register } from '@/lib/api'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    slug: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm(prev => {
        const next = { ...prev, [key]: value }
        // Auto-derive slug from business name
        if (key === 'businessName') {
          next.slug = value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
        }
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        business_name: form.businessName,
        slug: form.slug,
      })
      // TODO: store token, redirect to checkout
      console.log('register success', res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-8">
          <h1 className="text-xl font-bold text-near-black tracking-tight mb-1">
            Create your site
          </h1>
          <p className="text-xs text-muted-text mb-7">
            Get your booking page live in minutes.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Your Name">
              <input
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                className={inputCls}
                placeholder="Alex Carter"
              />
            </Field>

            <Field label="Business Name">
              <input
                type="text"
                required
                value={form.businessName}
                onChange={set('businessName')}
                className={inputCls}
                placeholder="The Fade Room"
              />
            </Field>

            <Field
              label="Your URL"
              hint={form.slug ? `${form.slug}.bookready.app` : 'Auto-generated from name'}
            >
              <div className="flex items-center border border-[rgba(18,18,18,0.15)] bg-cream">
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={set('slug')}
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f] focus:outline-none"
                  placeholder="the-fade-room"
                />
                <span className="pr-3 text-xs text-muted-text whitespace-nowrap">.bookready.app</span>
              </div>
            </Field>

            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                className={inputCls}
                placeholder="you@yourbusiness.com"
              />
            </Field>

            <Field label="Password">
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
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 mt-2 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>

            <p className="text-[10px] text-center text-muted-text pt-1">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-muted-text mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-near-black font-semibold underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-cream border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:ring-2 focus:ring-near-black/10'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-near-black mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-text">{hint}</p>}
    </div>
  )
}
