'use client'

/**
 * Dashboard — owner's first screen after login.
 *
 * Fetches everything live (no mock data). Sections:
 *   1. Greeting + public site link
 *   2. Announcements   — platform-wide news from the BookReady team
 *   3. Today's appointments
 *   4. Setup checklist — computed from real state, not hardcoded
 *   5. Money snapshot  — collected this week + month, outstanding balance
 *   6. Recent activity — latest bookings by created_at
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, ExternalLink, Loader2, ChevronRight, CheckCircle2, Circle,
  Megaphone, DollarSign, Activity, Sparkles, AlertCircle, ArrowUpRight,
} from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import { cn } from '@/lib/cn'
import { getTenantId } from '@/lib/auth'
import {
  getCurrentUser,
  getEditorBusiness,
  getEditorServices,
  getEditorHours,
  getEditorPolicies,
  getStripeConnectStatus,
  getEditorAppointments,
  getPlatformAnnouncements,
} from '@/lib/api'
import type {
  AuthUser, BusinessProfile, Service, HoursEntry, BusinessPolicy,
  StripeConnectStatus, Appointment, PlatformAnnouncement,
} from '@/lib/types'

// ── Root ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <EditorShell>
      <DashboardBody />
    </EditorShell>
  )
}

function DashboardBody() {
  const router = useRouter()
  // #130 — when a fresh tenant has never completed the onboarding wizard
  // (onboarding_completed_at is null), redirect into it on first dashboard
  // load. `redirecting` holds the full-page spinner so the dashboard never
  // flashes behind the redirect.
  const [redirecting, setRedirecting] = useState(false)
  const [user,     setUser]     = useState<AuthUser | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [hours,    setHours]    = useState<HoursEntry[]>([])
  const [policies, setPolicies] = useState<BusinessPolicy | null>(null)
  const [stripe,   setStripe]   = useState<StripeConnectStatus | null>(null)
  const [appts,    setAppts]    = useState<Appointment[]>([])
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCurrentUser().catch(() => null),
      getEditorBusiness().catch(() => null),
      getEditorServices().catch(() => []),
      getEditorHours().catch(() => []),
      getEditorPolicies().catch(() => null),
      getStripeConnectStatus().then(r => r.stripe_connect_status).catch(() => null),
      // Pull a generous window so we can compute today / week / month buckets
      // without paginating.
      getEditorAppointments({ limit: 200 }).catch(() => [] as Appointment[]),
      getPlatformAnnouncements().catch(() => [] as PlatformAnnouncement[]),
    ])
      .then(([u, b, sv, hr, pol, st, ap, an]) => {
        if (cancelled) return
        // First-run gate: send brand-new tenants to the onboarding wizard
        // before showing the dashboard. Skipping/finishing the wizard stamps
        // onboarding_completed_at, so this only fires once.
        const profile = b as BusinessProfile | null
        if (profile && profile.onboarding_completed_at == null) {
          setRedirecting(true)
          router.replace('/editor/onboard')
          return
        }
        setUser(u as AuthUser | null)
        setBusiness(profile)
        setServices(sv as Service[])
        setHours(hr as HoursEntry[])
        setPolicies(pol as BusinessPolicy | null)
        setStripe(st as StripeConnectStatus | null)
        setAppts(Array.isArray(ap) ? (ap as Appointment[]) : [])
        setAnnouncements(Array.isArray(an) ? (an as PlatformAnnouncement[]) : [])
      })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const slug = getTenantId() ?? user?.tenant_id ?? null

  // ── Derivations ──────────────────────────────────────────────────────────

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  const todaysAppointments = useMemo(() =>
    appts
      .filter(a => a.appointment_date === todayStr && a.status !== 'cancelled')
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appts, todayStr],
  )

  const moneyBuckets = useMemo(() => computeMoney(appts), [appts])
  const recentBookings = useMemo(() =>
    [...appts]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 6),
    [appts],
  )

  const setupItems = useMemo(() => computeSetup({
    business, services, hours, policies, stripe,
  }), [business, services, hours, policies, stripe])
  const setupDoneCount = setupItems.filter(s => s.done).length
  const setupPct = setupItems.length === 0 ? 0
    : Math.round((setupDoneCount / setupItems.length) * 100)

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), [])
  const ownerFirstName = (user?.name ?? '').split(' ')[0] || ''
  const businessName = business?.business_name ?? 'your business'
  const publicUrl = slug ? `https://${slug}.bkrdy.me` : null

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading || redirecting) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
          <Loader2 size={14} className="animate-spin" />
          {redirecting ? 'Setting up your workspace…' : 'Loading your dashboard…'}
        </div>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
          <AlertCircle size={14} /> {loadErr}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-5">
      {/* ── 1. Greeting / hero ── */}
      <header className="px-1">
        <h1 className="text-lg sm:text-xl font-bold text-near-black tracking-tight">
          {greeting}{ownerFirstName ? `, ${ownerFirstName}` : ''}.
        </h1>
        <p className="text-xs sm:text-[13px] text-muted-text mt-1">
          Here&apos;s what&apos;s happening at <span className="font-semibold text-near-black">{businessName}</span> today.
          {publicUrl && (
            <>
              {' '}
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-near-black"
              >
                View site <ExternalLink size={11} />
              </a>
            </>
          )}
        </p>
      </header>

      {/* ── 2. Announcements ── */}
      <AnnouncementsBlock items={announcements} />

      {/* ── 3. Today's appointments ── */}
      <section>
        <SectionHeader
          icon={Calendar}
          label="Today's appointments"
          subtitle={todaysAppointments.length === 0
            ? 'Nothing on the books for today.'
            : `${todaysAppointments.length} appointment${todaysAppointments.length === 1 ? '' : 's'} scheduled.`}
          cta={{ label: 'See all', href: '/editor/appointments' }}
        />
        {todaysAppointments.length === 0 ? (
          <EmptyTile
            body="When someone books for today, they'll show up here."
            actionLabel="View calendar"
            actionHref="/editor/appointments"
          />
        ) : (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
            {todaysAppointments.slice(0, 6).map(a => (
              <TodayApptRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Setup checklist + 5. Money snapshot — side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SetupChecklist
          items={setupItems}
          doneCount={setupDoneCount}
          pct={setupPct}
        />
        <MoneySnapshot buckets={moneyBuckets} />
      </div>

      {/* ── 6. Recent activity ── */}
      <section>
        <SectionHeader
          icon={Activity}
          label="Recent activity"
          subtitle={recentBookings.length === 0 ? 'No bookings yet.' : 'Latest bookings across your inbox.'}
          cta={{ label: 'Open bookings', href: '/editor/appointments' }}
        />
        {recentBookings.length === 0 ? (
          <EmptyTile body="Once bookings start coming in, you'll see the latest ones here." />
        ) : (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
            {recentBookings.map(a => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, label, subtitle, cta,
}: {
  icon: React.ElementType
  label: string
  subtitle?: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-2.5 px-1">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          <Icon size={11} strokeWidth={1.8} /> {label}
        </p>
        {subtitle && <p className="text-[13px] text-near-black mt-0.5">{subtitle}</p>}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="text-[11px] font-semibold tracking-[0.04em] text-near-black hover:underline whitespace-nowrap flex items-center gap-1"
        >
          {cta.label} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

function EmptyTile({ body, actionLabel, actionHref }: { body: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-7 text-center">
      <p className="text-[12px] text-muted-text">{body}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-1.5 hover:border-near-black"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function TodayApptRow({ a }: { a: Appointment }) {
  return (
    <Link
      href={`/editor/appointments?focus=${a.id}`}
      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-cream/60 transition-colors"
    >
      <div className="w-12 text-right flex-shrink-0">
        <p className="text-[13px] font-bold text-near-black tabular-nums">{fmt12(a.start_time)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-near-black truncate">{a.customer_name}</p>
        <p className="text-[11px] text-muted-text truncate">{a.service_name}</p>
      </div>
      <StatusPill status={a.status} />
      <ChevronRight size={13} className="text-muted-text flex-shrink-0" />
    </Link>
  )
}

function ActivityRow({ a }: { a: Appointment }) {
  const when = relativeTime(a.created_at)
  return (
    <Link
      href={`/editor/appointments?focus=${a.id}`}
      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-cream/60 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-near-black truncate">
          <span className="font-semibold">{a.customer_name}</span>
          <span className="text-muted-text"> booked </span>
          <span className="font-semibold">{a.service_name}</span>
        </p>
        <p className="text-[11px] text-muted-text">{fmtDate(a.appointment_date)} at {fmt12(a.start_time)} · {when}</p>
      </div>
      <StatusPill status={a.status} />
      <ChevronRight size={13} className="text-muted-text flex-shrink-0" />
    </Link>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls = {
    confirmed: 'bg-[rgba(20,140,80,0.08)] border-[rgba(20,140,80,0.35)] text-[#0f6f3d]',
    pending:   'bg-cream border-[rgba(180,120,0,0.30)] text-[#8a5a00]',
    completed: 'bg-near-black border-near-black text-white',
    cancelled: 'bg-white border-[rgba(180,40,40,0.30)] text-[#b42828]',
    no_show:   'bg-white border-[rgba(180,40,40,0.30)] text-[#b42828]',
  }[status] ?? 'bg-cream border-[rgba(18,18,18,0.15)] text-muted-text'
  return (
    <span className={cn(
      'text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 whitespace-nowrap flex-shrink-0',
      cls,
    )}>
      {status.replace('_', ' ')}
    </span>
  )
}

function AnnouncementsBlock({ items }: { items: PlatformAnnouncement[] }) {
  // Hide the section entirely when there's nothing to show, so dashboards
  // don't render an empty header for tenants who joined before any
  // announcement was posted.
  const shown = items.slice(0, 2)
  if (shown.length === 0) return null
  return (
    <section>
      <SectionHeader
        icon={Megaphone}
        label="Announcements"
        subtitle="What's new from the BookReady team."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map(a => {
          const when = a.published_at ?? a.created_at ?? ''
          const isInternal = !! a.cta_href && a.cta_href.startsWith('/')
          return (
            <article
              key={a.id}
              className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 flex flex-col"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <Sparkles size={13} className="text-near-black mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-near-black leading-tight">{a.title}</p>
                  {when && <p className="text-[10px] text-muted-text mt-0.5">{fmtDate(when.slice(0, 10))}</p>}
                </div>
              </div>
              <p className="text-[12px] text-near-black/80 leading-snug whitespace-pre-line">{a.body}</p>
              {a.cta_label && a.cta_href && (
                isInternal ? (
                  <Link
                    href={a.cta_href}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-near-black hover:underline self-start"
                  >
                    {a.cta_label} <ArrowUpRight size={11} />
                  </Link>
                ) : (
                  <a
                    href={a.cta_href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-near-black hover:underline self-start"
                  >
                    {a.cta_label} <ArrowUpRight size={11} />
                  </a>
                )
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SetupChecklist({
  items, doneCount, pct,
}: {
  items: SetupItem[]
  doneCount: number
  pct: number
}) {
  return (
    <section>
      <SectionHeader
        icon={CheckCircle2}
        label="Setup checklist"
        subtitle={pct === 100
          ? 'All set — your site is fully configured.'
          : `${doneCount} of ${items.length} complete (${pct}%).`}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5">
        {/* progress bar */}
        <div className="h-1.5 bg-cream rounded-full overflow-hidden mb-3">
          <div
            className={cn('h-full transition-all duration-500',
              pct === 100 ? 'bg-[#0f6f3d]' : 'bg-near-black')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="divide-y divide-[rgba(18,18,18,0.06)]">
          {items.map(it => (
            <li key={it.label}>
              <Link
                href={it.href}
                className="flex items-center gap-2.5 py-2 hover:bg-cream/60 -mx-1 px-1 transition-colors"
              >
                {it.done
                  ? <CheckCircle2 size={14} className="text-[#0f6f3d] flex-shrink-0" />
                  : <Circle size={14} className="text-[rgba(18,18,18,0.25)] flex-shrink-0" />}
                <span className={cn('text-[12px] flex-1', it.done ? 'text-near-black' : 'font-semibold text-near-black')}>
                  {it.label}
                </span>
                {it.detail && <span className="text-[11px] text-muted-text">{it.detail}</span>}
                <ChevronRight size={12} className="text-muted-text flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function MoneySnapshot({ buckets }: { buckets: MoneyBuckets }) {
  return (
    <section>
      <SectionHeader
        icon={DollarSign}
        label="Money snapshot"
        subtitle={`${money(buckets.weekCollected, buckets.currency)} collected this week.`}
        cta={{ label: 'Open Payments', href: '/editor/payments' }}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
        <MoneyRow label="This week"        value={money(buckets.weekCollected,    buckets.currency)} />
        <MoneyRow label="This month"       value={money(buckets.monthCollected,   buckets.currency)} />
        <MoneyRow label="Outstanding balance"
                  value={money(buckets.outstanding,      buckets.currency)}
                  muted={buckets.outstanding === 0}
                  hint={buckets.outstanding > 0 ? 'Owed at appointments' : undefined} />
        <MoneyRow label="Deposits pending" value={String(buckets.pendingDepositCount)} suffix="appts" muted={buckets.pendingDepositCount === 0} />
      </div>
    </section>
  )
}

function MoneyRow({
  label, value, suffix, hint, muted,
}: {
  label: string
  value: string
  suffix?: string
  hint?: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-text">{label}</p>
        {hint && <p className="text-[10px] text-muted-text/80 mt-0.5">{hint}</p>}
      </div>
      <p className={cn(
        'text-[14px] font-bold tabular-nums whitespace-nowrap',
        muted ? 'text-muted-text' : 'text-near-black',
      )}>
        {value}{suffix && <span className="text-[10px] text-muted-text font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface SetupItem { label: string; done: boolean; href: string; detail?: string }

function computeSetup({
  business, services, hours, policies, stripe,
}: {
  business: BusinessProfile | null
  services: Service[]
  hours:    HoursEntry[]
  policies: BusinessPolicy | null
  stripe:   StripeConnectStatus | null
}): SetupItem[] {
  const businessDone = !! (business?.business_name && business?.public_email)
  const servicesDone = services.length > 0
  // Any open day with an open + close time counts as configured.
  const hoursDone    = hours.some(h => h.is_open && !! h.open_time && !! h.close_time)
  const policiesDone = !! policies && (
    !! policies.cancellation_policy
    || !! policies.no_show_policy
    || !! policies.deposit_policy
  )
  const stripeDone = stripe === 'active'

  return [
    {
      label:  'Business profile',
      done:   businessDone,
      href:   '/editor/settings?tab=business',
      detail: businessDone ? 'Set' : 'Name + email required',
    },
    {
      label:  'Services added',
      done:   servicesDone,
      href:   '/editor/services',
      detail: servicesDone ? `${services.length}` : 'Add at least one',
    },
    {
      label:  'Business hours',
      done:   hoursDone,
      href:   '/editor/availability',
      detail: hoursDone ? 'Set' : 'Choose your open days',
    },
    {
      label:  'Booking policies',
      done:   policiesDone,
      href:   '/editor/website?tab=content',
      detail: policiesDone ? 'Set' : 'Add cancellation + no-show',
    },
    {
      label:  'Stripe payments',
      done:   stripeDone,
      href:   '/editor/settings?tab=payments',
      detail: stripeDone ? 'Connected' : 'Connect to accept deposits',
    },
  ]
}

interface MoneyBuckets {
  weekCollected:        number
  monthCollected:       number
  outstanding:          number
  pendingDepositCount:  number
  currency:             string
}

function computeMoney(appts: Appointment[]): MoneyBuckets {
  const now = new Date()
  // Start of week = Sunday
  const dow = now.getDay()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let weekCollected = 0
  let monthCollected = 0
  let outstanding = 0
  let pendingDepositCount = 0
  let currency = 'USD'

  for (const a of appts) {
    if (a.currency) currency = a.currency

    // Collected: deposit_paid_amount + balance_paid_amount. Both nullable.
    const collected = (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
    if (collected > 0 && a.created_at) {
      const ts = new Date(a.created_at)
      if (ts >= monthStart) monthCollected += collected
      if (ts >= weekStart)  weekCollected  += collected
    }

    if ((a.payment_status === 'deposit_paid' || a.payment_status === 'paid')
        && a.status !== 'cancelled'
        && typeof a.amount_due === 'number' && a.amount_due > 0) {
      outstanding += a.amount_due
    }

    if (a.payment_status === 'pending_payment') pendingDepositCount++
  }

  return {
    weekCollected:       round2(weekCollected),
    monthCollected:      round2(monthCollected),
    outstanding:         round2(outstanding),
    pendingDepositCount,
    currency,
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

function money(n: number, currency: string): string {
  const sym = currency === 'USD' ? '$' : ''
  return `${sym}${n.toFixed(2)}`
}

function pad(n: number): string { return n < 10 ? `0${n}` : String(n) }

function fmt12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDate(iso: string): string {
  if (! iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-').map(s => parseInt(s, 10))
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function relativeTime(iso: string | undefined): string {
  if (! iso) return ''
  const then = new Date(iso).getTime()
  const now  = Date.now()
  const diff = Math.max(0, now - then)
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0)  return `${days}d ago`
  if (hours > 0)  return `${hours}h ago`
  if (mins  > 0)  return `${mins}m ago`
  return 'just now'
}

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
