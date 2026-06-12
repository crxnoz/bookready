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
  DollarSign, Activity, Sparkles, AlertCircle, ArrowUpRight,
  TrendingUp, TrendingDown, Users, UserPlus, Crown, Repeat, Lightbulb, Inbox, BarChart3,
  X, Plus, CalendarOff, CreditCard, AlertTriangle, Zap, Receipt, ArrowRight,
  Mail,
} from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import WelcomeTour from '@/components/editor/WelcomeTour'
import { usePlan } from '@/components/editor/PlanContext'
import { cn } from '@/lib/cn'
import StatusBadge from '@/components/ui/StatusBadge'
import { getTenantId } from '@/lib/auth'
import {
  getCurrentUser,
  getEditorBusiness,
  getEditorServices,
  getEditorHours,
  getEditorPolicies,
  getStripeConnectStatus,
  getEditorAppointments,
  getEditorCustomers,
  getEditorDashboardMetrics,
  getEditorWaitlist,
  getPlatformAnnouncements,
  type EditorDashboardMetrics,
  type WaitlistEntry,
} from '@/lib/api'
import type {
  AuthUser, BusinessProfile, Service, HoursEntry, BusinessPolicy,
  StripeConnectStatus, Appointment, PlatformAnnouncement, Customer,
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

/**
 * Wrapper so the WelcomeTour can read `user` + `business` from the same
 * fetch the dashboard already runs. Mounting it here means a fresh
 * signup sees the tour on their very first dashboard load — and the
 * GET /welcome-state on mount keeps it from re-firing for returning
 * users. (See `WelcomeTour.tsx` for the gating logic.)
 */

function DashboardBody() {
  const router = useRouter()
  // Plan gate: Studio/Salon unlocks team-aware surfaces (per-staff revenue
  // breakdown, multi-staff calendar callouts). Solo skips the staff-grouped
  // sections because every row would just be the owner.
  const plan = usePlan()
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
  // v2 Theme 8.1 — Customer roster powers the Lapsed Customers card.
  // Fetched separately from appts (appts is the booking timeline; this
  // is the full customer list with status='inactive' already computed
  // server-side by CustomersController).
  const [customers, setCustomers] = useState<Customer[]>([])
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([])
  // Server-computed dashboard aggregates (all-time totals + period deltas
  // + capacity-resolved "% full"). Falls back to client-side approximations
  // until this resolves, then snaps to accurate numbers within a second.
  const [metrics,  setMetrics]  = useState<EditorDashboardMetrics | null>(null)
  // Availability 2.0 surface: the waitlist queue (work that doesn't live in
  // the appointments table) feeds the Needs Attention layer.
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
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
      // v2 Theme 8.1 — Full customer list for the Lapsed Customers card.
      // Limit 500 covers our launch-cohort tenants comfortably; we'll add
      // server-side filtering when a tenant pushes past this.
      getEditorCustomers({ limit: 500 }).catch(() => [] as Customer[]),
      getPlatformAnnouncements().catch(() => [] as PlatformAnnouncement[]),
      // Server aggregates (5-minute cache per tenant). On older builds this
      // 404s; we treat the absence as "use client-side fallbacks" and don't
      // surface an error.
      getEditorDashboardMetrics().catch(() => null),
      // Availability 2.0 surface: waitlist queue. Can 404 on older builds.
      getEditorWaitlist().then(r => r.data).catch(() => [] as WaitlistEntry[]),
    ])
      .then(([u, b, sv, hr, pol, st, ap, cu, an, mx, wl]) => {
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
        setCustomers(Array.isArray(cu) ? (cu as Customer[]) : [])
        setAnnouncements(Array.isArray(an) ? (an as PlatformAnnouncement[]) : [])
        setMetrics((mx as EditorDashboardMetrics | null) ?? null)
        setWaitlistEntries(Array.isArray(wl) ? (wl as WaitlistEntry[]) : [])
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
  // A13 — customer intelligence.
  const newCustomers      = useMemo(() => computeNewCustomers(appts),  [appts])
  const topSpenders       = useMemo(() => computeTopSpenders(appts),   [appts])
  const repeatRatio       = useMemo(() => computeRepeatRatio(appts),   [appts])
  // A13 — daily-changing flavor. Deterministic by day-of-year so it
  // rotates without needing server state.
  const dailyTip          = useMemo(() => pickDailyTip(), [])

  // ── Dashboard 2.0 — command-center derivations (recent-200 window) ──
  const todayScheduled = useMemo(() => computeTodayScheduled(todaysAppointments), [todaysAppointments])
  const attention      = useMemo(() => computeAttention(appts, todayStr),         [appts, todayStr])
  // Waitlist counts customers actively in the queue: "pending" (waiting
  // for a slot) and "notified" (a slot opened, customer was emailed and
  // has a claim window). The owner sees both as "people who want to
  // book." Claimed / expired / removed don't surface.
  const waitlistAttention  = useMemo(
    () => waitlistEntries.filter(e => e.status === 'pending' || e.status === 'notified').length,
    [waitlistEntries],
  )
  // Total Needs-Attention count across appointment-derived items + the
  // waitlist surface. Drives both the Layer 1 SummaryStatCard and the
  // Layer 2 caught-up vs grid switch.
  const totalAttention = attention.total + waitlistAttention
  const paymentIssuesCount = Math.max(0, attention.total - pendingCount)
  // Today's day-level capacity from the metrics endpoint. null = uncapped, the
  // header then shows a plain count instead of a booked / cap ratio.
  const todayCapacity = metrics?.capacity_today?.capacity ?? null
  const bookingSnap    = useMemo(() => computeBookingSnap(appts),                 [appts])
  const health         = useMemo(() => computeHealth(appts),                      [appts])
  const weekendAppts   = useMemo(() => findWeekendAppts(appts),                   [appts])
  const growthOpps     = useMemo(() => computeGrowth(appts),                      [appts])
  // Per-staff this-week breakdown. Empty on Solo (every row would be the
  // owner) and on Studio/Salon tenants that haven't booked anything yet.
  const teamWeek       = useMemo(() => computeTeamWeek(appts),                    [appts])
  // v2 Theme 8.1 — Inactive customers (status='inactive' = had at least
  // one completed appointment, last booked > 90 days ago). Sorted by
  // staleness (oldest last_appointment_at first) since those are the
  // most at-risk.
  const lapsedCustomers = useMemo(() => computeLapsed(customers),                 [customers])
  // v2 Theme 8.5 — Per-service this-month vs last-month revenue.
  // Bucketed by created_at to match the rest of the money-snapshot
  // family (consistent semantics). Sorted by this-month desc.
  const serviceRevenue  = useMemo(() => computeServiceRevenue(appts),             [appts])

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading || redirecting) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
          <Loader2 size={14} className="animate-spin" />
          {redirecting ? 'Setting up your dashboard…' : 'Loading your dashboard…'}
        </div>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="bg-white border border-danger/20 p-4 text-xs text-danger flex items-center gap-2">
          <AlertCircle size={14} /> {loadErr}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-6">
      <WelcomeTour firstName={ownerFirstName || null} subdomain={slug} />

      {/* ── Header: greeting, date, today snapshot, primary actions ── */}
      <header className="px-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-near-black tracking-tight leading-tight">
              {greeting}{ownerFirstName ? <>, <span className="italic">{ownerFirstName}.</span></> : '.'}
            </h1>
            <p className="text-sm text-muted-text mt-1.5">
              {fmtWeekday(todayStr)} · {todayCapacity != null ? (
                // Capacity is configured for today: show booked / cap so the
                // owner reads how full the day is at a glance. Numerator is the
                // client count (matches the stat card below); denominator is
                // the cap from the metrics endpoint.
                <><span className={cn('font-semibold', todaysAppointments.length >= todayCapacity ? 'text-warning' : 'text-near-black')}>{todaysAppointments.length} / {todayCapacity}</span> appointments today</>
              ) : (
                <><span className="font-semibold text-near-black">{todaysAppointments.length}</span> appointment{todaysAppointments.length === 1 ? '' : 's'} today</>
              )}
              {todayScheduled > 0 && <> · <span className="font-semibold text-near-black">{money(todayScheduled, moneyBuckets.currency)}</span> scheduled</>}
            </p>
          </div>
          <HeaderActions publicUrl={publicUrl} />
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-2xs text-near-black bg-cream border border-hairline-soft px-3 py-2">
          <Lightbulb size={12} className="text-warning-icon flex-shrink-0" strokeWidth={2} />
          <span className="leading-snug"><span className="font-bold uppercase tracking-[0.1em] text-eyebrow text-muted-text">Today&rsquo;s tip · </span>{dailyTip}</span>
        </div>
      </header>

      {/* ── BookReady Feed (dismissible) ── */}
      <AnnouncementsBlock items={announcements} />

      {/* ── Setup checklist — only while incomplete (new tenants) ── */}
      {setupPct < 100 && (
        <SetupChecklist items={setupItems} doneCount={setupDoneCount} pct={setupPct} />
      )}

      {/* ════════ LAYER 1 — TODAY ════════ */}
      {nextAppt && <NextApptHero appt={nextAppt} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStatCard label="Appointments today" value={String(todaysAppointments.length)} href="/editor/appointments" icon={Calendar} />
        <SummaryStatCard label="Scheduled today" value={money(todayScheduled, moneyBuckets.currency)} sub="expected revenue" href="/editor/payments" icon={DollarSign} />
        <SummaryStatCard label="New customers" value={String(newCustomers.length)} sub="last 7 days" href="/editor/customers" icon={UserPlus} />
        <SummaryStatCard label="Needs attention" value={String(totalAttention)} href="/editor/appointments?status=pending" icon={Inbox} tone={totalAttention > 0 ? 'warn' : 'default'} />
      </div>

      <section>
        <SectionHeader
          icon={Calendar}
          label="Today's schedule"
          subtitle={todaysAppointments.length === 0
            ? 'Nothing on the books for today.'
            : `${todaysAppointments.length} appointment${todaysAppointments.length === 1 ? '' : 's'} on deck.`}
          cta={{ label: 'See schedule', href: '/editor/appointments' }}
        />
        {todaysAppointments.length === 0 ? (
          <EmptyTile body="When someone books for today, they'll show up here." actionLabel="View calendar" actionHref="/editor/appointments" />
        ) : (
          <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
            {todaysAppointments.slice(0, 8).map(a => <TodayApptRow key={a.id} a={a} />)}
            {todaysAppointments.length > 8 && (
              <Link href="/editor/appointments" className="block px-3.5 py-2.5 text-xs font-semibold text-near-black hover:bg-cream/60">
                + {todaysAppointments.length - 8} more today
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ════════ LAYER 2 — NEEDS ATTENTION ════════ */}
      <section>
        <SectionHeader
          icon={AlertTriangle}
          label="Needs attention"
          subtitle={totalAttention === 0 ? "You're all caught up." : `${totalAttention} thing${totalAttention === 1 ? '' : 's'} to handle.`}
        />
        {totalAttention === 0 ? (
          <div className="bg-white border border-success/30 p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-near-black">You&rsquo;re all caught up</p>
              <p className="text-2xs text-muted-text mt-0.5">No requests, payment issues, waitlist signups, or unpaid balances right now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingCount         > 0 && <PendingRequestsTile        count={pendingCount} />}
            {paymentIssuesCount   > 0 && <PaymentIssuesTile          count={paymentIssuesCount} />}
            {waitlistAttention    > 0 && <WaitlistTile               count={waitlistAttention} />}
          </div>
        )}
      </section>

      <QuickActions />

      {/* ════════ LAYER 3 — PERFORMANCE ════════ */}
      <RevenueChart appts={appts} currency={moneyBuckets.currency} metrics={metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BookingSnapshotCard snap={bookingSnap} />
        <UpcomingCard tomorrow={tomorrowAppts} weekend={weekendAppts} />
      </div>
      <WeekStrip days={weekStrip} />
      <MoneySnapshot buckets={moneyBuckets} />

      {/* v2 Theme 8.5 — Per-service revenue breakdown with MoM trend.
          Sits next to MoneySnapshot because they answer the same
          question at different resolutions: total money this period vs
          which service lines are pulling it. */}
      <ServiceRevenueCard services={serviceRevenue} currency={moneyBuckets.currency} />

      {/* Team-this-week breakdown. Studio+ only — on Solo, this would
          collapse to a single row of the owner and add no value. */}
      {!plan.isSolo() && teamWeek.length > 0 && (
        <TeamThisWeekSection rows={teamWeek} currency={moneyBuckets.currency} />
      )}

      {/* ════════ LAYER 4 — BUSINESS HEALTH ════════ */}
      {/* Server metrics swap in when the dashboard/metrics endpoint resolves
          (a few hundred ms after first paint). On older deploys it 404s and
          we keep using the recent-window client calc; copy adapts so the
          subtitle never misleads about the scope. */}
      <section>
        <SectionHeader
          icon={Activity}
          label="Business health"
          subtitle={metrics ? 'All time.' : 'Based on your recent bookings.'}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <HealthMetricCard
            label="Average ticket"
            value={money(metrics?.avg_ticket ?? health.avgTicket, metrics?.currency ?? health.currency)}
            sub="Per paid booking"
            icon={Receipt}
          />
          <HealthMetricCard
            label="Return rate"
            value={`${metrics?.return_rate_pct ?? repeatRatio.pct}%`}
            sub={metrics ? 'Customers who came back' : `${repeatRatio.returning} of ${repeatRatio.total} rebooked`}
            icon={Repeat}
          />
          <HealthMetricCard
            label="No-show rate"
            value={`${metrics?.no_show_rate_pct ?? health.noShowRatePct}%`}
            sub="Of finished appointments"
            icon={AlertCircle}
          />
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <NewCustomersCard customers={newCustomers} />
        <TopSpendersCard spenders={topSpenders} currency={moneyBuckets.currency} />
      </div>

      {/* v2 Theme 8.1 — Lapsed customers. Full-width section because the
          reach-out action is the value, and crammed rows make it less
          tappable on mobile. Card shows top 5 lapsed; "See all" CTA
          deep-links into the customers page with the inactive filter
          pre-applied. */}
      <LapsedCustomersCard customers={lapsedCustomers} businessName={businessName} />

      {/* ════════ LAYER 5 — GROWTH OPPORTUNITIES ════════ */}
      <GrowthOpportunitiesCard items={growthOpps} />

      {/* ── Recent activity (low priority) ── */}
      <section>
        <SectionHeader
          icon={Activity}
          label="Recent activity"
          subtitle={recentBookings.length === 0 ? 'No bookings yet.' : 'Your latest bookings.'}
          cta={{ label: 'Open bookings', href: '/editor/appointments' }}
        />
        {recentBookings.length === 0 ? (
          <EmptyTile body="Once bookings start coming in, you'll see the latest ones here." />
        ) : (
          <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
            {recentBookings.map(a => <ActivityRow key={a.id} a={a} />)}
          </div>
        )}
      </section>

      <div className="pt-2 pb-1 text-center text-2xs text-muted-text">
        Need a hand?{' '}
        <Link href="/help" className="font-semibold text-near-black hover:underline">Visit the Help Center</Link>
        {' '}or email{' '}
        <a href="mailto:hello@mybookready.com" className="font-semibold text-near-black hover:underline">hello@mybookready.com</a>.
      </div>
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
  const ctaClass = 'text-2xs font-semibold tracking-[0.04em] text-near-black hover:underline whitespace-nowrap flex items-center gap-1'
  return (
    <div className="flex items-end justify-between gap-3 mb-2.5 px-1">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          <Icon size={11} strokeWidth={1.8} /> {label}
        </p>
        {subtitle && <p className="text-sm text-near-black mt-0.5">{subtitle}</p>}
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
    <div className="bg-white border border-hairline-soft px-5 py-7 text-center">
      <p className="text-xs text-muted-text">{body}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-1.5 hover:border-near-black"
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
        <p className="text-sm font-bold text-near-black tabular-nums">{fmt12(a.start_time)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-near-black truncate">{a.customer_name}</p>
        <p className="text-2xs text-muted-text truncate">{a.service_name}</p>
      </div>
      <StatusBadge domain="appointment" status={a.status} />
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
        <p className="text-sm text-near-black truncate">
          <span className="font-semibold">{a.customer_name}</span>
          <span className="text-muted-text"> booked </span>
          <span className="font-semibold">{a.service_name}</span>
        </p>
        <p className="text-2xs text-muted-text">{fmtDate(a.appointment_date)} at {fmt12(a.start_time)} · {when}</p>
      </div>
      <StatusBadge domain="appointment" status={a.status} />
      <ChevronRight size={13} className="text-muted-text flex-shrink-0" />
    </Link>
  )
}

function AnnouncementsBlock({ items }: { items: PlatformAnnouncement[] }) {
  // BookReady Feed — one active announcement, dismissible. Dismissal
  // persists per-id in localStorage so it stays hidden after the owner
  // closes it. Low priority: a standard card, never interrupts workflow.
  const a = items[0]
  const annId = a ? String(a.id) : ''
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    if (! annId) return
    try { setDismissed(localStorage.getItem(`br_ann_dismissed_${annId}`) === '1') }
    catch { setDismissed(false) }
  }, [annId])

  if (! a || dismissed) return null
  const when = a.published_at ?? a.created_at ?? ''
  const isInternal = !! a.cta_href && a.cta_href.startsWith('/')
  const close = () => {
    try { localStorage.setItem(`br_ann_dismissed_${annId}`, '1') } catch {}
    setDismissed(true)
  }
  return (
    <article className="bg-white border border-hairline-soft p-4 relative">
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 w-6 h-6 inline-flex items-center justify-center text-muted-text hover:text-near-black hover:bg-cream transition-colors"
      >
        <X size={13} />
      </button>
      <div className="flex items-start gap-2.5 mb-2 pr-6">
        <Sparkles size={14} className="text-near-black mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">From the BookReady team</p>
          <p className="text-sm font-bold text-near-black leading-tight mt-0.5">{a.title}</p>
          {when && <p className="text-eyebrow text-muted-text mt-0.5">{fmtDate(when.slice(0, 10))}</p>}
        </div>
      </div>
      <p className="text-sm text-near-black/80 leading-snug whitespace-pre-line">{a.body}</p>
      {a.cta_label && a.cta_href && (
        isInternal ? (
          <Link href={a.cta_href} className="mt-3 inline-flex items-center gap-1 text-2xs font-semibold text-near-black hover:underline self-start">
            {a.cta_label} <ArrowUpRight size={11} />
          </Link>
        ) : (
          <a href={a.cta_href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-2xs font-semibold text-near-black hover:underline self-start">
            {a.cta_label} <ArrowUpRight size={11} />
          </a>
        )
      )}
    </article>
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
          ? 'All set. Your site is fully configured.'
          : `${doneCount} of ${items.length} complete (${pct}%).`}
      />
      <div className="bg-white border border-hairline-soft p-3.5">
        {/* progress bar */}
        <div className="h-1.5 bg-cream  overflow-hidden mb-3">
          <div
            className={cn('h-full transition-all duration-500',
              pct === 100 ? 'bg-success' : 'bg-near-black')}
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
                  ? <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                  : <Circle size={14} className="text-[rgba(18,18,18,0.25)] flex-shrink-0" />}
                <span className={cn('text-xs flex-1', it.done ? 'text-near-black' : 'font-semibold text-near-black')}>
                  {it.label}
                </span>
                {it.detail && <span className="text-2xs text-muted-text">{it.detail}</span>}
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
      <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
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
        <p className="text-2xs text-muted-text">{label}</p>
        {hint && <p className="text-eyebrow text-muted-text/80 mt-0.5">{hint}</p>}
      </div>
      <p className={cn(
        'text-sm font-bold tabular-nums whitespace-nowrap',
        muted ? 'text-muted-text' : 'text-near-black',
      )}>
        {value}{suffix && <span className="text-eyebrow text-muted-text font-normal ml-1">{suffix}</span>}
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
          <p className="text-eyebrow font-bold tracking-[0.22em] uppercase text-white/60 mb-1.5">
            Next up
          </p>
          <p className="text-lg sm:text-2xl font-bold leading-tight">
            <span className="text-white">{appt.customer_name}</span>
            <span className="text-white/60"> · </span>
            <span className="text-white">{appt.service_name}</span>
            {price && <span className="text-white/60 text-base font-semibold"> · {price}</span>}
          </p>
          <p className="text-xs text-white/70 mt-2">
            {fmtDate(appt.appointment_date)} at {fmt12(appt.start_time)}
            {appt.staff_name && <> · with {appt.staff_name}</>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-white/60">In</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-tight">
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
      <div className="bg-white border border-hairline-soft p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(d => (
            <Link
              key={d.date}
              href={`/editor/appointments?date=${d.date}`}
              className={cn(
                'border px-1 sm:px-2 py-2.5 sm:py-3 text-center transition-colors',
                d.isToday ? 'border-near-black bg-near-black text-white'
                  : 'border-hairline-soft bg-cream text-near-black hover:border-near-black',
              )}
            >
              <p className={cn(
                'text-eyebrow font-bold tracking-[0.10em] uppercase',
                d.isToday ? 'text-white/70' : 'text-muted-text',
              )}>{d.label}</p>
              <p className={cn(
                'text-base sm:text-lg font-bold mt-0.5 leading-none',
                d.isToday ? 'text-white' : 'text-near-black',
              )}>{d.num}</p>
              <div className="mt-2 flex justify-center">
                <DensityDots count={d.count} status={d.status} onDark={d.isToday} />
              </div>
              <p className={cn(
                'text-eyebrow mt-1',
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
          className="block w-1.5 h-1.5 "
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
      className="block bg-warning-bg border border-warning/30 p-4 hover:border-warning transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white border border-warning/30 flex items-center justify-center flex-shrink-0">
          <Inbox size={16} className="text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-warning">
            {count} booking {count === 1 ? 'request' : 'requests'} waiting on you
          </p>
          <p className="text-2xs text-warning/80 mt-0.5">
            Review and confirm to lock them into your calendar.
          </p>
        </div>
        <ArrowUpRight size={13} className="text-warning flex-shrink-0" />
      </div>
    </Link>
  )
}

type ChartPeriod = 'today' | 'week' | 'month' | 'year'

interface AreaPoint {
  key:       string       // unique id (start ISO or hour key)
  label:     string       // short axis label (e.g. "Mon", "Jun 4", "11a")
  showLabel: boolean      // render this label on the x-axis (skipped for denser periods)
  fullLabel: string       // tooltip headline (e.g. "Mon, Jun 4" or "11 AM")
  value:     number       // revenue collected in this bucket
  appts:     number       // count of appointments contributing
  isCurrent: boolean      // is this "now"? (current hour / day / month)
  isFuture:  boolean      // bucket starts after now (faded treatment)
  startISO:  string       // bucket start (YYYY-MM-DD)
  endISO:    string       // bucket end (exclusive)
}

interface AreaData {
  points:     AreaPoint[]
  total:      number       // sum of values across visible points (period total)
  priorTotal: number       // sum across equivalent prior period (for delta)
  totalAppts: number       // sum of appts across visible points
}

/**
 * Revenue Snapshot, the Dashboard 2.0 hero chart. Soft area chart with a
 * smoothed top line, no Y-axis labels, period-toggleable
 * (Today / Week / Month / Year). The headline number is the period total;
 * the chart provides trend depth without becoming the focal point.
 *
 * Future buckets (hours after now in Today view, days after today in
 * Week / Month, months after now in Year) render as a faded dashed
 * baseline so it's obvious which side of "now" the data is on. The
 * latest non-future point gets a halo + dot and an inline "now" tag.
 *
 * Empty states:
 *   - no revenue ever → a friendly empty panel with a share-link nudge
 *   - some history but zero this period → flat curve + delta vs prior
 *
 * Clicking a point opens the inline detail panel below the chart listing
 * the appointments that contributed to that bucket.
 */
function RevenueChart({ appts, currency, metrics }: {
  appts:    Appointment[]
  currency: string
  metrics:  EditorDashboardMetrics | null
}) {
  const [period, setPeriod]           = useState<ChartPeriod>('month')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const data = useMemo(() => computeRevenueAreaData(appts, period), [appts, period])

  const periodWord = period === 'today' ? 'today' : `this ${period}`
  const priorWord  = period === 'today' ? 'yesterday' : `last ${period}`
  const periodNoun = period === 'today' ? 'day' : period

  const hasEverHadRevenue = appts.some(
    a => ((a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)) > 0,
  )

  // Prefer server-computed period totals when available. The chart's
  // point-by-point trend still comes from the 200-window of recent
  // appointments; only the headline and the footer counts swap to the
  // accurate aggregate. Falls back to client-side derived numbers when
  // metrics hasn't resolved yet (or 404s on older deploys).
  const serverRevenue = metrics?.revenue[period] ?? null
  const serverAppts   = metrics?.appointments[period] ?? null
  const total      = serverRevenue?.value ?? data.total
  const priorTotal = serverRevenue?.prior ?? data.priorTotal
  const totalAppts = serverAppts?.value   ?? data.totalAppts

  const delta = priorTotal > 0
    ? Math.round(((total - priorTotal) / priorTotal) * 100)
    : null

  let deltaCopy = ''
  let deltaTone: 'up' | 'down' | 'flat' = 'flat'
  if (delta != null) {
    deltaCopy = `${delta >= 0 ? '+' : ''}${delta}% from ${priorWord}`
    deltaTone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  } else if (total > 0) {
    deltaCopy = `First ${periodNoun} with revenue`
    deltaTone = 'up'
  }

  const selectedPoint = selectedKey ? data.points.find(p => p.key === selectedKey) ?? null : null
  const contributing  = selectedPoint
    ? appointmentsInRange(appts, selectedPoint.startISO, selectedPoint.endISO, 'created').filter(a =>
        ((a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)) > 0,
      )
    : []

  const headlineMoney = money(total, currency)
  const avgTicket     = totalAppts > 0 ? money(total / totalAppts, currency) : null

  // "% full" chip only lights up when the tenant has capacity caps
  // configured (Availability 2.0 P3 capacity model). Per the product
  // call, we hide rather than fake the denominator with a heuristic.
  const occupancyPct = metrics?.occupancy?.available ? metrics.occupancy.percent : null

  return (
    <section>
      <div className="bg-white border border-hairline-soft  overflow-hidden">
        {/* Header: headline + period toggle */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">
              Revenue {periodWord}
            </p>
            <p className="mt-1.5 text-3xl font-bold leading-none text-near-black tabular-nums">
              {headlineMoney}
            </p>
            {deltaCopy && (
              <p className={cn(
                'mt-1.5 text-xs font-medium',
                deltaTone === 'up'   && 'text-near-black',
                deltaTone === 'down' && 'text-[#9b3535]',
                deltaTone === 'flat' && 'text-muted-text font-normal',
              )}>
                {deltaCopy}
              </p>
            )}
          </div>
          <PeriodToggle value={period} onChange={p => { setPeriod(p); setSelectedKey(null) }} />
        </div>

        {/* Chart */}
        <div className="px-3 sm:px-5 pb-2">
          {hasEverHadRevenue || period === 'today' ? (
            <AreaChart
              points={data.points}
              currency={currency}
              selectedKey={selectedKey}
              onSelect={key => setSelectedKey(prev => prev === key ? null : key)}
              ariaLabel={`Revenue ${periodWord}: ${headlineMoney}${deltaCopy ? `, ${deltaCopy}` : ''}.`}
            />
          ) : (
            <EmptyRevenue />
          )}
        </div>

        {/* Footer line: appointments · avg ticket · % full (when capacity is set) */}
        {hasEverHadRevenue && (
          <div className="px-5 pb-4 text-xs text-muted-text">
            {totalAppts === 0 ? (
              `No appointments ${period === 'today' ? 'yet today' : periodWord}.`
            ) : (
              <>
                <span className="text-near-black font-medium tabular-nums">{totalAppts}</span>{' '}
                {totalAppts === 1 ? 'appointment' : 'appointments'}
                {avgTicket && (
                  <>
                    <span className="px-1.5 text-muted-text/60">·</span>
                    <span className="text-near-black font-medium tabular-nums">{avgTicket}</span>{' '}
                    avg ticket
                  </>
                )}
                {occupancyPct != null && (
                  <>
                    <span className="px-1.5 text-muted-text/60">·</span>
                    <span className="text-near-black font-medium tabular-nums">{occupancyPct}%</span>{' '}
                    full this month
                  </>
                )}
              </>
            )}
          </div>
        )}

        {selectedPoint && (
          <ChartDetailPanel
            label={selectedPoint.fullLabel}
            valueLabel={money(selectedPoint.value, currency)}
            onClose={() => setSelectedKey(null)}
            empty={contributing.length === 0 ? 'No paid appointments in this period.' : undefined}
            rows={contributing.slice(0, 8).map(a => ({
              key:       String(a.id),
              primary:   a.customer_name,
              secondary: `${a.service_name} · ${fmtDate(a.appointment_date)}`,
              right:     money(round2((a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)), currency),
            }))}
            overflowCount={contributing.length > 8 ? contributing.length - 8 : 0}
          />
        )}
      </div>
    </section>
  )
}

/** Quiet first-run state for the Revenue Snapshot. */
function EmptyRevenue() {
  return (
    <div className="px-2 py-10 text-center">
      <p className="text-xs text-muted-text max-w-[40ch] mx-auto leading-relaxed">
        No revenue yet. Once customers book and pay, your trend will show up here.
      </p>
    </div>
  )
}

/**
 * Soft area chart primitive. Pure SVG, no chart library. Renders past
 * data as a smoothed area + line; future buckets become a dashed
 * baseline so it's obvious where "now" lands. Hover/tap any column to
 * surface the date, revenue and appointment count via ChartTooltip.
 *
 * Smoothing is Catmull-Rom converted to cubic Bezier (default tension);
 * we draw on a 320 × 100 viewBox stretched to fit, so circles read as
 * slight ellipses on wide cards, which is acceptable at this scale.
 */
function AreaChart({
  points, currency, selectedKey, onSelect, ariaLabel,
}: {
  points:      AreaPoint[]
  currency:    string
  selectedKey: string | null
  onSelect?:   (key: string) => void
  ariaLabel:   string
}) {
  const [hover, setHover] = useState<number | null>(null)

  const VW = 320, VH = 100
  const TOP = 8, BOT = 92

  const n = points.length
  if (n === 0) return null

  const max = Math.max(1, ...points.map(p => p.value))
  const coords = points.map((p, i) => ({
    x: n === 1 ? VW / 2 : (i / (n - 1)) * VW,
    y: BOT - (p.value / max) * (BOT - TOP),
  }))

  // Future cutoff: last index whose bucket is not in the future.
  const lastPastIdx = (() => {
    for (let i = n - 1; i >= 0; i--) if (! points[i].isFuture) return i
    return -1
  })()
  const currentIdx  = points.findIndex(p => p.isCurrent)
  const drawableIdx = currentIdx >= 0 ? currentIdx : lastPastIdx

  // Path for [0..drawableIdx]
  const linePath = drawableIdx >= 0 ? polylinePath(coords.slice(0, drawableIdx + 1)) : ''
  const areaPath = drawableIdx >= 0
    ? `${linePath} L${coords[drawableIdx].x} ${BOT} L${coords[0].x} ${BOT} Z`
    : ''

  // Gridlines at 25 / 50 / 75 %.
  const gridYs = [0.25, 0.5, 0.75].map(pct => TOP + (BOT - TOP) * pct)

  const selectedIdx = selectedKey ? points.findIndex(p => p.key === selectedKey) : -1
  const tooltipIdx  = hover != null ? hover : (selectedIdx >= 0 ? selectedIdx : null)

  return (
    <div className="select-none">
      <div className="relative" onMouseLeave={() => setHover(null)}>
        {tooltipIdx != null && tooltipIdx >= 0 && points[tooltipIdx] && (
          <ChartTooltip
            primary={points[tooltipIdx].fullLabel}
            secondary={money(points[tooltipIdx].value, currency)}
            tertiary={points[tooltipIdx].isFuture
              ? 'Not yet'
              : `${points[tooltipIdx].appts} ${points[tooltipIdx].appts === 1 ? 'appointment' : 'appointments'}`}
            position={n === 1 ? 0.5 : tooltipIdx / (n - 1)}
          />
        )}

        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: 180 }}
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id="onb-rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#C8E6C9" stopOpacity="0.42" />
              <stop offset="95%" stopColor="#C8E6C9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {gridYs.map((y, i) => (
            <line key={`g${i}`} x1="0" y1={y} x2={VW} y2={y}
              stroke="rgba(18,18,18,0.05)" strokeWidth="0.5" strokeDasharray="2 3"
              pointerEvents="none" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Baseline */}
          <line x1="0" y1={BOT} x2={VW} y2={BOT}
            stroke="rgba(18,18,18,0.15)" strokeWidth="0.5"
            pointerEvents="none" vectorEffect="non-scaling-stroke" />

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#onb-rev-fill)" className="onb-area-grow"
              pointerEvents="none" />
          )}
          {/* Top stroke */}
          {linePath && (
            <path d={linePath} fill="none" stroke="#121212" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="onb-line-draw"
              pointerEvents="none" />
          )}

          {/* Faded future baseline */}
          {drawableIdx >= 0 && drawableIdx < n - 1 && (
            <line
              x1={coords[drawableIdx].x} y1={BOT}
              x2={VW}                    y2={BOT}
              stroke="rgba(18,18,18,0.22)" strokeWidth="0.5" strokeDasharray="2 3"
              pointerEvents="none" vectorEffect="non-scaling-stroke"
            />
          )}

          {/* NOW vertical marker (only when there's future to the right) */}
          {currentIdx >= 0 && currentIdx < n - 1 && (
            <line
              x1={coords[currentIdx].x} y1={TOP}
              x2={coords[currentIdx].x} y2={BOT}
              stroke="rgba(18,18,18,0.28)" strokeWidth="0.5" strokeDasharray="2 2"
              pointerEvents="none" vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Latest-point halo + dot live in the HTML overlay below so
              they render as perfect circles regardless of the SVG's
              non-uniform stretch on wide cards. */}

          {/* Invisible hit-areas */}
          {points.map((p, i) => {
            const half = n === 1 ? VW / 2 : VW / (n - 1) / 2
            return (
              <rect
                key={p.key}
                x={Math.max(0, coords[i].x - half)}
                y={0}
                width={Math.min(VW, coords[i].x + half) - Math.max(0, coords[i].x - half)}
                height={VH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={onSelect ? () => onSelect(p.key) : undefined}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
                aria-label={`${p.fullLabel}: ${money(p.value, currency)}, ${p.appts} appointments`}
              />
            )
          })}

          {/* Hover guide line (dot moves to HTML overlay below) */}
          {hover != null && hover >= 0 && (
            <line
              x1={coords[hover].x} y1={TOP}
              x2={coords[hover].x} y2={BOT}
              stroke="rgba(18,18,18,0.20)" strokeWidth="0.5" strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Latest-point halo + dot in HTML overlay. Positioning by % of
            the SVG's stretched viewBox keeps them tracked to the data
            point while the divs themselves stay perfectly circular. */}
        {drawableIdx >= 0 && (
          <>
            <div
              aria-hidden
              className="absolute w-4 h-4  pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(coords[drawableIdx].x / VW) * 100}%`,
                top:  `${(coords[drawableIdx].y / VH) * 100}%`,
                backgroundColor: 'rgba(200,230,201,0.55)',
              }}
            />
            <div
              aria-hidden
              className="absolute w-2 h-2  bg-near-black pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(coords[drawableIdx].x / VW) * 100}%`,
                top:  `${(coords[drawableIdx].y / VH) * 100}%`,
              }}
            />
          </>
        )}

        {/* Hover dot in HTML overlay (perfect circle, sage fill). */}
        {hover != null && hover >= 0 && (
          <div
            aria-hidden
            className="absolute w-2.5 h-2.5  border border-near-black pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(coords[hover].x / VW) * 100}%`,
              top:  `${(coords[hover].y / VH) * 100}%`,
              backgroundColor: '#C8E6C9',
            }}
          />
        )}

        {/* NOW label outside SVG (positioned by % so it scales with the chart) */}
        {currentIdx >= 0 && currentIdx < n - 1 && (
          <div
            className="absolute top-0.5 px-1.5 py-0.5 text-eyebrow font-bold tracking-[0.18em] uppercase text-near-black bg-cream border border-hairline -translate-x-1/2 pointer-events-none"
            style={{ left: `${(coords[currentIdx].x / VW) * 100}%` }}
          >
            Now
          </div>
        )}

        <style>{`
          .onb-area-grow { animation: onbAreaIn 480ms cubic-bezier(.2,.7,.3,1) both; }
          .onb-line-draw { animation: onbLineIn 520ms cubic-bezier(.2,.7,.3,1) both; }
          @keyframes onbAreaIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes onbLineIn { from { opacity: 0; } to { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            .onb-area-grow, .onb-line-draw { animation: none; }
          }
        `}</style>
      </div>

      {/* X-axis labels */}
      <div className="relative mt-2 h-3.5 select-none">
        {points.map((p, i) => p.showLabel ? (
          <span
            key={p.key}
            className="absolute top-0 text-eyebrow tracking-[0.04em] text-muted-text -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${(coords[i].x / VW) * 100}%` }}
          >
            {p.label}
          </span>
        ) : null)}
      </div>
    </div>
  )
}

