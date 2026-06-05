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
  TrendingUp, Users, UserPlus, Crown, Repeat, Lightbulb, Inbox, BarChart3,
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
  // A13 cleanup — the dashboard ships its own large personalized hero,
  // so the shell's generic "Dashboard · Snapshot of your business…"
  // header would duplicate the same screen real estate. Suppress it.
  return (
    <EditorShell pageHeader={false}>
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

  // A13 — bookings-focused derivations.
  const nextAppt          = useMemo(() => findNextAppt(appts),        [appts])
  const tomorrowAppts     = useMemo(() => findTomorrowAppts(appts),   [appts])
  const weekStrip         = useMemo(() => computeWeekStrip(appts),    [appts])
  const pendingCount      = useMemo(() => appts.filter(a => a.status === 'pending').length, [appts])
  const revenueByWeek     = useMemo(() => computeRevenueByWeek(appts, 8),  [appts])
  const bookingsByDay     = useMemo(() => computeBookingsByDay(appts, 14), [appts])
  // A13 — customer intelligence.
  const newCustomers      = useMemo(() => computeNewCustomers(appts),  [appts])
  const topSpenders       = useMemo(() => computeTopSpenders(appts),   [appts])
  const repeatRatio       = useMemo(() => computeRepeatRatio(appts),   [appts])
  // A13 — daily-changing flavor. Deterministic by day-of-year so it
  // rotates without needing server state.
  const dailyTip          = useMemo(() => pickDailyTip(), [])

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
      {/* ── A13: bigger personalized hero with daily tip ribbon ── */}
      <header className="px-1">
        <h1 className="text-[22px] sm:text-[28px] font-bold text-near-black tracking-tight leading-tight">
          {greeting}{ownerFirstName ? <>, <span className="italic">{ownerFirstName}.</span></> : '.'}
        </h1>
        <p className="text-[13px] sm:text-[14px] text-muted-text mt-1.5">
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
        {/* A13 — daily tip ribbon. Deterministic by day-of-year so it
            shifts every morning without server state. */}
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-near-black bg-cream border border-[rgba(18,18,18,0.10)] px-3 py-2">
          <Lightbulb size={12} className="text-[#c98a14] flex-shrink-0" strokeWidth={2} />
          <span className="leading-snug"><span className="font-bold uppercase tracking-[0.1em] text-[10px] text-muted-text">Today&rsquo;s tip · </span>{dailyTip}</span>
        </div>
      </header>

      {/* ── A13: hero bookings tile — next appointment countdown ── */}
      {nextAppt && (
        <NextApptHero appt={nextAppt} />
      )}

      {/* ── Announcements ── */}
      <AnnouncementsBlock items={announcements} />

      {/* ── A13: Today + Tomorrow side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section>
          <SectionHeader
            icon={Calendar}
            label="Today's appointments"
            subtitle={todaysAppointments.length === 0
              ? 'Nothing on the books for today.'
              : `${todaysAppointments.length} appointment${todaysAppointments.length === 1 ? '' : 's'}`}
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
              {todaysAppointments.slice(0, 5).map(a => (
                <TodayApptRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            icon={Calendar}
            label="Tomorrow"
            subtitle={tomorrowAppts.length === 0
              ? 'Nothing booked yet for tomorrow.'
              : `${tomorrowAppts.length} appointment${tomorrowAppts.length === 1 ? '' : 's'}`}
          />
          {tomorrowAppts.length === 0 ? (
            <EmptyTile
              body="A blank day ahead. Maybe time to post your availability."
            />
          ) : (
            <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
              {tomorrowAppts.slice(0, 5).map(a => (
                <TodayApptRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── A13: Week strip ── */}
      <WeekStrip days={weekStrip} />

      {/* ── A13: Pending requests counter (only when auto-confirm off + count > 0) ── */}
      {pendingCount > 0 && (
        <PendingRequestsTile count={pendingCount} />
      )}

      {/* ── A13: Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart weeks={revenueByWeek} currency={moneyBuckets.currency} />
        <BookingVolumeChart days={bookingsByDay} />
      </div>

      {/* ── A13: Customer intelligence row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <NewCustomersCard customers={newCustomers} />
        <TopSpendersCard spenders={topSpenders} currency={moneyBuckets.currency} />
        <RepeatRatioCard ratio={repeatRatio} />
      </div>

      {/* ── Setup checklist + Money snapshot — side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SetupChecklist
          items={setupItems}
          doneCount={setupDoneCount}
          pct={setupPct}
        />
        <MoneySnapshot buckets={moneyBuckets} />
      </div>

      {/* ── Recent activity ── */}
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
  // External CTA hrefs (announcements archive on marketing site, etc)
  // need to open in a new tab. Internal hrefs use Next Link.
  const isExternal = !! cta && /^https?:\/\//.test(cta.href)
  const ctaClass = 'text-[11px] font-semibold tracking-[0.04em] text-near-black hover:underline whitespace-nowrap flex items-center gap-1'
  return (
    <div className="flex items-end justify-between gap-3 mb-2.5 px-1">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          <Icon size={11} strokeWidth={1.8} /> {label}
        </p>
        {subtitle && <p className="text-[13px] text-near-black mt-0.5">{subtitle}</p>}
      </div>
      {cta && (
        isExternal ? (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            {cta.label} <ArrowUpRight size={12} />
          </a>
        ) : (
          <Link href={cta.href} className={ctaClass}>
            {cta.label} <ChevronRight size={12} />
          </Link>
        )
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
  // A13 declutter — show only the latest announcement. Older ones get a
  // "View previous" link that opens the marketing-site archive page.
  // Hide the section entirely when there's nothing to show.
  if (items.length === 0) return null
  const a = items[0]
  const when = a.published_at ?? a.created_at ?? ''
  const isInternal = !! a.cta_href && a.cta_href.startsWith('/')
  return (
    <section>
      <SectionHeader
        icon={Megaphone}
        label="What's new"
        subtitle="From the BookReady team."
        cta={items.length > 1
          ? { label: 'View previous', href: 'https://mybookready.com/announcements' }
          : undefined}
      />
      <article className="bg-white border border-[rgba(18,18,18,0.10)] p-4 flex flex-col">
        <div className="flex items-start gap-2.5 mb-2">
          <Sparkles size={14} className="text-near-black mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-near-black leading-tight">{a.title}</p>
            {when && <p className="text-[10px] text-muted-text mt-0.5">{fmtDate(when.slice(0, 10))}</p>}
          </div>
        </div>
        <p className="text-[13px] text-near-black/80 leading-snug whitespace-pre-line">{a.body}</p>
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

// ────────────────────────────────────────────────────────────────────────────
// A13 — new components for the bookings-first dashboard
// ────────────────────────────────────────────────────────────────────────────

/**
 * Next-appointment hero. Shown above-the-fold when there's an upcoming
 * appointment (today or later). Highlights time-until in a calmly
 * urgent way — bigger than other dashboard tiles, anchors the day.
 */
function NextApptHero({ appt }: { appt: Appointment }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const apptDateTime = parseApptDateTime(appt.appointment_date, appt.start_time)
  const minsUntil = Math.round((apptDateTime.getTime() - now.getTime()) / 60_000)
  const timeLabel = formatTimeUntil(minsUntil, appt.appointment_date)
  const price = typeof appt.service_price === 'number' ? `$${Number(appt.service_price).toFixed(0)}` : null

  return (
    <Link
      href={`/editor/appointments?focus=${appt.id}`}
      className="block bg-near-black text-white p-5 sm:p-6 border border-near-black hover:bg-[#1a1a1a] transition-colors"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/60 mb-1.5">
            Next up
          </p>
          <p className="text-[18px] sm:text-[22px] font-bold leading-tight">
            <span className="text-white">{appt.customer_name}</span>
            <span className="text-white/60"> · </span>
            <span className="text-white">{appt.service_name}</span>
            {price && <span className="text-white/60 text-[16px] font-semibold"> · {price}</span>}
          </p>
          <p className="text-[12px] text-white/70 mt-2">
            {fmtDate(appt.appointment_date)} at {fmt12(appt.start_time)}
            {appt.staff_name && <> · with {appt.staff_name}</>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/60">In</p>
          <p className="text-[24px] sm:text-[32px] font-bold tabular-nums leading-tight">
            {timeLabel}
          </p>
        </div>
      </div>
    </Link>
  )
}

interface WeekStripDay {
  date:      string   // YYYY-MM-DD
  label:     string   // 'Mon', 'Tue', etc.
  num:       number   // day of month
  isToday:   boolean
  count:     number
  status:    'empty' | 'light' | 'medium' | 'heavy'
}

/**
 * 7-day strip showing booking density per day. Visual at-a-glance
 * "is this week heavy or light?" without needing to click into the
 * calendar.
 */
function WeekStrip({ days }: { days: WeekStripDay[] }) {
  return (
    <section>
      <SectionHeader
        icon={BarChart3}
        label="This week"
        subtitle="Next seven days at a glance."
        cta={{ label: 'Open calendar', href: '/editor/appointments' }}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(d => (
            <Link
              key={d.date}
              href={`/editor/appointments?date=${d.date}`}
              className={cn(
                'border px-1 sm:px-2 py-2.5 sm:py-3 text-center transition-colors',
                d.isToday ? 'border-near-black bg-near-black text-white'
                  : 'border-[rgba(18,18,18,0.10)] bg-cream text-near-black hover:border-near-black',
              )}
            >
              <p className={cn(
                'text-[9px] font-bold tracking-[0.10em] uppercase',
                d.isToday ? 'text-white/70' : 'text-muted-text',
              )}>{d.label}</p>
              <p className={cn(
                'text-[16px] sm:text-[18px] font-bold mt-0.5 leading-none',
                d.isToday ? 'text-white' : 'text-near-black',
              )}>{d.num}</p>
              <div className="mt-2 flex justify-center">
                <DensityDots count={d.count} status={d.status} onDark={d.isToday} />
              </div>
              <p className={cn(
                'text-[10px] mt-1',
                d.isToday ? 'text-white/70' : 'text-muted-text',
              )}>{d.count === 0 ? 'Open' : d.count}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function DensityDots({ count, status, onDark }: { count: number; status: WeekStripDay['status']; onDark: boolean }) {
  const dots = Math.min(3, status === 'empty' ? 0 : status === 'light' ? 1 : status === 'medium' ? 2 : 3)
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: i < dots
              ? (onDark ? 'rgba(255,255,255,0.95)' : (status === 'heavy' ? '#0f6f3d' : status === 'medium' ? '#5d8a1c' : '#c98a14'))
              : (onDark ? 'rgba(255,255,255,0.20)' : 'rgba(18,18,18,0.12)'),
          }}
        />
      ))}
      {/* keep flex width even when count==0 */}
      {count === 0 && <span aria-hidden style={{ width: 0 }} />}
    </div>
  )
}

/**
 * Pending requests inbox tile. Surfaces booking requests that need
 * confirmation when auto-confirm is off.
 */
function PendingRequestsTile({ count }: { count: number }) {
  return (
    <Link
      href="/editor/appointments?status=pending"
      className="block bg-[rgba(180,120,0,0.08)] border border-[rgba(180,120,0,0.30)] p-4 hover:bg-[rgba(180,120,0,0.12)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white border border-[rgba(180,120,0,0.30)] flex items-center justify-center flex-shrink-0">
          <Inbox size={16} className="text-[#8a5a00]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#8a5a00]">
            {count} booking {count === 1 ? 'request' : 'requests'} waiting on you
          </p>
          <p className="text-[11px] text-[#8a5a00]/80 mt-0.5">
            Review and confirm to lock them into your calendar.
          </p>
        </div>
        <ArrowUpRight size={13} className="text-[#8a5a00] flex-shrink-0" />
      </div>
    </Link>
  )
}

interface RevenueWeek { label: string; value: number; startISO: string }

/**
 * Revenue trend chart — 8 weekly bars. Pure SVG; no library. Hover
 * shows the week label and exact value.
 */
function RevenueChart({ weeks, currency }: { weeks: RevenueWeek[]; currency: string }) {
  const max = Math.max(1, ...weeks.map(w => w.value))
  const total = weeks.reduce((s, w) => s + w.value, 0)
  const last = weeks[weeks.length - 1]?.value ?? 0
  const prev = weeks[weeks.length - 2]?.value ?? 0
  const delta = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null

  return (
    <section>
      <SectionHeader
        icon={TrendingUp}
        label="Revenue · last 8 weeks"
        subtitle={total === 0
          ? 'No collected revenue yet.'
          : `${money(total, currency)} total · ${delta != null ? (delta >= 0 ? '+' : '') + delta + '% vs last week' : 'this week'}`}
        cta={{ label: 'Open Payments', href: '/editor/payments' }}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="w-full h-32">
          {weeks.map((w, i) => {
            const x = (i * (320 / weeks.length)) + 6
            const barW = (320 / weeks.length) - 12
            const h = w.value === 0 ? 2 : Math.max(4, (w.value / max) * 100)
            const y = 110 - h
            const isLast = i === weeks.length - 1
            return (
              <g key={w.startISO}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={isLast ? '#121212' : 'rgba(18,18,18,0.20)'}
                />
                <title>{w.label}: {money(w.value, currency)}</title>
              </g>
            )
          })}
          {/* baseline */}
          <line x1="0" y1="110" x2="320" y2="110" stroke="rgba(18,18,18,0.15)" strokeWidth="0.5" />
        </svg>
        <div className="flex justify-between mt-2 text-[9px] tracking-[0.08em] uppercase text-muted-text">
          <span>{weeks[0]?.label}</span>
          <span>{weeks[weeks.length - 1]?.label}</span>
        </div>
      </div>
    </section>
  )
}

interface BookingDay { date: string; label: string; count: number; isToday: boolean }

/**
 * Booking volume bar chart — daily bookings for the last 14 days.
 * Highlights today; muted bars for past days. Pure SVG.
 */
function BookingVolumeChart({ days }: { days: BookingDay[] }) {
  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)
  const avg = total / days.length

  return (
    <section>
      <SectionHeader
        icon={Calendar}
        label="Bookings · last 14 days"
        subtitle={total === 0
          ? 'No bookings in this window.'
          : `${total} bookings total · ${avg.toFixed(1)}/day avg`}
        cta={{ label: 'Open calendar', href: '/editor/appointments' }}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="w-full h-32">
          {days.map((d, i) => {
            const x = (i * (320 / days.length)) + 4
            const barW = (320 / days.length) - 8
            const h = d.count === 0 ? 2 : Math.max(4, (d.count / max) * 100)
            const y = 110 - h
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={d.isToday ? '#0f6f3d' : 'rgba(18,18,18,0.30)'}
                />
                <title>{d.label}: {d.count} booking{d.count === 1 ? '' : 's'}</title>
              </g>
            )
          })}
          <line x1="0" y1="110" x2="320" y2="110" stroke="rgba(18,18,18,0.15)" strokeWidth="0.5" />
        </svg>
        <div className="flex justify-between mt-2 text-[9px] tracking-[0.08em] uppercase text-muted-text">
          <span>{days[0]?.label}</span>
          <span>Today</span>
        </div>
      </div>
    </section>
  )
}

interface NewCustomer { name: string; firstAppointmentDate: string }

function NewCustomersCard({ customers }: { customers: NewCustomer[] }) {
  return (
    <section>
      <SectionHeader
        icon={UserPlus}
        label="New customers"
        subtitle={customers.length === 0
          ? 'No new customers in the last 7 days.'
          : `${customers.length} new this week`}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        {customers.length === 0 ? (
          <p className="text-[12px] text-muted-text">
            Once new clients start booking, you&apos;ll see them here.
          </p>
        ) : (
          <ul className="space-y-2">
            {customers.slice(0, 4).map((c, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-near-black">{initials(c.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-near-black truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-text">First booked {fmtDate(c.firstAppointmentDate)}</p>
                </div>
              </li>
            ))}
            {customers.length > 4 && (
              <li className="text-[11px] text-muted-text pt-1">+ {customers.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
    </section>
  )
}

interface TopSpender { name: string; total: number }

function TopSpendersCard({ spenders, currency }: { spenders: TopSpender[]; currency: string }) {
  return (
    <section>
      <SectionHeader
        icon={Crown}
        label="Top spenders · this month"
        subtitle={spenders.length === 0 ? 'No payments yet this month.' : 'Your top three.'}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        {spenders.length === 0 ? (
          <p className="text-[12px] text-muted-text">
            Once payments start landing, your top clients show up here.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {spenders.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={cn(
                  'w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  i === 0 ? 'bg-near-black text-white' : 'bg-cream border border-[rgba(18,18,18,0.10)] text-near-black',
                )}>
                  {i + 1}
                </span>
                <p className="text-[12px] font-semibold text-near-black truncate flex-1">{s.name}</p>
                <p className="text-[13px] font-bold tabular-nums text-near-black">{money(s.total, currency)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

interface RepeatRatio { total: number; returning: number; pct: number }

function RepeatRatioCard({ ratio }: { ratio: RepeatRatio }) {
  return (
    <section>
      <SectionHeader
        icon={Repeat}
        label="Repeat rate · last 20 bookings"
        subtitle={ratio.total === 0
          ? 'No booking history yet.'
          : ratio.pct >= 60 ? 'Strong client retention.'
            : ratio.pct >= 30 ? 'Solid mix of new and returning.'
              : 'Mostly fresh faces lately.'}
      />
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        {ratio.total === 0 ? (
          <p className="text-[12px] text-muted-text">
            We&apos;ll start tracking once you have a few bookings logged.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-[28px] font-bold text-near-black tabular-nums leading-none">
                {ratio.pct}<span className="text-[16px] text-muted-text font-semibold">%</span>
              </p>
              <p className="text-[11px] text-muted-text">
                {ratio.returning} of {ratio.total} returning
              </p>
            </div>
            <div className="h-1.5 bg-cream rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${ratio.pct}%`,
                  backgroundColor: ratio.pct >= 60 ? '#0f6f3d' : ratio.pct >= 30 ? '#5d8a1c' : '#c98a14',
                }}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// A13 — helpers for the new derivations
// ────────────────────────────────────────────────────────────────────────────

function findNextAppt(appts: Appointment[]): Appointment | null {
  const now = new Date()
  let best: Appointment | null = null
  let bestTs = Infinity
  for (const a of appts) {
    if (a.status === 'cancelled' || a.status === 'no_show' || a.status === 'completed') continue
    const ts = parseApptDateTime(a.appointment_date, a.start_time).getTime()
    if (ts >= now.getTime() && ts < bestTs) {
      best = a
      bestTs = ts
    }
  }
  return best
}

function findTomorrowAppts(appts: Appointment[]): Appointment[] {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
  return appts
    .filter(a => a.appointment_date === tomorrowStr && a.status !== 'cancelled')
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

function computeWeekStrip(appts: Appointment[]): WeekStripDay[] {
  const days: WeekStripDay[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const count = appts.filter(a => a.appointment_date === iso && a.status !== 'cancelled').length
    const status: WeekStripDay['status'] =
      count === 0 ? 'empty' : count <= 2 ? 'light' : count <= 5 ? 'medium' : 'heavy'
    days.push({
      date:    iso,
      label:   dayLabels[d.getDay()],
      num:     d.getDate(),
      isToday: i === 0,
      count,
      status,
    })
  }
  return days
}

function computeRevenueByWeek(appts: Appointment[], weeks: number): RevenueWeek[] {
  const out: RevenueWeek[] = []
  const now = new Date()
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  for (let i = weeks - 1; i >= 0; i--) {
    const wStart = new Date(startOfThisWeek)
    wStart.setDate(wStart.getDate() - 7 * i)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 7)
    let total = 0
    for (const a of appts) {
      if (! a.created_at) continue
      const ts = new Date(a.created_at)
      if (ts >= wStart && ts < wEnd) {
        total += (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
      }
    }
    out.push({
      startISO: `${wStart.getFullYear()}-${pad(wStart.getMonth() + 1)}-${pad(wStart.getDate())}`,
      label:    wStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value:    round2(total),
    })
  }
  return out
}

function computeBookingsByDay(appts: Appointment[], days: number): BookingDay[] {
  const out: BookingDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const count = appts.filter(a => {
      if (! a.created_at) return false
      const ts = new Date(a.created_at)
      return ts >= d && ts < new Date(d.getTime() + 86_400_000)
    }).length
    out.push({
      date:    iso,
      label:   d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count,
      isToday: i === 0,
    })
  }
  return out
}

function computeNewCustomers(appts: Appointment[]): NewCustomer[] {
  // First appointment.created_at by customer_email; "new" = first one
  // landed in the last 7 days.
  const firstByKey: Record<string, { name: string; created: string; date: string }> = {}
  for (const a of appts) {
    const key = (a.customer_email ?? a.customer_phone ?? a.customer_name).toLowerCase().trim()
    if (! key) continue
    const created = a.created_at ?? ''
    if (! firstByKey[key] || (created && created < firstByKey[key].created)) {
      firstByKey[key] = { name: a.customer_name, created, date: a.appointment_date }
    }
  }
  const cutoff = Date.now() - 7 * 86_400_000
  return Object.values(firstByKey)
    .filter(c => c.created && new Date(c.created).getTime() >= cutoff)
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
    .map(c => ({ name: c.name, firstAppointmentDate: c.date }))
}

function computeTopSpenders(appts: Appointment[]): TopSpender[] {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totals: Record<string, { name: string; total: number }> = {}
  for (const a of appts) {
    if (! a.created_at) continue
    if (new Date(a.created_at) < monthStart) continue
    const paid = (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
    if (paid <= 0) continue
    const key = (a.customer_email ?? a.customer_phone ?? a.customer_name).toLowerCase().trim()
    if (! key) continue
    if (! totals[key]) totals[key] = { name: a.customer_name, total: 0 }
    totals[key].total += paid
  }
  return Object.values(totals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(t => ({ name: t.name, total: round2(t.total) }))
}

function computeRepeatRatio(appts: Appointment[]): RepeatRatio {
  // Look at the last 20 booking events (by created_at desc). For each,
  // mark "returning" if this customer had any prior appointment before
  // this one. customer_email is the join key, with phone + name fallback.
  const sorted = [...appts]
    .filter(a => !! a.created_at)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const recent = sorted.slice(0, 20)
  let returning = 0
  for (const a of recent) {
    const key = (a.customer_email ?? a.customer_phone ?? a.customer_name).toLowerCase().trim()
    if (! key) continue
    const hadPrior = sorted.some(p =>
      p !== a
      && (p.created_at ?? '') < (a.created_at ?? '')
      && (p.customer_email ?? p.customer_phone ?? p.customer_name).toLowerCase().trim() === key
    )
    if (hadPrior) returning++
  }
  const total = recent.length
  return {
    total,
    returning,
    pct: total === 0 ? 0 : Math.round((returning / total) * 100),
  }
}

// A13 — daily-rotating tip for the hero. Deterministic by day-of-year
// so it shifts every morning without server state. ~30 tips means a
// repeat once a month, low enough to stay novel for early operators.
const DAILY_TIPS = [
  'A short tagline on your booking page makes a stronger first impression than a long bio.',
  'Block off your own buffer between clients — clients respect schedules that respect you.',
  'A clear cancellation policy actually reduces cancellations, not increases them.',
  'Photos in your gallery sell more than descriptions do. Two minutes of phone uploads goes a long way.',
  'Confirmation emails are quiet brand moments. Make them sound like you.',
  'A deposit of even 20% cuts no-shows by half. Sweet spot for most brands.',
  'Returning clients are 7× more valuable than new ones. Treat them like it.',
  'Empty slots? Post one or two on Instagram Stories with your booking link — fastest fill.',
  'Quick win: send a "thanks, see you again" note 24 hours after their appointment.',
  'Saturday afternoons fill up fastest. Don\'t leave them last on your calendar.',
  'A 5-photo gallery converts twice as well as a 15-photo one. Curate, don\'t cram.',
  'The fastest growth lever is making the booking page easy to share — copy it now.',
  'Add a tip prompt to your confirmation emails. Most clients want to; few remember unless asked.',
  'Re-engage a "we haven\'t seen you in a while" client with a personal note, not a discount.',
  'New clients book based on your photos. Returning clients book based on your reliability.',
  'A short FAQ on your booking page cuts back-and-forth emails by ~80%.',
  'Your hours are a brand statement. Closing earlier than competitors can read as premium.',
  'The clients who tip the best are the ones who feel remembered. Use your notes column.',
  'A "what to expect" section reduces first-visit anxiety dramatically.',
  'Your booking confirmation page is your second chance at a first impression.',
  'Don\'t apologize for full days — booked-out is your strongest marketing.',
  'Add buffer time between back-to-back services. Burnout is a slow leak.',
  'A simple "running 10 minutes behind" text from you is worth more than a long apology after.',
  'Refer-a-friend works best as a thank-you, not a transaction. No formal discount needed.',
  'Group your services by occasion (weekend reset, before vacation) on your page — not just by name.',
  'A handful of well-priced staple services beats a sprawling menu, every time.',
  'Photograph the chair you actually use. Authenticity reads in seconds.',
  'A "what to bring / what to wear" line on your booking page prevents reschedules.',
  'Sunday night is the busiest booking time of the week. Make sure your page is up.',
  'Your bio doesn\'t need to be clever. It needs to make one client feel like you get them.',
]

function pickDailyTip(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60_000)
  const dayOfYear = Math.floor(diff / 86_400_000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

// ────────────────────────────────────────────────────────────────────────────
// Small format helpers
// ────────────────────────────────────────────────────────────────────────────

function parseApptDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(s => parseInt(s, 10))
  const [hh, mm] = time.split(':').map(s => parseInt(s, 10))
  return new Date(y, m - 1, d, hh ?? 0, mm ?? 0)
}

function formatTimeUntil(mins: number, apptDate: string): string {
  // Negative → appointment already started (rare, but possible if we're
  // mid-session). Show "Now".
  if (mins <= 0) return 'Now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) {
    return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Tomorrow'
  // Far future — show the date label so the giant "5d" doesn't feel weird.
  return fmtDate(apptDate)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
