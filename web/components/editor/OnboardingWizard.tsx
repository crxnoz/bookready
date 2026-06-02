'use client'

/**
 * #130 — post-signup onboarding wizard.
 *
 * A focused, full-screen 5-step flow the dashboard redirects brand-new
 * tenants into. It curates the starter content seeded at provision time
 * (#133) rather than starting from a blank slate: the business profile,
 * services, hours, and policies all pre-fill from the seed, and the owner
 * edits/replaces them. Stripe is the final, skippable step.
 *
 * Every step saves through the existing editor APIs (updateEditorBusiness,
 * create/update/deleteEditorService, updateEditorHours, updateEditorPolicies)
 * so the wizard is just a guided wrapper over the same endpoints the normal
 * editor pages use — no special-case backend.
 *
 * Completion (finish OR skip) stamps business_profiles.onboarding_completed_at
 * via completeOnboarding() so the dashboard stops redirecting here.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Check, ArrowRight, ArrowLeft, Plus, Trash2, X,
  Building2, Scissors, Clock, ShieldCheck, CreditCard, Sparkles, ExternalLink,
} from 'lucide-react'
import {
  getEditorBusiness, updateEditorBusiness,
  getEditorServices, createEditorService, updateEditorService, deleteEditorService,
  getEditorHours, updateEditorHours,
  getEditorPolicies, updateEditorPolicies,
  getStripeConnectStatus, startStripeConnect,
  completeOnboarding,
} from '@/lib/api'
import type {
  BusinessProfile, Service, HoursEntry, BusinessPolicy,
} from '@/lib/types'
import { clearAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

type StepId = 'business' | 'services' | 'hours' | 'policies' | 'stripe'

const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: 'business', label: 'Business',  icon: Building2 },
  { id: 'services', label: 'Services',  icon: Scissors },
  { id: 'hours',    label: 'Hours',     icon: Clock },
  { id: 'policies', label: 'Policies',  icon: ShieldCheck },
  { id: 'stripe',   label: 'Payments',  icon: CreditCard },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Local editable service row. id is null for rows the owner just added.
interface ServiceRow {
  id: number | null
  name: string
  price: number
  duration_minutes: number
  _deleted?: boolean
}

export default function OnboardingWizard() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bootRedirect, setBootRedirect] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-step working state.
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [origServiceIds, setOrigServiceIds] = useState<number[]>([])
  const [hours, setHours] = useState<HoursEntry[]>([])
  const [policies, setPolicies] = useState<BusinessPolicy | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)

  const step = STEPS[stepIndex]

  // ── Load everything up front (one round of fetches) ──────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBusiness().catch(() => null),
      getEditorServices().catch(() => [] as Service[]),
      getEditorHours().catch(() => [] as HoursEntry[]),
      getEditorPolicies().catch(() => null),
      getStripeConnectStatus().then(r => r.stripe_connect_status).catch(() => null),
    ]).then(([b, sv, hr, pol, st]) => {
      if (cancelled) return
      const profile = b as BusinessProfile | null
      // Already onboarded → don't trap them here; bounce to the dashboard.
      if (profile && profile.onboarding_completed_at != null) {
        setBootRedirect(true)
        router.replace('/editor')
        return
      }
      setBusiness(profile)
      const svRows = (sv as Service[]).map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price ?? 0),
        duration_minutes: Number(s.duration_minutes ?? 60),
      }))
      setServices(svRows)
      setOrigServiceIds(svRows.map(r => r.id!).filter(Boolean))
      setHours(hr as HoursEntry[])
      setPolicies(pol as BusinessPolicy | null)
      setStripeConnected((st as string | null) === 'active')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [router])

  // ── Step savers ──────────────────────────────────────────────────────
  async function saveBusiness() {
    if (! business) return
    await updateEditorBusiness({
      business_name: business.business_name,
      tagline:       business.tagline,
      public_email:  business.public_email,
      public_phone:  business.public_phone,
      city:          business.city,
      state:         business.state,
    })
  }

  async function saveServices() {
    // Reconcile local rows against what was loaded: delete removed,
    // create new (id null), update changed/kept.
    const liveIds = services.filter(s => s.id && ! s._deleted).map(s => s.id!)
    const toDelete = origServiceIds.filter(id => ! liveIds.includes(id))
    await Promise.all(toDelete.map(id => deleteEditorService(id).catch(() => {})))

    for (const row of services) {
      if (row._deleted) continue
      const name = row.name.trim()
      if (name === '') continue
      const payload = {
        name,
        price: Number.isFinite(row.price) ? row.price : 0,
        duration_minutes: Number.isFinite(row.duration_minutes) ? row.duration_minutes : 60,
      }
      if (row.id) {
        await updateEditorService(row.id, payload as Partial<Omit<Service, 'id'>>)
      } else {
        // Backend only requires name + price + duration_minutes; the rest
        // of Service is optional server-side. Cast through unknown since
        // the TS Service type marks more fields required than the API does.
        await createEditorService(payload as unknown as Omit<Service, 'id'>)
      }
    }
  }

  async function saveHours() {
    if (! hours.length) return
    await updateEditorHours(hours)
  }

  async function savePolicies() {
    if (! policies) return
    await updateEditorPolicies({
      cancellation_policy: policies.cancellation_policy,
      no_show_policy:      policies.no_show_policy,
      late_policy:         policies.late_policy,
      deposit_policy:      policies.deposit_policy,
    })
  }

  const SAVERS: Record<StepId, () => Promise<void>> = {
    business: saveBusiness,
    services: saveServices,
    hours:    saveHours,
    policies: savePolicies,
    stripe:   async () => {},
  }

  // ── Navigation ───────────────────────────────────────────────────────
  async function goNext() {
    setError(null)
    setSaving(true)
    try {
      await SAVERS[step.id]()
      if (stepIndex < STEPS.length - 1) {
        setStepIndex(i => i + 1)
      } else {
        await finish()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this step. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    setError(null)
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }

  async function finish(thenStripe = false) {
    setSaving(true)
    try {
      await completeOnboarding()
      if (thenStripe) {
        const { onboarding_url } = await startStripeConnect()
        window.location.href = onboarding_url
        return
      }
      router.replace('/editor')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.')
      setSaving(false)
    }
  }

  async function skipAll() {
    setSaving(true)
    try {
      await completeOnboarding()
      router.replace('/editor')
    } catch {
      // Even if the flag write fails, get them into the editor.
      router.replace('/editor')
    }
  }

  function signOut() {
    clearAuth()
    router.push('/login')
  }

  if (loading || bootRedirect) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-text">
          <Loader2 size={16} className="animate-spin" /> Loading your setup…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-white">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-near-black flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">
              Welcome to BookReady
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={skipAll}
              disabled={saving}
              className="text-[11px] font-semibold text-muted-text hover:text-near-black disabled:opacity-50"
            >
              Skip setup
            </button>
            <button
              type="button"
              onClick={signOut}
              className="text-[11px] font-semibold text-muted-text hover:text-near-black"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Progress rail */}
      <div className="bg-white border-b border-[rgba(18,18,18,0.08)]">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < stepIndex
            const active = i === stepIndex
            return (
              <div key={s.id} className="flex items-center gap-1.5 flex-1 last:flex-none">
                <div className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 border',
                  active ? 'border-near-black bg-near-black text-white'
                    : done ? 'border-[rgba(18,18,18,0.15)] bg-white text-near-black'
                    : 'border-[rgba(18,18,18,0.10)] bg-cream text-muted-text',
                )}>
                  {done ? <Check size={12} /> : <Icon size={12} />}
                  <span className="text-[10px] font-bold tracking-[0.10em] uppercase hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-px flex-1 hidden sm:block', done ? 'bg-near-black/30' : 'bg-[rgba(18,18,18,0.10)]')} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {step.id === 'business' && business && (
            <BusinessStep business={business} onChange={setBusiness} />
          )}
          {step.id === 'services' && (
            <ServicesStep services={services} onChange={setServices} />
          )}
          {step.id === 'hours' && (
            <HoursStep hours={hours} onChange={setHours} />
          )}
          {step.id === 'policies' && policies && (
            <PoliciesStep policies={policies} onChange={setPolicies} />
          )}
          {step.id === 'stripe' && (
            <StripeStep
              connected={stripeConnected}
              saving={saving}
              onConnect={() => finish(true)}
              onSkip={() => finish(false)}
            />
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="border-t border-[rgba(18,18,18,0.10)] bg-white">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || saving}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-near-black disabled:opacity-30"
          >
            <ArrowLeft size={12} /> Back
          </button>

          {/* Stripe step owns its own actions; the global Next is hidden there. */}
          {step.id !== 'stripe' && (
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-4 py-2.5 hover:bg-white hover:text-near-black disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <>Continue <ArrowRight size={12} /></>}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

// ── Step 1: Business ───────────────────────────────────────────────────
function BusinessStep({ business, onChange }: {
  business: BusinessProfile
  onChange: (b: BusinessProfile) => void
}) {
  const set = (k: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...business, [k]: e.target.value })
  return (
    <StepFrame
      title="Tell us about your business"
      subtitle="This is what your clients see at the top of your booking page. You can change any of it later."
    >
      <Field label="Business name">
        <input className={inputCls} value={business.business_name ?? ''} onChange={set('business_name')} placeholder="Lush Studio" />
      </Field>
      <Field label="Tagline" hint="A short line under your name — optional.">
        <input className={inputCls} value={business.tagline ?? ''} onChange={set('tagline')} placeholder="Soft glow, soft hands." />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Public email">
          <input className={inputCls} type="email" value={business.public_email ?? ''} onChange={set('public_email')} placeholder="hello@yourstudio.com" />
        </Field>
        <Field label="Public phone">
          <input className={inputCls} value={business.public_phone ?? ''} onChange={set('public_phone')} placeholder="(555) 123-4567" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City">
          <input className={inputCls} value={business.city ?? ''} onChange={set('city')} placeholder="Brooklyn" />
        </Field>
        <Field label="State">
          <input className={inputCls} value={business.state ?? ''} onChange={set('state')} placeholder="NY" />
        </Field>
      </div>
    </StepFrame>
  )
}

// ── Step 2: Services ───────────────────────────────────────────────────
function ServicesStep({ services, onChange }: {
  services: ServiceRow[]
  onChange: (s: ServiceRow[]) => void
}) {
  const visible = services.filter(s => ! s._deleted)
  function update(idx: number, patch: Partial<ServiceRow>) {
    const next = [...services]
    const realIdx = services.indexOf(visible[idx])
    next[realIdx] = { ...next[realIdx], ...patch }
    onChange(next)
  }
  function remove(idx: number) {
    const target = visible[idx]
    if (target.id) {
      // existing → mark deleted so saveServices can DELETE it
      onChange(services.map(s => s === target ? { ...s, _deleted: true } : s))
    } else {
      // never-saved row → drop entirely
      onChange(services.filter(s => s !== target))
    }
  }
  function add() {
    onChange([...services, { id: null, name: '', price: 0, duration_minutes: 60 }])
  }
  return (
    <StepFrame
      title="What do you offer?"
      subtitle="We added a few starter services — rename them to match what you do, set your prices, and remove any you don't need."
    >
      <div className="space-y-3">
        {visible.map((s, i) => (
          <div key={i} className="bg-white border border-[rgba(18,18,18,0.12)] p-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className={labelCls}>Service name</label>
              <input className={inputCls} value={s.name} onChange={e => update(i, { name: e.target.value })} placeholder="Signature Service" />
            </div>
            <div className="w-24">
              <label className={labelCls}>Price ($)</label>
              <input className={inputCls} type="number" min={0} step="1" value={s.price} onChange={e => update(i, { price: Number(e.target.value) })} />
            </div>
            <div className="w-24">
              <label className={labelCls}>Mins</label>
              <input className={inputCls} type="number" min={5} step="5" value={s.duration_minutes} onChange={e => update(i, { duration_minutes: Number(e.target.value) })} />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              title="Remove service"
              className="w-9 h-9 inline-flex items-center justify-center border border-[rgba(18,18,18,0.12)] bg-white text-muted-text hover:border-red-500 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-[12px] text-muted-text py-2">No services yet — add at least one so clients can book.</p>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black"
      >
        <Plus size={12} /> Add service
      </button>
    </StepFrame>
  )
}

// ── Step 3: Hours ──────────────────────────────────────────────────────
function HoursStep({ hours, onChange }: {
  hours: HoursEntry[]
  onChange: (h: HoursEntry[]) => void
}) {
  function setDay(idx: number, patch: Partial<HoursEntry>) {
    onChange(hours.map((h, i) => i === idx ? { ...h, ...patch } : h))
  }
  return (
    <StepFrame
      title="When are you open?"
      subtitle="Clients can only book during these hours. We've defaulted to weekdays — adjust to match your schedule."
    >
      <div className="space-y-2">
        {hours.map((h, i) => (
          <div key={h.day_of_week} className="bg-white border border-[rgba(18,18,18,0.12)] p-3 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 w-32 cursor-pointer">
              <input
                type="checkbox"
                checked={h.is_open}
                onChange={e => setDay(i, { is_open: e.target.checked })}
                className="h-4 w-4 accent-near-black"
              />
              <span className="text-[13px] font-semibold text-near-black">{h.day_name ?? DAY_NAMES[h.day_of_week]}</span>
            </label>
            {h.is_open ? (
              <div className="flex items-center gap-2">
                <input type="time" className={cn(inputCls, 'w-32')} value={h.open_time ?? '09:00'} onChange={e => setDay(i, { open_time: e.target.value })} />
                <span className="text-muted-text text-xs">to</span>
                <input type="time" className={cn(inputCls, 'w-32')} value={h.close_time ?? '18:00'} onChange={e => setDay(i, { close_time: e.target.value })} />
              </div>
            ) : (
              <span className="text-[12px] text-muted-text">Closed</span>
            )}
          </div>
        ))}
      </div>
    </StepFrame>
  )
}

// ── Step 4: Policies ───────────────────────────────────────────────────
function PoliciesStep({ policies, onChange }: {
  policies: BusinessPolicy
  onChange: (p: BusinessPolicy) => void
}) {
  const set = (k: keyof BusinessPolicy) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange({ ...policies, [k]: e.target.value })
  return (
    <StepFrame
      title="Set your booking policies"
      subtitle="We pre-filled sensible defaults. Tweak the wording to fit your business — these show on your booking page."
    >
      <Field label="Cancellation policy">
        <textarea rows={2} className={textareaCls} value={policies.cancellation_policy ?? ''} onChange={set('cancellation_policy')} />
      </Field>
      <Field label="No-show policy">
        <textarea rows={2} className={textareaCls} value={policies.no_show_policy ?? ''} onChange={set('no_show_policy')} />
      </Field>
      <Field label="Late arrival policy">
        <textarea rows={2} className={textareaCls} value={policies.late_policy ?? ''} onChange={set('late_policy')} />
      </Field>
      <Field label="Deposit policy">
        <textarea rows={2} className={textareaCls} value={policies.deposit_policy ?? ''} onChange={set('deposit_policy')} />
      </Field>
    </StepFrame>
  )
}

// ── Step 5: Stripe ─────────────────────────────────────────────────────
function StripeStep({ connected, saving, onConnect, onSkip }: {
  connected: boolean
  saving: boolean
  onConnect: () => void
  onSkip: () => void
}) {
  return (
    <StepFrame
      title="Get paid"
      subtitle="Connect Stripe to take deposits and payments at booking. This is the last step — you can also do it later from Payments."
    >
      {connected ? (
        <div className="bg-white border border-[rgba(18,18,18,0.12)] p-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1e7a3f]/10 flex items-center justify-center">
            <Check size={16} className="text-[#1e7a3f]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-near-black">Stripe is connected</p>
            <p className="text-[11px] text-muted-text">You're ready to accept deposits and payments.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[rgba(18,18,18,0.12)] p-5">
          <p className="text-[13px] text-near-black mb-1 font-semibold">Connect your Stripe account</p>
          <p className="text-[12px] text-muted-text mb-4">
            BookReady uses Stripe to securely process payments straight to your bank.
            It takes about 2 minutes. We never see your card data.
          </p>
          <button
            type="button"
            onClick={onConnect}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-4 py-2.5 hover:bg-white hover:text-near-black disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <><CreditCard size={12} /> Connect Stripe</>}
            {! saving && <ExternalLink size={11} className="opacity-60" />}
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="text-[11px] font-semibold text-muted-text hover:text-near-black disabled:opacity-50"
        >
          {connected ? 'Finish' : 'Skip for now — finish setup'}
        </button>
        {connected && (
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-4 py-2.5 hover:bg-white hover:text-near-black disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <>Go to dashboard <ArrowRight size={12} /></>}
          </button>
        )}
      </div>
    </StepFrame>
  )
}

// ── Shared bits ────────────────────────────────────────────────────────
function StepFrame({ title, subtitle, children }: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-[22px] font-bold text-near-black tracking-tight">{title}</h1>
      <p className="text-[13px] text-muted-text mt-1 mb-6 max-w-xl">{subtitle}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-text">{hint}</p>}
    </div>
  )
}

const labelCls = 'block text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const textareaCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors resize-y leading-relaxed'