/**
 * Build a straight-line polyline path through `pts`. We dropped the
 * smoothed spline so the chart reads as fact rather than estimate:
 * appointment counts are discrete events and curve smoothing implied
 * an intra-day shape that doesn't exist.
 */
function polylinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x} ${pts[i].y}`
  return d
}

// ────────────────────────────────────────────────────────────────────────────
// A15 — period toggle + detail panel
// ────────────────────────────────────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: ChartPeriod; onChange: (v: ChartPeriod) => void }) {
  const options: { id: ChartPeriod; label: string; sr: string }[] = [
    { id: 'today', label: 'T', sr: 'Today' },
    { id: 'week',  label: 'W', sr: 'This week' },
    { id: 'month', label: 'M', sr: 'This month' },
    { id: 'year',  label: 'Y', sr: 'This year' },
  ]
  return (
    <div className="inline-flex border border-hairline  overflow-hidden flex-shrink-0" role="tablist">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          aria-label={o.sr}
          onClick={() => onChange(o.id)}
          className={cn(
            'px-2.5 py-1 text-eyebrow font-bold tracking-[0.12em] uppercase transition-colors',
            value === o.id
              ? 'bg-near-black text-white'
              : 'bg-white text-muted-text hover:text-near-black',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface DetailRow { key: string; primary: string; secondary: string; right: string }

function ChartDetailPanel({
  label, valueLabel, onClose, rows, empty, overflowCount,
}: {
  label:         string
  valueLabel:    string
  onClose:       () => void
  rows:          DetailRow[]
  empty?:        string
  overflowCount: number
}) {
  return (
    <div className="border-t border-hairline-soft bg-cream/50 animate-[onbPanelIn_220ms_ease-out]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
          <p className="text-sm font-bold text-near-black leading-tight">{valueLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="w-7 h-7 inline-flex items-center justify-center text-muted-text hover:text-near-black hover:bg-cream transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      {empty ? (
        <p className="px-4 pb-3 text-xs text-muted-text">{empty}</p>
      ) : (
        <ul className="divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => (
            <li key={r.key} className="flex items-center gap-3 px-4 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-near-black truncate">{r.primary}</p>
                <p className="text-2xs text-muted-text truncate">{r.secondary}</p>
              </div>
              <p className="text-xs font-bold tabular-nums text-near-black whitespace-nowrap flex-shrink-0">
                {r.right}
              </p>
            </li>
          ))}
          {overflowCount > 0 && (
            <li className="px-4 py-2 text-2xs text-muted-text">
              + {overflowCount} more in this period
            </li>
          )}
        </ul>
      )}
      <style>{`
        @keyframes onbPanelIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/**
 * Tooltip positioned above the hovered point/bar. Clamps to the chart
 * edges so the leftmost / rightmost hover doesn't overflow the card.
 * Takes primary (date/label), secondary (revenue), optional tertiary
 * (e.g. appointment count or a "not yet" note for future buckets).
 */
