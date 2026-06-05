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
  Copy, Image as ImageIcon, Users, Palette, Eye,
} from 'lucide-react'
import {
  getEditorBusiness, updateEditorBusiness,
  getEditorServices, createEditorService, updateEditorService, deleteEditorService,
  getEditorHours, updateEditorHours,
  getEditorPolicies, updateEditorPolicies,
  getStripeConnectStatus, startStripeConnect,
  completeOnboarding,
  getCurrentUser,
} from '@/lib/api'
import type {
  BusinessProfile, Service, HoursEntry, BusinessPolicy,
} from '@/lib/types'
import { clearAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

type StepId = 'business' | 'services' | 'hours' | 'policies' | 'stripe'

/**
 * A10 — Scene state. The wizard is now a 3-act flow: a warm Welcome,
 * then the 5 form steps, then a Finale celebration. The form steps
 * still drive the progress rail; Welcome + Finale are full-frame scenes
 * without it.
 */
type Scene = 'welcome' | 'forms' | 'finale'

/**
 * Per-step metadata for the personalized headers and microcopy
 * surfaced on each form scene. Time estimates are honest enough to
 * earn trust (people remember "took 4 min not 3" more than they
 * remember "took 30s not 45s").
 */
interface StepMeta {
  id:       StepId
  label:    string
  icon:     React.ElementType
  estimate: string
  // why-this-matters microcopy under the personalized headline
  why:      string
}

const STEPS: StepMeta[] = [
  {
    id: 'business', label: 'Business',  icon: Building2,
    estimate: '~30 seconds',
    why: 'This is what shows at the top of your booking page — your name, where you are, how clients reach you.',
  },
  {
    id: 'services', label: 'Services',  icon: Scissors,
    estimate: '~1 minute',
    why: 'Clients pick one of these to book. Names + prices show right on your page — make them sound like you.',
  },
  {
    id: 'hours',    label: 'Hours',     icon: Clock,
    estimate: '~30 seconds',
    why: 'Closed days won\'t show up as bookable. You stay in control of when you work.',
  },
  {
    id: 'policies', label: 'Policies',  icon: ShieldCheck,
    estimate: '~45 seconds',
    why: 'These appear on the booking confirmation so there are no surprises later.',
  },
  {
    id: 'stripe',   label: 'Payments',  icon: CreditCard,
    estimate: '~2 minutes (skippable)',
    why: 'Connect Stripe to take deposits at booking. Skip for now — you can add it any time from Payments.',
  },
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
  // A10 — scene drives the high-level layout. Forms scene preserves the
  // existing 5-step flow exactly; welcome + finale are new.
  const [scene, setScene]         = useState<Scene>('welcome')
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bootRedirect, setBootRedirect] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A10 — owner_name + tenant_id for personalized copy + finale share link.
  // tenant_id IS the subdomain slug (TenantProvisioningService::generateSlug).
  const [ownerName, setOwnerName] = useState<string>('')
  const [tenantId, setTenantId]   = useState<string>('')

  // Per-step working state.
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [origServiceIds, setOrigServiceIds] = useState<number[]>([])
  const [hours, setHours] = useState<HoursEntry[]>([])
  const [policies, setPolicies] = useState<BusinessPolicy | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)

  const step = STEPS[stepIndex]
  // Friendly first name for greeting copy. Falls back to "" if blank
  // so we render "Welcome." not "Welcome, ."
  const firstName = ownerName.split(' ')[0] ?? ''
  // Personalize step copy with the business name once it's loaded.
  const bizName   = business?.business_name?.trim() || 'your business'

  // ── Load everything up front (one round of fetches) ──────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBusiness().catch(() => null),
      getEditorServices().catch(() => [] as Service[]),
      getEditorHours().catch(() => [] as HoursEntry[]),
      getEditorPolicies().catch(() => null),
      getStripeConnectStatus().then(r => r.stripe_connect_status).catch(() => null),
      // A10 — owner name + tenant id for personalized copy + share link.
      getCurrentUser().catch(() => null),
    ]).then(([b, sv, hr, pol, st, me]) => {
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
      if (me) {
        setOwnerName((me as { name?: string }).name ?? '')
        setTenantId((me as { tenant_id?: string }).tenant_id ?? '')
      }
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
        // Connecting Stripe leaves the app entirely (Express onboarding).
        // Don't switch to finale; let them return to /editor after Stripe.
        const { onboarding_url } = await startStripeConnect()
        window.location.href = onboarding_url
        return
      }
      // A10 — advance to the celebration scene instead of going straight
      // to /editor. The finale has the share-link + what's-next cards.
      setScene('finale')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.')
    } finally {
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
          <Loader2 size={16} className="animate-spin" />
          {firstName ? `Setting the stage for ${firstName}…` : 'Setting things up…'}
        </div>
      </div>
    )
  }

  // A10 — Welcome scene. Warm splash before the form sequence kicks in.
  if (scene === 'welcome') {
    return (
      <WelcomeScene
        firstName={firstName}
        businessName={bizName}
        onStart={() => setScene('forms')}
        onSignOut={signOut}
      />
    )
  }

  // A10 — Finale scene. Replaces the previous "snap straight to /editor"
  // ending with a celebration + share-link + what's-next nudges.
  if (scene === 'finale') {
    return (
      <FinaleScene
        firstName={firstName}
        businessName={bizName}
        tenantId={tenantId}
        stripeConnected={stripeConnected}
        onContinue={() => router.replace('/editor')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar — A10: skip moved to the footer so it doesn't undermine
          the flow. Sign out stays here as a low-noise utility. */}
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-white">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-near-black flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">
              {firstName ? `Hi ${firstName}` : 'Welcome'} &middot; Setting up {bizName}
            </span>
          </div>
          <div className="flex items-center gap-3">
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
            <BusinessStep
              business={business}
              onChange={setBusiness}
              estimate={step.estimate}
              why={step.why}
            />
          )}
          {step.id === 'services' && (
            <ServicesStep
              services={services}
              onChange={setServices}
              bizName={bizName}
              estimate={step.estimate}
              why={step.why}
            />
          )}
          {step.id === 'hours' && (
            <HoursStep
              hours={hours}
              onChange={setHours}
              bizName={bizName}
              estimate={step.estimate}
              why={step.why}
            />
          )}
          {step.id === 'policies' && policies && (
            <PoliciesStep
              policies={policies}
              onChange={setPolicies}
              bizName={bizName}
              estimate={step.estimate}
              why={step.why}
            />
          )}
          {step.id === 'stripe' && (
            <StripeStep
              connected={stripeConnected}
              saving={saving}
              bizName={bizName}
              estimate={step.estimate}
              why={step.why}
              onConnect={() => finish(true)}
              onSkip={() => finish(false)}
            />
          )}
        </div>
      </main>

      {/* Footer nav. A10 — "I'll do this later" lives here now (not the
          top bar) so users have to consciously dismiss the flow, not
          stumble into a Skip link first. */}
      <footer className="border-t border-[rgba(18,18,18,0.10)] bg-white">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || saving}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-near-black disabled:opacity-30"
          >
            <ArrowLeft size={12} /> Back
          </button>

          <button
            type="button"
            onClick={skipAll}
            disabled={saving}
            className="text-[10px] font-semibold text-muted-text hover:text-near-black disabled:opacity-40 whitespace-nowrap"
          >
            I&rsquo;ll do this later
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
          {step.id === 'stripe' && <span /> /* spacer for justify-between */}
        </div>
      </footer>
    </div>
  )
}

