'use client'

/**
 * Signup redesign v2 — Step 3, business setup.
 *
 * Owner verified their email and arrived here from /auth/me's
 * redirect_url. Collects business name + optional tagline + business
 * type. Services auto-populate from a per-type registry; the user can
 * edit any field inline or just hit Continue. Aim: under 3 minutes,
 * usually under 1.
 *
 * On submit, stamps signup_drafts via POST /signup/business, then
 * follows the next redirect_url (normally /signup/website).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ChevronLeft, Sparkles, Scissors, Brush, Hand,
  Sparkle, Eye, Palette, LayoutGrid,
} from 'lucide-react'
import { isLoggedIn } from '@/lib/auth'
import {
  getCurrentUser, getSignupDraft, updateSignupBusiness,
  type SignupDraftState,
} from '@/lib/api'

interface ServiceRow {
  name: string
  price_cents: number
  duration_minutes: number
}

// Icon per business_type — visual cue on the picker. Keeps the page
// from feeling like a dropdown form.
const TYPE_ICONS: Record<string, typeof Scissors> = {
  barber:         Scissors,
  hair_salon:     Brush,
  spa:            Sparkle,
  nail_studio:    Hand,
  lash_studio:    Eye,
  tattoo_studio:  Palette,
  other:          LayoutGrid,
}

export default function SignupBusinessPage() {
  const router = useRouter()
  const [draft, setDraft]       = useState<SignupDraftState | null>(null)
  const [name, setName]         = useState('')
  const [tagline, setTagline]   = useState('')
  const [type, setType]         = useState<string>('')
  const [services, setServices] = useState<ServiceRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (! isLoggedIn()) { router.replace('/login'); return }
    // Pull the existing draft so resumes / refreshes don't lose
    // typed input. Also fetches the service_templates payload that
    // drives the auto-fill.
    getSignupDraft().then(d => {
      setDraft(d)
      setName(d.business_name ?? '')
      setTagline(d.tagline ?? '')
      setType(d.business_type ?? '')
      setServices(d.services ?? (d.business_type ? d.service_templates[d.business_type] : []))
    }).catch(() => setError('Could not load your draft. Refresh and try again.'))
  }, [router])

  // When the user picks (or changes) a business type, swap to the new
  // template defaults — UNLESS they've already edited services
  // manually (we don't want to overwrite their typing).
  function pickType(slug: string) {
    setType(slug)
    if (draft && (services.length === 0 || servicesMatchTemplate(services, draft, type))) {
      setServices(draft.service_templates[slug] ?? [])
    }
  }

  function updateService(idx: number, patch: Partial<ServiceRow>) {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  async function handleContinue() {
    if (submitting) return
    if (! name.trim() || ! type) {
      setError('Pick a business type and a name to continue.')
      return
    }
    setSubmitting(true); setError(null)
    try {
      await updateSignupBusiness({
        business_name: name.trim(),
        tagline: tagline.trim() || null,
        business_type: type,
        services: services.map(s => ({
          name: s.name.trim(),
          price_cents: Math.max(0, Math.round(s.price_cents)),
          duration_minutes: Math.max(5, Math.round(s.duration_minutes)),
        })),
      })
      // Backend redirect_url already advanced to /signup/website.
      const me = await getCurrentUser()
      router.replace(me.redirect_url || '/signup/website')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-7 h-7" />
          <span className="text-2xs font-bold tracking-[0.18em] uppercase text-near-black">BookReady</span>
        </div>
        <Link href="/login" className="text-xs text-muted-text hover:text-near-black inline-flex items-center gap-1">
          <ChevronLeft size={11} /> Sign out
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <p className="text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2 inline-flex items-center gap-1.5">
          <Sparkles size={11} /> Step 1 of 3
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-near-black tracking-tight mb-2">
          Tell us about your <span className="italic">business.</span>
        </h1>
        <p className="text-sm text-muted-text leading-relaxed max-w-lg mb-8">
          We will personalize your booking site with this. You can change everything later in the dashboard.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Business name */}
        <section className="mb-6">
          <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2">
            Business name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={submitting}
            placeholder="Fade House Barbershop"
            className="w-full px-3 py-2.5 bg-white border border-[rgba(18,18,18,0.15)] text-sm text-near-black focus:outline-none focus:border-near-black"
            autoFocus
          />
        </section>

        {/* Tagline */}
        <section className="mb-6">
          <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2">
            Tagline <span className="opacity-50 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            disabled={submitting}
            placeholder="Precision cuts & modern grooming"
            className="w-full px-3 py-2.5 bg-white border border-[rgba(18,18,18,0.15)] text-sm text-near-black focus:outline-none focus:border-near-black"
          />
        </section>

        {/* Business type */}
        <section className="mb-6">
          <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-3">
            Business type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {draft?.business_types?.map(t => {
              const Icon = TYPE_ICONS[t.slug] ?? LayoutGrid
              const isPicked = type === t.slug
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => pickType(t.slug)}
                  disabled={submitting}
                  className={`flex items-center gap-2.5 px-3 py-3 bg-white border transition-colors ${
                    isPicked
                      ? 'border-near-black ring-1 ring-near-black'
                      : 'border-[rgba(18,18,18,0.15)] hover:border-[rgba(18,18,18,0.30)]'
                  }`}
                >
                  <Icon size={16} className="text-near-black flex-shrink-0" />
                  <span className="text-sm text-near-black text-left">{t.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Services — auto-filled, editable inline */}
        {services.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text">
                Starter services
              </label>
              <span className="text-[10px] text-muted-text">Edit any field, or just continue</span>
            </div>
            <div className="bg-white border border-[rgba(18,18,18,0.10)]">
              {services.map((s, i) => (
                <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center ${i > 0 ? 'border-t border-[rgba(18,18,18,0.08)]' : ''}`}>
                  <input
                    type="text"
                    value={s.name}
                    onChange={e => updateService(i, { name: e.target.value })}
                    disabled={submitting}
                    className="col-span-6 sm:col-span-7 text-sm text-near-black bg-transparent border-b border-transparent focus:border-near-black focus:outline-none px-1"
                  />
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-0.5">
                    <span className="text-xs text-muted-text">$</span>
                    <input
                      type="number"
                      value={Math.round(s.price_cents / 100)}
                      onChange={e => updateService(i, { price_cents: parseInt(e.target.value || '0', 10) * 100 })}
                      disabled={submitting}
                      className="w-full text-sm text-near-black bg-transparent border-b border-transparent focus:border-near-black focus:outline-none px-1 text-right"
                      min={0}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-3 flex items-center gap-0.5 justify-end">
                    <input
                      type="number"
                      value={s.duration_minutes}
                      onChange={e => updateService(i, { duration_minutes: parseInt(e.target.value || '60', 10) })}
                      disabled={submitting}
                      className="w-full text-sm text-near-black bg-transparent border-b border-transparent focus:border-near-black focus:outline-none px-1 text-right"
                      min={5}
                    />
                    <span className="text-xs text-muted-text">min</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting || ! draft}
          className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.16em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Saving…' : 'Continue'}
        </button>

        <p className="text-[11px] text-muted-text mt-4 text-center leading-relaxed">
          Next: pick your URL and template.
        </p>
      </main>
    </div>
  )
}

// Returns true if the current services array still matches the
// template defaults for the OLD type — used to decide whether it's
// safe to overwrite on type-change.
function servicesMatchTemplate(services: ServiceRow[], draft: SignupDraftState, oldType: string): boolean {
  const tpl = draft.service_templates[oldType]
  if (! tpl || tpl.length !== services.length) return false
  for (let i = 0; i < tpl.length; i++) {
    if (services[i].name !== tpl[i].name) return false
    if (services[i].price_cents !== tpl[i].price_cents) return false
    if (services[i].duration_minutes !== tpl[i].duration_minutes) return false
  }
  return true
}
