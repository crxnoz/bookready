'use client'

/**
 * Signup redesign v2 — Step 4, website setup.
 *
 * Subdomain picker with live availability + template gallery. On
 * submit, POST /signup/website provisions the tenant + DB + seeds
 * business_profiles + services from the draft.
 *
 * The most visually exciting step. Template cards are large and
 * inviting — this is the moment the owner SEES their site take shape.
 *
 * Important UX: provisioning takes a couple seconds (DB create +
 * migrations + seed). Show a "Building your site…" overlay rather
 * than leaving the button spinning silently — the wait is more
 * tolerable when it feels purposeful.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, ChevronLeft, CheckCircle2, X, Globe, Sparkles } from 'lucide-react'
import { isLoggedIn } from '@/lib/auth'
import {
  getCurrentUser, getSignupDraft, checkSignupSubdomain, updateSignupWebsite,
  type SignupDraftState,
} from '@/lib/api'
import { SITE_TEMPLATES } from '@/lib/templates'

type Availability = 'unknown' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid'

const APP_BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || 'bkrdy.me'

export default function SignupWebsitePage() {
  const router = useRouter()
  const [draft, setDraft]   = useState<SignupDraftState | null>(null)
  const [slug, setSlug]     = useState('')
  const [template, setTemplate] = useState<string>('thefaderoom')
  const [availability, setAvailability] = useState<Availability>('unknown')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (! isLoggedIn()) { router.replace('/login'); return }
    getSignupDraft().then(d => {
      setDraft(d)
      // Auto-suggest a slug from the business name on first arrival,
      // but only if the user hasn't already picked one.
      if (! d.selected_subdomain && d.business_name) {
        setSlug(slugify(d.business_name))
      } else if (d.selected_subdomain) {
        setSlug(d.selected_subdomain)
      }
      if (d.selected_template) setTemplate(d.selected_template)
    }).catch(() => setError('Could not load your draft. Refresh and try again.'))
  }, [router])

  // Debounced availability check — fires 400ms after the last keystroke.
  useEffect(() => {
    if (! slug) { setAvailability('unknown'); return }
    setAvailability('checking')
    const tid = setTimeout(async () => {
      try {
        const res = await checkSignupSubdomain(slug)
        setAvailability(res.available ? 'available' : (res.reason ?? 'taken'))
      } catch {
        setAvailability('unknown')
      }
    }, 400)
    return () => clearTimeout(tid)
  }, [slug])

  async function handleContinue() {
    if (submitting) return
    if (availability !== 'available') {
      setError('Pick an available website address before continuing.')
      return
    }
    setSubmitting(true); setError(null)
    try {
      await updateSignupWebsite({ subdomain: slug, template })
      const me = await getCurrentUser()
      router.replace(me.redirect_url || '/checkout/plan')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your site. Try again.')
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
        <Link href="/signup/business" className="text-xs text-muted-text hover:text-near-black inline-flex items-center gap-1">
          <ChevronLeft size={11} /> Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <p className="text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2 inline-flex items-center gap-1.5">
          <Sparkles size={11} /> Step 2 of 3
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-near-black tracking-tight mb-2">
          Pick your <span className="italic">URL and look.</span>
        </h1>
        <p className="text-sm text-muted-text leading-relaxed max-w-xl mb-8">
          Your customers will book here. You can switch templates later in your editor.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Subdomain picker */}
        <section className="mb-8">
          <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-2">
            Website address
          </label>
          <div className="flex items-stretch border border-[rgba(18,18,18,0.15)] bg-white">
            <div className="px-3 flex items-center bg-cream border-r border-[rgba(18,18,18,0.10)]">
              <Globe size={14} className="text-muted-text" />
            </div>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              disabled={submitting}
              placeholder="fadehouse"
              maxLength={30}
              className="flex-1 px-3 py-3 bg-white text-base text-near-black focus:outline-none"
            />
            <div className="px-3 flex items-center text-sm text-muted-text bg-cream border-l border-[rgba(18,18,18,0.10)]">
              .{APP_BASE_DOMAIN}
            </div>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5 h-4">
            {availability === 'checking' && <><Loader2 size={11} className="animate-spin text-muted-text" /><span className="text-muted-text">Checking…</span></>}
            {availability === 'available' && <><CheckCircle2 size={11} className="text-emerald-600" /><span className="text-emerald-700">Available</span></>}
            {availability === 'taken' && <><X size={11} className="text-red-600" /><span className="text-red-700">Already taken — try another</span></>}
            {availability === 'reserved' && <><X size={11} className="text-red-600" /><span className="text-red-700">Reserved by BookReady</span></>}
            {availability === 'invalid' && <><X size={11} className="text-red-600" /><span className="text-red-700">3–30 chars, letters / numbers / hyphens</span></>}
          </div>
        </section>

        {/* Template picker */}
        <section className="mb-8">
          <label className="block text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text mb-3">
            Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SITE_TEMPLATES.map(t => {
              const isPicked = template === t.slug
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setTemplate(t.slug)}
                  disabled={submitting}
                  aria-pressed={isPicked}
                  className={`relative flex flex-col text-left bg-white border transition-colors overflow-hidden ${
                    isPicked
                      ? 'border-near-black ring-1 ring-near-black'
                      : 'border-[rgba(18,18,18,0.15)] hover:border-[rgba(18,18,18,0.30)]'
                  }`}
                >
                  <div
                    className="w-full aspect-[4/3] flex items-center justify-center"
                    style={{ background: t.color }}
                  >
                    <span className="text-base font-bold text-white drop-shadow-sm tracking-tight">
                      {t.label}
                    </span>
                  </div>
                  <div className="px-3 py-2.5 border-t border-[rgba(18,18,18,0.06)]">
                    <p className="text-2xs text-muted-text leading-relaxed">{t.desc}</p>
                  </div>
                  {isPicked && (
                    <span className="absolute top-2 right-2 bg-near-black text-white text-2xs font-bold tracking-[0.10em] uppercase px-1.5 py-0.5">
                      Selected
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting || availability !== 'available'}
          className="w-full bg-near-black text-white text-[12px] font-bold tracking-[0.16em] uppercase py-4 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Building your site…' : 'Continue'}
        </button>

        <p className="text-[11px] text-muted-text mt-4 text-center leading-relaxed">
          Next: pick how you want to be billed.
        </p>
      </main>

      {submitting && (
        <div className="fixed inset-0 bg-cream/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-[rgba(18,18,18,0.15)] px-8 py-10 max-w-sm text-center">
            <Loader2 size={28} className="animate-spin text-near-black mx-auto mb-4" />
            <p className="text-base font-bold text-near-black mb-1">Building your site…</p>
            <p className="text-xs text-muted-text">Reserving {slug}.{APP_BASE_DOMAIN}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}