// ── Step 1: Business ───────────────────────────────────────────────────
function BusinessStep({ business, onChange, estimate, why }: {
  business: BusinessProfile
  onChange: (b: BusinessProfile) => void
  estimate: string
  why: string
}) {
  const set = (k: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...business, [k]: e.target.value })
  return (
    <StepFrame
      title="Let's start with the basics"
      subtitle={why}
      estimate={estimate}
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
function ServicesStep({ services, onChange, bizName, estimate, why }: {
  services: ServiceRow[]
  onChange: (s: ServiceRow[]) => void
  bizName: string
  estimate: string
  why: string
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
      title={`What does ${bizName} offer?`}
      subtitle={why}
      estimate={estimate}
      footnote="We added a few starter services. Rename, reprice, and remove any you don't need."
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
function HoursStep({ hours, onChange, bizName, estimate, why }: {
  hours: HoursEntry[]
  onChange: (h: HoursEntry[]) => void
  bizName: string
  estimate: string
  why: string
}) {
  function setDay(idx: number, patch: Partial<HoursEntry>) {
    onChange(hours.map((h, i) => i === idx ? { ...h, ...patch } : h))
  }
  return (
    <StepFrame
      title={`When is ${bizName} open?`}
      subtitle={why}
      estimate={estimate}
      footnote="We defaulted to weekdays. Toggle days off and tweak the times to match your real schedule."
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
function PoliciesStep({ policies, onChange, bizName, estimate, why }: {
  policies: BusinessPolicy
  onChange: (p: BusinessPolicy) => void
  bizName: string
  estimate: string
  why: string
}) {
  const set = (k: keyof BusinessPolicy) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange({ ...policies, [k]: e.target.value })
  return (
    <StepFrame
      title={`How does ${bizName} handle the awkward stuff?`}
      subtitle={why}
      estimate={estimate}
      footnote="We pre-filled sensible defaults. Tweak the wording to match how you actually talk to your clients."
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
function StripeStep({ connected, saving, bizName, estimate, why, onConnect, onSkip }: {
  connected: boolean
  saving: boolean
  bizName: string
  estimate: string
  why: string
  onConnect: () => void
  onSkip: () => void
}) {
  return (
    <StepFrame
      title={`Get ${bizName} paid`}
      subtitle={why}
      estimate={estimate}
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
function StepFrame({ title, subtitle, estimate, footnote, children }: {
  title:    string
  subtitle: string
  estimate?: string
  footnote?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {estimate && (
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
          {estimate}
        </p>
      )}
      <h1 className="text-[24px] sm:text-[28px] font-bold text-near-black tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-[14px] text-muted-text mt-2 max-w-xl leading-relaxed">{subtitle}</p>
      {footnote && (
        <p className="text-[12px] text-muted-text mt-2 max-w-xl italic">{footnote}</p>
      )}
      <div className="space-y-4 mt-7">{children}</div>
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

// ── A10: Welcome scene ─────────────────────────────────────────────────
function WelcomeScene({ firstName, businessName, onStart, onSignOut }: {
  firstName:    string
  businessName: string
  onStart:      () => void
  onSignOut:    () => void
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-white">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-near-black flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">
              BookReady
            </span>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-[11px] font-semibold text-muted-text hover:text-near-black"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="max-w-xl w-full">
          <div className="mb-7">
            <Sparkles size={22} strokeWidth={1.5} className="text-near-black mb-4" />
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-text mb-3">
              Welcome to BookReady
            </p>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-near-black tracking-tight leading-[1.04] mb-3">
              {firstName ? <>Welcome, <span className="italic">{firstName}.</span></> : <>You&rsquo;re in.</>}
            </h1>
            <p className="text-[16px] text-muted-text leading-relaxed max-w-md">
              Let&rsquo;s get {businessName} ready for bookings. Five quick steps,
              about three minutes. You can change everything later.
            </p>
          </div>

          <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 mb-7">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-4">
              What we&rsquo;ll cover
            </p>
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <li key={s.id} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-cream border border-[rgba(18,18,18,0.12)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-near-black mt-px">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-near-black">{s.label}</span>
                        <span className="text-[10px] tracking-[0.12em] uppercase text-muted-text">
                          {s.estimate}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-text leading-relaxed mt-0.5">{s.why}</p>
                    </div>
                    <Icon size={14} className="text-muted-text mt-1 flex-shrink-0" strokeWidth={1.5} />
                  </li>
                )
              })}
            </ol>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[12px] font-bold tracking-[0.14em] uppercase bg-near-black text-white border border-near-black px-6 py-3.5 hover:bg-[#2a2a2a] transition-colors"
          >
            Let&rsquo;s go <ArrowRight size={13} />
          </button>
          <p className="text-[11px] text-muted-text mt-3 max-w-md leading-relaxed">
            Your site is already live at a starter address &mdash;
            these next minutes make it actually yours.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── A10: Finale scene ─────────────────────────────────────────────────
function FinaleScene({ firstName, businessName, tenantId, stripeConnected, onContinue }: {
  firstName:       string
  businessName:    string
  tenantId:        string
  stripeConnected: boolean
  onContinue:      () => void
}) {
  const siteUrl = tenantId ? `https://${tenantId}.bkrdy.me` : ''
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (! siteUrl) return
    void navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const nextUp: Array<{ icon: React.ElementType; label: string; href: string; sub: string }> = [
    { icon: ImageIcon, label: 'Upload your photos',  href: '/editor/gallery',  sub: 'Show off your work in the gallery' },
    { icon: Users,     label: 'Add your team',       href: '/editor/staff',    sub: 'Let clients pick who books them' },
    { icon: Palette,   label: 'Customize the site',  href: '/editor/website',  sub: 'Make the page match your brand' },
  ]
  if (! stripeConnected) {
    nextUp.push({ icon: CreditCard, label: 'Connect Stripe', href: '/editor/settings?tab=payments', sub: 'Take deposits at booking' })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-hidden">
      {/* Confetti */}
      <Confetti />

      <header className="border-b border-[rgba(18,18,18,0.10)] bg-white relative z-10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-near-black flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">
              You&rsquo;re live
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <Sparkles size={28} strokeWidth={1.5} className="text-near-black mx-auto mb-4" />
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-text mb-3">
              {firstName ? `Nicely done, ${firstName}` : 'Nicely done'}
            </p>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-near-black tracking-tight leading-[1.05] mb-3">
              {businessName} is <span className="italic">ready.</span>
            </h1>
            <p className="text-[15px] text-muted-text leading-relaxed max-w-md mx-auto">
              Your booking site is live. Share the link with clients,
              or jump into the dashboard to keep customizing.
            </p>
          </div>

          {/* Share link */}
          {siteUrl && (
            <section className="bg-white border border-[rgba(18,18,18,0.10)] p-5 mb-6 max-w-2xl mx-auto">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
                Your site
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-[15px] sm:text-[17px] font-bold text-near-black tracking-tight flex-1 min-w-0 break-all">
                  {siteUrl}
                </code>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.10em] uppercase bg-white border border-[rgba(18,18,18,0.15)] text-near-black px-3 py-2 hover:border-near-black transition-colors"
                  >
                    {copied ? <Check size={11} className="text-[#1e7a3f]" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.10em] uppercase bg-near-black text-white border border-near-black px-3 py-2 hover:bg-[#2a2a2a] transition-colors"
                  >
                    <Eye size={11} /> Visit
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* What's next */}
          <section className="mb-7 max-w-2xl mx-auto">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
              What&rsquo;s next
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {nextUp.map(item => {
                const Icon = item.icon
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-3 hover:border-near-black transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center flex-shrink-0">
                      <Icon size={14} strokeWidth={1.5} className="text-near-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-near-black">{item.label}</p>
                      <p className="text-[11px] text-muted-text truncate">{item.sub}</p>
                    </div>
                    <ArrowRight size={12} className="text-muted-text group-hover:text-near-black flex-shrink-0" />
                  </a>
                )
              })}
            </div>
          </section>

          <div className="text-center max-w-2xl mx-auto">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center justify-center gap-2 text-[12px] font-bold tracking-[0.14em] uppercase bg-near-black text-white border border-near-black px-6 py-3.5 hover:bg-[#2a2a2a] transition-colors"
            >
              Go to dashboard <ArrowRight size={13} />
            </button>
            {/* #131 — point new owners at the Help Center right when they
                land, while motivation is high. */}
            <p className="text-[11px] text-muted-text mt-3">
              New to all this?{' '}
              <a href="/help/getting-started" className="font-semibold text-near-black hover:underline">
                Read the 10-minute starter guide
              </a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * A10 — pure CSS confetti for the finale. Lightweight (no library);
 * 12 colored chips that drop once on mount via animation-name + delay.
 * Pointer-events: none so it doesn't steal clicks.
 */
function Confetti() {
  const colors = ['#E8C7DA', '#C8D6E5', '#F4E4BC', '#A8D5BA', '#D4A5A5', '#E5C9F2']
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 5.5) % 100,
    delay: (i % 6) * 0.18,
    duration: 2.2 + (i % 4) * 0.4,
    color: colors[i % colors.length],
    size: 6 + (i % 3) * 2,
  }))
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="onb-confetti"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        .onb-confetti {
          position: absolute;
          display: block;
          opacity: 0;
          animation-name: onbFall;
          animation-timing-function: cubic-bezier(.2,.6,.4,1);
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }
        @keyframes onbFall {
          0%   { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(0, 110vh, 0) rotate(540deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