function ChartTooltip({
  primary, secondary, tertiary, position,
}: {
  primary:   string
  secondary: string
  tertiary?: string
  position:  number
}) {
  // position is 0..1 across the chart. Clamp [12%, 88%] so the tooltip
  // stays visually inside the card even at the edges.
  const left = Math.max(12, Math.min(88, position * 100))
  return (
    <div
      className="absolute -top-2 -translate-x-1/2 -translate-y-full pointer-events-none z-10"
      style={{ left: `${left}%` }}
    >
      <div className="bg-near-black text-white px-2.5 py-1.5 text-eyebrow tracking-tight whitespace-nowrap shadow-md">
        <p className="font-semibold leading-tight">{primary}</p>
        <p className="text-white/80 leading-tight mt-0.5">{secondary}</p>
        {tertiary && (
          <p className="text-white/60 leading-tight mt-0.5">{tertiary}</p>
        )}
      </div>
      {/* Pointer */}
      <div className="w-2 h-2 bg-near-black mx-auto rotate-45 -mt-1" />
    </div>
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
      <div className="bg-white border border-hairline-soft p-4">
        {customers.length === 0 ? (
          <p className="text-xs text-muted-text">
            Once new customers start booking, you&apos;ll see them here.
          </p>
        ) : (
          <ul className="space-y-2">
            {customers.slice(0, 4).map((c, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0">
                  <span className="text-eyebrow font-bold text-near-black">{initials(c.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-near-black truncate">{c.name}</p>
                  <p className="text-eyebrow text-muted-text">First booked {fmtDate(c.firstAppointmentDate)}</p>
                </div>
              </li>
            ))}
            {customers.length > 4 && (
              <li className="text-2xs text-muted-text pt-1">+ {customers.length - 4} more</li>
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
      <div className="bg-white border border-hairline-soft p-4">
        {spenders.length === 0 ? (
          <p className="text-xs text-muted-text">
            Once payments start landing, your top customers show up here.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {spenders.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={cn(
                  'w-5 h-5 flex items-center justify-center text-eyebrow font-bold flex-shrink-0',
                  i === 0 ? 'bg-near-black text-white' : 'bg-cream border border-hairline-soft text-near-black',
                )}>
                  {i + 1}
                </span>
                <p className="text-xs font-semibold text-near-black truncate flex-1">{s.name}</p>
                <p className="text-sm font-bold tabular-nums text-near-black">{money(s.total, currency)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

interface RepeatRatio { total: number; returning: number; pct: number }

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

// ────────────────────────────────────────────────────────────────────────────
// Dashboard 2.0 — Revenue Snapshot area-chart bucketing
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build area-chart points + period totals for the Revenue Snapshot.
 *
 * Per period:
 *   today  → 14 hourly buckets, 7am..8pm; prior = full revenue yesterday
 *   week   → 7 day buckets, Mon..Sun of this week; prior = last week
 *   month  → calendar-day buckets for this month; prior = last month
 *   year   → 12 month buckets for this calendar year; prior = last year
 *
 * Revenue is bucketed by `created_at` (when the appointment was booked
 * and the payment was collected), matching the existing convention so
 * this chart aligns with TopSpenders and the rest of the dashboard.
 */
function computeRevenueAreaData(appts: Appointment[], period: ChartPeriod): AreaData {
  const rev = (a: Appointment) => (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
  const now = new Date()
  if (period === 'today') return computeRevenueToday(appts, now, rev)
  if (period === 'week')  return computeRevenueWeek(appts, now, rev)
  if (period === 'month') return computeRevenueMonth(appts, now, rev)
  return computeRevenueYear(appts, now, rev)
}

function computeRevenueToday(appts: Appointment[], now: Date, rev: (a: Appointment) => number): AreaData {
  // 14 hourly buckets covering [7am, 9pm). Most salon revenue lands in
  // this window; payments timestamped outside are silently excluded.
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const HSTART = 7, HEND = 21
  const points: AreaPoint[] = []
  for (let h = HSTART; h < HEND; h++) {
    const bs = new Date(todayStart); bs.setHours(h, 0, 0, 0)
    const be = new Date(bs.getTime() + 3_600_000)
    let value = 0, count = 0
    for (const a of appts) {
      if (! a.created_at) continue
      const ts = new Date(a.created_at)
      if (ts >= bs && ts < be) { value += rev(a); count++ }
    }
    const hour12   = ((h + 11) % 12) + 1
    const ampm     = h < 12 ? 'a'  : 'p'
    const ampmLong = h < 12 ? 'AM' : 'PM'
    // Show every 3rd hour label so the axis stays readable: 7a, 10a, 1p, 4p, 7p.
    const showLabel = (h - HSTART) % 3 === 0
    points.push({
      key:       `h${h}`,
      label:     `${hour12}${ampm}`,
      showLabel,
      fullLabel: `${hour12}:00 ${ampmLong}`,
      value:     round2(value),
      appts:     count,
      isCurrent: now >= bs && now < be,
      isFuture:  bs > now,
      startISO:  isoDate(bs),
      endISO:    isoDate(be),
    })
  }
  let priorTotal = 0
  for (const a of appts) {
    if (! a.created_at) continue
    const ts = new Date(a.created_at)
    if (ts >= yesterdayStart && ts < todayStart) priorTotal += rev(a)
  }
  return {
    points,
    total:      round2(points.reduce((s, p) => s + p.value, 0)),
    priorTotal: round2(priorTotal),
    totalAppts: points.reduce((s, p) => s + p.appts, 0),
  }
}

function computeRevenueWeek(appts: Appointment[], now: Date, rev: (a: Appointment) => number): AreaData {
  // 7 day buckets, Mon..Sun of this week. Prior = last week.
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow    = today.getDay()                  // 0..6, Sun..Sat
  const back   = (dow + 6) % 7                   // days back to Monday
  const monday = new Date(today); monday.setDate(today.getDate() - back)

  const DOW_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const points: AreaPoint[] = []
  for (let i = 0; i < 7; i++) {
    const bs = new Date(monday); bs.setDate(monday.getDate() + i)
    const be = new Date(bs);     be.setDate(bs.getDate() + 1)
    let value = 0, count = 0
    for (const a of appts) {
      if (! a.created_at) continue
      const ts = new Date(a.created_at)
      if (ts >= bs && ts < be) { value += rev(a); count++ }
    }
    points.push({
      key:       isoDate(bs),
      label:     DOW_LABEL[i],
      showLabel: true,
      fullLabel: bs.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      value:     round2(value),
      appts:     count,
      isCurrent: bs.getTime() === today.getTime(),
      isFuture:  bs > today,
      startISO:  isoDate(bs),
      endISO:    isoDate(be),
    })
  }
  const priorStart = new Date(monday); priorStart.setDate(monday.getDate() - 7)
  let priorTotal = 0
  for (const a of appts) {
    if (! a.created_at) continue
    const ts = new Date(a.created_at)
    if (ts >= priorStart && ts < monday) priorTotal += rev(a)
  }
  return {
    points,
    total:      round2(points.reduce((s, p) => s + p.value, 0)),
    priorTotal: round2(priorTotal),
    totalAppts: points.reduce((s, p) => s + p.appts, 0),
  }
}

function computeRevenueMonth(appts: Appointment[], now: Date, rev: (a: Appointment) => number): AreaData {
  // One bucket per calendar day this month. Prior = last full calendar month.
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // last day of this month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const points: AreaPoint[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const bs = new Date(now.getFullYear(), now.getMonth(), d)
    const be = new Date(now.getFullYear(), now.getMonth(), d + 1)
    let value = 0, count = 0
    for (const a of appts) {
      if (! a.created_at) continue
      const ts = new Date(a.created_at)
      if (ts >= bs && ts < be) { value += rev(a); count++ }
    }
    // Show every ~5th day plus the endpoints; skip labels near edges to
    // avoid the start/end labels colliding with mid-month labels.
    const showLabel =
      d === 1 ||
      d === daysInMonth ||
      (d % 5 === 0 && d >= 4 && daysInMonth - d >= 4)
    points.push({
      key:       isoDate(bs),
      label:     bs.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      showLabel,
      fullLabel: bs.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      value:     round2(value),
      appts:     count,
      isCurrent: bs.getTime() === today.getTime(),
      isFuture:  bs > today,
      startISO:  isoDate(bs),
      endISO:    isoDate(be),
    })
  }
  const priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  let priorTotal = 0
  for (const a of appts) {
    if (! a.created_at) continue
    const ts = new Date(a.created_at)
    if (ts >= priorStart && ts < monthStart) priorTotal += rev(a)
  }
  return {
    points,
    total:      round2(points.reduce((s, p) => s + p.value, 0)),
    priorTotal: round2(priorTotal),
    totalAppts: points.reduce((s, p) => s + p.appts, 0),
  }
}

function computeRevenueYear(appts: Appointment[], now: Date, rev: (a: Appointment) => number): AreaData {
  // 12 month buckets, Jan..Dec of this calendar year. Prior = last year.
  const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const today       = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yearStart   = new Date(now.getFullYear(), 0, 1)
  const points: AreaPoint[] = []
  for (let m = 0; m < 12; m++) {
    const bs = new Date(now.getFullYear(), m, 1)
    const be = new Date(now.getFullYear(), m + 1, 1)
    let value = 0, count = 0
    for (const a of appts) {
      if (! a.created_at) continue
      const ts = new Date(a.created_at)
      if (ts >= bs && ts < be) { value += rev(a); count++ }
    }
    points.push({
      key:       isoDate(bs),
      label:     MONTH_LABEL[m],
      showLabel: true,
      fullLabel: `${MONTH_LABEL[m]} ${now.getFullYear()}`,
      value:     round2(value),
      appts:     count,
      isCurrent: m === now.getMonth(),
      isFuture:  bs > today,
      startISO:  isoDate(bs),
      endISO:    isoDate(be),
    })
  }
  const priorStart = new Date(now.getFullYear() - 1, 0, 1)
  let priorTotal = 0
  for (const a of appts) {
    if (! a.created_at) continue
    const ts = new Date(a.created_at)
    if (ts >= priorStart && ts < yearStart) priorTotal += rev(a)
  }
  return {
    points,
    total:      round2(points.reduce((s, p) => s + p.value, 0)),
    priorTotal: round2(priorTotal),
    totalAppts: points.reduce((s, p) => s + p.appts, 0),
  }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * A15 — filter appointments to those whose timestamp falls in the bucket
 * range. `mode` controls which timestamp to use: 'created' for both
 * charts since the bucketing matches that (an appointment booked in
 * week X contributes to week X's revenue + booking count, regardless of
 * when it's actually scheduled). Sort: most recent first inside the
 * bucket, ties broken by id desc.
 */
function appointmentsInRange(
  appts: Appointment[],
  startISO: string,
  endISO:   string,
  mode:     'created' | 'appointment',
): Appointment[] {
  const start = new Date(startISO + 'T00:00:00').getTime()
  const end   = new Date(endISO   + 'T00:00:00').getTime()
  const inRange = appts.filter(a => {
    const stamp = mode === 'created'
      ? (a.created_at ? new Date(a.created_at).getTime() : NaN)
      : (a.appointment_date ? new Date(a.appointment_date + 'T00:00:00').getTime() : NaN)
    return !isNaN(stamp) && stamp >= start && stamp < end
  })
  return inRange.sort((a, b) => {
    const ta = a.created_at ?? ''
    const tb = b.created_at ?? ''
    if (ta !== tb) return tb.localeCompare(ta)
    return b.id - a.id
  })
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

// ────────────────────────────────────────────────────────────────────────────
// v2 Theme 8.1 — Lapsed customers (status='inactive' on the customer roster)
// ────────────────────────────────────────────────────────────────────────────

interface LapsedCustomer {
  id:            number
  name:          string
  email:         string | null
  lastBookedAt:  string
}

function computeLapsed(customers: Customer[]): LapsedCustomer[] {
  const out: LapsedCustomer[] = []
  for (const c of customers) {
    if (c.status !== 'inactive') continue
    if (! c.last_appointment_at) continue
    out.push({
      id:           c.id,
      name:         c.name,
      email:        c.email ?? null,
      lastBookedAt: c.last_appointment_at,
    })
  }
  // Oldest first — most stale customer is the highest priority for outreach.
  return out.sort((a, b) => a.lastBookedAt.localeCompare(b.lastBookedAt))
}

function LapsedCustomersCard({
  customers, businessName,
}: {
  customers:    LapsedCustomer[]
  businessName: string
}) {
  const total = customers.length
  const top   = customers.slice(0, 5)
  return (
    <section>
      <SectionHeader
        icon={Clock}
        label="Lapsed customers"
        subtitle={total === 0
          ? "Nobody is lapsed. Everyone's booked recently."
          : `${total} customer${total === 1 ? '' : 's'} who haven't booked in 90+ days.`}
        cta={total > 0 ? { label: 'See all', href: '/editor/customers' } : undefined}
      />
      {total === 0 ? (
        <div className="bg-white border border-hairline-soft p-4">
          <p className="text-xs text-muted-text">
            When customers stop booking for 90+ days, they&apos;ll show up here so you can reach out before they forget you.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {top.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0">
                <span className="text-eyebrow font-bold text-near-black">{initials(c.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-near-black truncate">{c.name}</p>
                <p className="text-eyebrow text-muted-text">Last booked {relativeTime(c.lastBookedAt)}</p>
              </div>
              {c.email ? (
                <a
                  href={buildReachOutMailto(c, businessName)}
                  className="inline-flex items-center gap-1.5 text-2xs font-semibold text-near-black border border-hairline-strong px-2.5 py-1 hover:border-near-black transition-colors flex-shrink-0"
                >
                  <Mail size={11} /> Reach out
                </a>
              ) : (
                <span className="text-2xs text-muted-text flex-shrink-0">No email</span>
              )}
            </div>
          ))}
          {total > 5 && (
            <Link href="/editor/customers" className="block px-4 py-2.5 text-xs font-semibold text-near-black hover:bg-cream/60">
              + {total - 5} more lapsed
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * v2 Theme 8.1 — Default mailto body for the lapsed-customer reach out.
 * Owner-customizable later (Theme 8.3 will replace this with an in-app
 * compose modal that supports proper template variables). For now, a
 * sensible default that uses the first name + business name.
 */
function buildReachOutMailto(c: LapsedCustomer, businessName: string): string {
  if (! c.email) return '#'
  const firstName = c.name.trim().split(/\s+/)[0] || 'there'
  const subject = `Hi from ${businessName}`
  const body = `Hi ${firstName},\n\nIt's been a while since we last saw you. Wanted to reach out and let you know we'd love to have you back any time.\n\nLet me know if you'd like to book an appointment.\n\nThanks!`
  return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ────────────────────────────────────────────────────────────────────────────
// v2 Theme 8.5 — Service revenue breakdown (this month vs last)
// ────────────────────────────────────────────────────────────────────────────

interface ServiceRevenueRow {
  serviceName:  string
  thisMonth:    number
  lastMonth:    number
  /** null when last month was zero (avoid dividing by zero / "infinity%"). */
  changePct:    number | null
}

function computeServiceRevenue(appts: Appointment[]): ServiceRevenueRow[] {
  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(),     1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const buckets: Record<string, { thisMonth: number; lastMonth: number }> = {}

  for (const a of appts) {
    if (! a.created_at) continue
    if (a.status === 'cancelled') continue
    const rev = (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
    if (rev <= 0) continue
    const ts   = new Date(a.created_at)
    const name = (a.service_name ?? '').trim() || 'Other'
    if (! buckets[name]) buckets[name] = { thisMonth: 0, lastMonth: 0 }
    if (ts >= thisMonthStart) {
      buckets[name].thisMonth += rev
    } else if (ts >= lastMonthStart && ts < thisMonthStart) {
      buckets[name].lastMonth += rev
    }
  }

  return Object.entries(buckets)
    .map(([name, b]) => ({
      serviceName: name,
      thisMonth:   round2(b.thisMonth),
      lastMonth:   round2(b.lastMonth),
      changePct:   b.lastMonth > 0
        ? round2(((b.thisMonth - b.lastMonth) / b.lastMonth) * 100)
        : null,
    }))
    .filter(r => r.thisMonth > 0 || r.lastMonth > 0)
    .sort((a, b) => b.thisMonth - a.thisMonth)
}

function ServiceRevenueCard({
  services, currency,
}: {
  services: ServiceRevenueRow[]
  currency: string
}) {
  const total = services.length
  const top   = services.slice(0, 8)
  return (
    <section>
      <SectionHeader
        icon={BarChart3}
        label="Service revenue"
        subtitle={total === 0
          ? "Once payments land, you'll see which services are growing here."
          : 'This month vs last, per service.'}
        cta={total > 0 ? { label: 'Open services', href: '/editor/services' } : undefined}
      />
      {total === 0 ? (
        <div className="bg-white border border-hairline-soft p-4">
          <p className="text-xs text-muted-text">
            No service revenue this month or last yet.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {top.map(s => (
            <div key={s.serviceName} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-near-black truncate">{s.serviceName}</p>
                <p className="text-eyebrow text-muted-text truncate">
                  {money(s.thisMonth, currency)} this month
                  {s.lastMonth > 0 && <> · {money(s.lastMonth, currency)} last</>}
                </p>
              </div>
              <ServiceChangeBadge changePct={s.changePct} thisMonth={s.thisMonth} />
            </div>
          ))}
          {total > 8 && (
            <p className="px-4 py-2.5 text-2xs text-muted-text">+ {total - 8} more services</p>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * MoM trend badge. Three states:
 *   - changePct === null (no last-month baseline): "New" tag.
 *   - |changePct| < 1: "~0%" muted — change is noise, don't shout.
 *   - otherwise: TrendingUp/Down with success/danger color.
 *
 * Edge case: this-month is 0 but last-month had revenue → changePct
 * comes back as -100. The danger color + arrow handle that correctly
 * without special-casing, because that's the right signal: the line
 * actually dropped to zero this month.
 */
function ServiceChangeBadge({ changePct, thisMonth }: { changePct: number | null; thisMonth: number }) {
  if (changePct === null) {
    return (
      <span className="text-2xs font-semibold text-muted-text whitespace-nowrap">
        {thisMonth > 0 ? 'New' : '—'}
      </span>
    )
  }
  if (Math.abs(changePct) < 1) {
    return <span className="text-2xs text-muted-text whitespace-nowrap">~0%</span>
  }
  const positive = changePct > 0
  const Icon     = positive ? TrendingUp : TrendingDown
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-2xs font-semibold tabular-nums whitespace-nowrap',
      positive ? 'text-success' : 'text-danger',
    )}>
      <Icon size={11} /> {positive ? '+' : ''}{Math.round(changePct)}%
    </span>
  )
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

// ────────────────────────────────────────────────────────────────────────────
// Dashboard 2.0 — command-center components + derivations
// ────────────────────────────────────────────────────────────────────────────

function HeaderActions({ publicUrl }: { publicUrl: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {publicUrl && (
        <a href={publicUrl} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 bg-white border border-hairline-strong px-3 py-2 text-xs font-semibold text-near-black hover:border-near-black transition-colors">
          <ExternalLink size={13} /> View website
        </a>
      )}
      <Link href="/editor/appointments"
            className="inline-flex items-center gap-1.5 bg-near-black text-white border border-near-black px-3 py-2 text-xs font-semibold hover:bg-white hover:text-near-black transition-colors">
        <Plus size={13} /> Create appointment
      </Link>
      <Link href="/editor/customers"
            className="inline-flex items-center gap-1.5 bg-white border border-hairline-strong px-3 py-2 text-xs font-semibold text-near-black hover:border-near-black transition-colors">
        <UserPlus size={13} /> Add customer
      </Link>
    </div>
  )
}

function SummaryStatCard({ label, value, sub, href, icon: Icon, tone = 'default' }: {
  label: string; value: string; sub?: string; href: string; icon: React.ElementType; tone?: 'default' | 'warn'
}) {
  const warn = tone === 'warn'
  return (
    <Link href={href}
          className={cn('block bg-white border p-3.5 hover:border-near-black transition-colors',
            warn ? 'border-warning/40' : 'border-hairline-soft')}>
      <div className="flex items-center justify-between">
        <p className="text-eyebrow font-bold tracking-[0.12em] uppercase text-muted-text truncate">{label}</p>
        <Icon size={13} className={warn ? 'text-warning' : 'text-muted-text'} strokeWidth={1.8} />
      </div>
      <p className={cn('text-2xl sm:text-3xl font-bold tabular-nums leading-tight mt-1', warn ? 'text-warning' : 'text-near-black')}>{value}</p>
      {sub && <p className="text-2xs text-muted-text mt-0.5">{sub}</p>}
    </Link>
  )
}

function PaymentIssuesTile({ count }: { count: number }) {
  return (
    <Link href="/editor/payments?tab=transactions"
          className="block bg-danger-bg border border-danger/30 p-4 hover:border-danger transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white border border-danger/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={16} className="text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-danger">{count} payment {count === 1 ? 'issue' : 'issues'} to review</p>
          <p className="text-2xs text-danger/80 mt-0.5">Failed charges, disputes, or unpaid balances.</p>
        </div>
        <ArrowUpRight size={13} className="text-danger flex-shrink-0" />
      </div>
    </Link>
  )
}

/**
 * Waitlist tile. Customers waiting for a specific date / service to free
 * up. Not urgent the way a payment failure is; surfaced so owners know
 * there's pent-up demand they could notify when a slot opens.
 */
function WaitlistTile({ count }: { count: number }) {
  return (
    <Link
      href="/editor/waitlist"
      className="block bg-success-bg border border-success/30 p-4 hover:border-success transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white border border-success/30 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-success">
            {count} {count === 1 ? 'customer' : 'customers'} on the waitlist
          </p>
          <p className="text-2xs text-success/80 mt-0.5">
            Ready to grab a slot the moment one opens.
          </p>
        </div>
        <ArrowUpRight size={13} className="text-success flex-shrink-0" />
      </div>
    </Link>
  )
}

function QuickActions() {
  const actions: { label: string; href: string; icon: React.ElementType }[] = [
    { label: 'New appointment', href: '/editor/appointments', icon: Plus },
    { label: 'Availability',    href: '/editor/availability', icon: Clock },
    { label: 'Block a date',    href: '/editor/availability', icon: CalendarOff },
    { label: 'Add customer',    href: '/editor/customers',    icon: UserPlus },
    { label: 'Payments',        href: '/editor/payments',     icon: CreditCard },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(act => {
        const Icon = act.icon
        return (
          <Link key={act.label} href={act.href}
                className="inline-flex items-center gap-1.5 bg-white border border-hairline px-3 py-2 text-xs font-semibold text-near-black hover:border-near-black transition-colors">
            <Icon size={13} strokeWidth={1.9} /> {act.label}
          </Link>
        )
      })}
    </div>
  )
}

function BookingSnapshotCard({ snap }: { snap: BookingSnap }) {
  const rows = [
    { label: 'Confirmed',           value: snap.booked,    color: '#0f6f3d' },
    { label: 'Pending',             value: snap.pending,   color: '#c98a14' },
    { label: 'Completed',           value: snap.completed, color: '#121212' },
    { label: 'Cancelled / no-show', value: snap.cancelled, color: '#b42828' },
  ]
  const max = Math.max(1, ...rows.map(r => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <section>
      <SectionHeader icon={BarChart3} label="Booking snapshot"
        subtitle={total === 0 ? 'No bookings yet.' : 'Your recent bookings by status.'}
        cta={{ label: 'Open bookings', href: '/editor/appointments' }} />
      <div className="bg-white border border-hairline-soft p-4 space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-32 text-2xs text-muted-text flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-2 bg-cream overflow-hidden">
              <div className="h-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }} />
            </div>
            <span className="w-8 text-right text-sm font-bold tabular-nums text-near-black">{r.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function UpcomingCard({ tomorrow, weekend }: { tomorrow: Appointment[]; weekend: Appointment[] }) {
  return (
    <section>
      <SectionHeader icon={Calendar} label="Upcoming" subtitle="Tomorrow and this weekend."
        cta={{ label: 'View all', href: '/editor/appointments' }} />
      <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
        <UpcomingRow label="Tomorrow" count={tomorrow.length} />
        <UpcomingRow label="This weekend" count={weekend.length} />
      </div>
    </section>
  )
}

function UpcomingRow({ label, count }: { label: string; count: number }) {
  return (
    <Link href="/editor/appointments" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream/60 transition-colors">
      <p className="text-sm font-semibold text-near-black">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tabular-nums text-near-black">{count === 0 ? 'Open' : `${count} booked`}</span>
        <ChevronRight size={14} className="text-muted-text" />
      </div>
    </Link>
  )
}

function HealthMetricCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div className="bg-white border border-hairline-soft p-4">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow font-bold tracking-[0.12em] uppercase text-muted-text">{label}</p>
        <Icon size={13} className="text-muted-text" strokeWidth={1.8} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-near-black leading-tight mt-1">{value}</p>
      <p className="text-2xs text-muted-text mt-0.5">{sub}</p>
    </div>
  )
}

function GrowthOpportunitiesCard({ items }: { items: GrowthOpp[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <SectionHeader icon={Zap} label="Growth opportunities" subtitle="Small moves that could add bookings." />
      <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
        {items.map((it, i) => (
          <Link key={i} href={it.href} className="flex items-start gap-3 px-4 py-3 hover:bg-cream/60 transition-colors">
            <span className="w-6 h-6 bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={12} className="text-warning-icon" />
            </span>
            <p className="flex-1 text-sm text-near-black leading-snug">{it.text}</p>
            <span className="flex items-center gap-1 text-2xs font-semibold text-near-black whitespace-nowrap mt-0.5">{it.cta} <ArrowRight size={12} /></span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── Dashboard 2.0 derivation helpers ─────────────────────────────────────────

function computeTodayScheduled(today: Appointment[]): number {
  return round2(today.reduce((s, a) => s + (typeof a.service_price === 'number' ? a.service_price : 0), 0))
}

interface AttentionItem { label: string; detail: string; count: number; href: string }
function computeAttention(appts: Appointment[], todayStr: string): { items: AttentionItem[]; total: number } {
  const ACTIVE_DISPUTE = ['warning_needs_response', 'warning_under_review', 'needs_response', 'under_review']
  const pending = appts.filter(a => a.status === 'pending').length
  const paymentIssues = appts.filter(a =>
    a.status !== 'cancelled' && (
      a.payment_status === 'failed' ||
      (a.dispute_status ? ACTIVE_DISPUTE.includes(a.dispute_status) : false)
    )).length
  const overdue = appts.filter(a =>
    a.status !== 'cancelled' && a.status !== 'no_show' &&
    typeof a.amount_due === 'number' && a.amount_due > 0 &&
    a.payment_status !== 'paid' && a.appointment_date < todayStr).length
  const items: AttentionItem[] = []
  if (pending) items.push({ label: 'Booking requests', detail: 'Waiting for you to confirm', count: pending, href: '/editor/appointments?status=pending' })
  if (paymentIssues) items.push({ label: 'Payment issues', detail: 'Failed charges or open disputes', count: paymentIssues, href: '/editor/payments?tab=transactions' })
  if (overdue) items.push({ label: 'Unpaid balances', detail: 'Past appointments with money owed', count: overdue, href: '/editor/payments?tab=transactions' })
  return { items, total: pending + paymentIssues + overdue }
}

interface BookingSnap { booked: number; pending: number; completed: number; cancelled: number }
function computeBookingSnap(appts: Appointment[]): BookingSnap {
  let booked = 0, pending = 0, completed = 0, cancelled = 0
  for (const a of appts) {
    if (a.status === 'confirmed') booked++
    else if (a.status === 'pending') pending++
    else if (a.status === 'completed') completed++
    else if (a.status === 'cancelled' || a.status === 'no_show') cancelled++
  }
  return { booked, pending, completed, cancelled }
}

interface Health { avgTicket: number; noShowRatePct: number; currency: string }
function computeHealth(appts: Appointment[]): Health {
  let paidSum = 0, paidN = 0, currency = 'USD', completed = 0, noShow = 0
  for (const a of appts) {
    if (a.currency) currency = a.currency
    const c = (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
    if (c > 0) { paidSum += c; paidN++ }
    if (a.status === 'completed') completed++
    else if (a.status === 'no_show') noShow++
  }
  return {
    avgTicket: paidN ? round2(paidSum / paidN) : 0,
    noShowRatePct: (completed + noShow) ? Math.round((noShow / (completed + noShow)) * 100) : 0,
    currency,
  }
}

function findWeekendAppts(appts: Appointment[]): Appointment[] {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const dates = new Set<string>()
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) dates.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return appts.filter(a => dates.has(a.appointment_date) && a.status !== 'cancelled')
}

interface GrowthOpp { text: string; href: string; cta: string }
function computeGrowth(appts: Appointment[]): GrowthOpp[] {
  const out: GrowthOpp[] = []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const now = new Date(); now.setHours(0, 0, 0, 0)

  // Upcoming 7 days, count per day.
  const upcoming: { iso: string; name: string; count: number }[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i)
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    upcoming.push({ iso, name: dayNames[d.getDay()], count: appts.filter(a => a.appointment_date === iso && a.status !== 'cancelled').length })
  }
  const busiest = [...upcoming].sort((a, b) => b.count - a.count)[0]
  if (busiest && busiest.count >= 4) {
    out.push({ text: `${busiest.name} is filling up (${busiest.count} booked). Open more slots or start a waitlist before it sells out.`, href: `/editor/appointments?date=${busiest.iso}`, cta: 'View day' })
  }
  const quiet = upcoming.find(d => d.count <= 1)
  if (quiet) {
    out.push({ text: `${quiet.name} is wide open. Promote it or offer a small perk to fill the gap.`, href: `/editor/appointments?date=${quiet.iso}`, cta: 'View day' })
  }

  // Busiest weekday overall.
  const byDow = [0, 0, 0, 0, 0, 0, 0]
  for (const a of appts) {
    if (a.status === 'cancelled') continue
    const d = new Date(a.appointment_date + 'T00:00:00')
    if (! isNaN(d.getTime())) byDow[d.getDay()]++
  }
  if (byDow.reduce((s, n) => s + n, 0) >= 12) {
    const maxDow = byDow.indexOf(Math.max(...byDow))
    out.push({ text: `${dayNames[maxDow]} is your busiest day overall. Consider premium pricing or extended hours.`, href: '/editor/availability', cta: 'Review hours' })
  }

  // Regulars (5+ visits in the window).
  const visits: Record<string, number> = {}
  for (const a of appts) {
    const k = (a.customer_email ?? a.customer_phone ?? a.customer_name ?? '').toLowerCase().trim()
    if (! k) continue
    visits[k] = (visits[k] ?? 0) + 1
  }
  const regulars = Object.values(visits).filter(n => n >= 5).length
  if (regulars > 0) {
    out.push({ text: `You have ${regulars} regular${regulars === 1 ? '' : 's'} with 5+ visits. A VIP perk could keep them coming back.`, href: '/editor/customers', cta: 'See customers' })
  }

  return out.slice(0, 3)
}

function fmtWeekday(iso: string): string {
  if (! iso) return ''
  const [y, m, d] = iso.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

// A13 — daily-rotating tip for the hero. Deterministic by day-of-year
// so it shifts every morning without server state. ~30 tips means a
// repeat once a month, low enough to stay novel for early operators.
const DAILY_TIPS = [
  'A short tagline on your booking page makes a stronger first impression than a long bio.',
  'Block off your own buffer between customers. Customers respect schedules that respect you.',
  'A clear cancellation policy actually reduces cancellations, not increases them.',
  'Photos in your gallery sell more than descriptions do. Two minutes of phone uploads goes a long way.',
  'Confirmation emails are quiet brand moments. Make them sound like you.',
  'A deposit of even 20% cuts no-shows by half. Sweet spot for most brands.',
  'Returning customers are 7× more valuable than new ones. Treat them like it.',
  'Empty slots? Post one or two on Instagram Stories with your booking link. Fastest fill there is.',
  'Quick win: send a "thanks, see you again" note 24 hours after their appointment.',
  'Saturday afternoons fill up fastest. Don\'t leave them last on your calendar.',
  'A 5-photo gallery converts twice as well as a 15-photo one. Curate, don\'t cram.',
  'The fastest growth lever is making the booking page easy to share, so copy it now.',
  'Add a tip prompt to your confirmation emails. Most customers want to; few remember unless asked.',
  'Re-engage a "we haven\'t seen you in a while" customer with a personal note, not a discount.',
  'New customers book based on your photos. Returning customers book based on your reliability.',
  'A short FAQ on your booking page cuts back-and-forth emails by ~80%.',
  'Your hours are a brand statement. Closing earlier than competitors can read as premium.',
  'The customers who tip the best are the ones who feel remembered. Use your notes column.',
  'A "what to expect" section reduces first-visit anxiety dramatically.',
  'Your booking confirmation page is your second chance at a first impression.',
  'Don\'t apologize for full days. Booked-out is your strongest marketing.',
  'Add buffer time between back-to-back services. Burnout is a slow leak.',
  'A simple "running 10 minutes behind" text from you is worth more than a long apology after.',
  'Refer-a-friend works best as a thank-you, not a transaction. No formal discount needed.',
  'Group your services by occasion (weekend reset, before vacation) on your page, not just by name.',
  'A handful of well-priced staple services beats a sprawling menu, every time.',
  'Photograph the chair you actually use. Authenticity reads in seconds.',
  'A "what to bring / what to wear" line on your booking page prevents reschedules.',
  'Sunday night is the busiest booking time of the week. Make sure your page is up.',
  'Your bio doesn\'t need to be clever. It needs to make one customer feel like you get them.',
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

// ────────────────────────────────────────────────────────────────────────────
// Team-this-week breakdown (Studio/Salon only)
// ────────────────────────────────────────────────────────────────────────────

interface TeamWeekRow {
  staffId:  number
  name:     string
  appts:    number
  revenue:  number
}

/**
 * Per-staff breakdown for the current week (Mon-Sun, same window as
 * computeRevenueWeek). Rows without an assigned staff_id are skipped —
 * on a Studio account these usually represent legacy "any staff" rows
 * before the team was set up, and rolling them into a single ghost row
 * would mislead. Sorted by revenue descending so the biggest performer
 * is on top.
 *
 * Revenue is bucketed by `appointment_date` (when the work happens), not
 * `created_at` (when it was booked). For a per-staff "this week" view,
 * the owner wants to see which staff are filling the week ahead, not
 * which staff happened to take a booking that landed this week. Matches
 * how a staff member would read their own schedule.
 */
function computeTeamWeek(appts: Appointment[]): TeamWeekRow[] {
  // Monday..Sunday of this week. Same calculation as computeRevenueWeek
  // so the totals reconcile.
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  const dow    = today.getDay()
  const back   = (dow + 6) % 7
  const monday = new Date(today); monday.setDate(today.getDate() - back)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const mondayISO = isoDate(monday)
  const sundayISO = isoDate(sunday)

  const rows: Record<number, TeamWeekRow> = {}
  for (const a of appts) {
    if (! a.staff_id) continue
    if (a.status === 'cancelled' || a.status === 'no_show') continue
    if (a.appointment_date < mondayISO || a.appointment_date > sundayISO) continue
    const id   = a.staff_id
    const name = a.staff_name?.trim() || `Staff #${id}`
    if (! rows[id]) rows[id] = { staffId: id, name, appts: 0, revenue: 0 }
    rows[id].appts  += 1
    rows[id].revenue += (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
  }
  return Object.values(rows)
    .map(r => ({ ...r, revenue: round2(r.revenue) }))
    .sort((a, b) => b.revenue - a.revenue || b.appts - a.appts)
}

function TeamThisWeekSection({ rows, currency }: { rows: TeamWeekRow[]; currency: string }) {
  const totalAppts   = rows.reduce((s, r) => s + r.appts,   0)
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  return (
    <section>
      <SectionHeader
        icon={Users}
        label="By staff this week"
        subtitle={`${rows.length} ${rows.length === 1 ? 'person' : 'people'} on the floor · ${totalAppts} appointment${totalAppts === 1 ? '' : 's'} · ${money(totalRevenue, currency)} booked`}
        cta={{ label: 'Manage staff', href: '/editor/staff' }}
      />
      <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
        {rows.map(r => (
          <Link
            key={r.staffId}
            href={`/editor/appointments?staff_id=${r.staffId}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors"
          >
            <div className="w-8 h-8 bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0">
              <span className="text-eyebrow font-bold text-near-black">{initials(r.name)}</span>
            </div>
            <p className="flex-1 text-sm font-semibold text-near-black truncate">{r.name}</p>
            <p className="text-2xs text-muted-text whitespace-nowrap">{r.appts} appt{r.appts === 1 ? '' : 's'}</p>
            <p className="text-sm font-bold tabular-nums text-near-black whitespace-nowrap">{money(r.revenue, currency)}</p>
            <ChevronRight size={13} className="text-muted-text flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  )
}
