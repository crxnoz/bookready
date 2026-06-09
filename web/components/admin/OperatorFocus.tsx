'use client'

import Link from 'next/link'
import { Hourglass, UserMinus, CalendarCheck, PieChart, ExternalLink } from 'lucide-react'
import type { AdminDashboardSummary } from '@/lib/api'
import { money, relTime } from './_parts'
import { cn } from '@/lib/cn'

/**
 * #153 — Operator focus.
 *
 * Sits below the Phase-1 dashboard. Four daily-action panels:
 *   1. Per-plan revenue (current MRR by plan) — derived client-side from
 *      the existing mrr_series; no extra data needed.
 *   2. Today's signups — count + list (truncated to whatever falls in
 *      the activity feed, which the controller caps at 12).
 *   3. Currently trialing — list of tenants whose subscription_state is
 *      'trialing', newest first, with days-in-trial.
 *   4. Abandoned checkouts — tenants in 'trial_expired' or 'cancelled'
 *      state from the last 30 days. The owner-reach-out surface.
 *
 * All four panels link to /admin/tenants/{slug} for the per-tenant
 * detail page, so the operator can act on each row in one click.
 */

const PLAN_COLORS: Record<string, string> = {
  solo:   '#E0C7D2',
  studio: '#B98AA8',
  salon:  '#7A5B86',
}

const STATE_LABEL: Record<string, string> = {
  trial_expired: 'Trial expired',
  cancelled:     'Cancelled',
}

const STATE_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  trial_expired: { fg: '#b42828', bg: 'rgba(180,40,40,0.06)',  border: 'rgba(180,40,40,0.20)' },
  cancelled:     { fg: 'rgba(18,18,18,0.65)', bg: 'rgba(18,18,18,0.04)', border: 'rgba(18,18,18,0.15)' },
}

export default function OperatorFocus({ data }: { data: AdminDashboardSummary | null }) {
  if (!data) return null
  const focus = data.operator_focus
  if (!focus) return null  // older cached payload — skip the section

  const latest = data.mrr_series[data.mrr_series.length - 1]
  const todaySignups = todaysActivityItems(data.activity)

  return (
    <section className="mb-2">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-near-black tracking-tight">Operator focus</h2>
        <p className="text-xs text-muted-text">
          Today's pipeline, who to chase, and where to step in.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PerPlanRevenue latest={latest} catalog={data.plan_catalog} />
        <TodaySignups count={focus.signups_today} items={todaySignups} />
        <CurrentlyTrialing items={focus.trialing} catalog={data.plan_catalog} />
        <AbandonedCheckouts items={focus.abandoned} catalog={data.plan_catalog} />
      </div>
    </section>
  )
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Panel({
  title, subtitle, icon: Icon, children,
}: {
  title: string
  subtitle?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-near-black">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-text mt-0.5">{subtitle}</p>}
        </div>
        <Icon size={14} className="text-muted-text flex-shrink-0 mt-0.5" />
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-3 text-[12px] text-muted-text">{children}</div>
  )
}

function TenantLink({ slug }: { slug: string }) {
  return (
    <>
      <Link href={`/admin/tenants/${slug}`} className="font-semibold text-near-black hover:underline">
        {slug}
      </Link>
      <a
        href={`https://${slug}.bkrdy.me`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-text hover:text-near-black ml-1"
        title="Open public site"
      >
        <ExternalLink size={9} className="inline" />
      </a>
    </>
  )
}

function planPill(plan: string | null) {
  if (!plan) return <span className="text-[10px] text-muted-text">no plan</span>
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-text">
      <span
        className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
        style={{ background: PLAN_COLORS[plan] ?? 'rgba(18,18,18,0.30)' }}
      />
      {plan}
    </span>
  )
}

// ── Per-plan revenue ──────────────────────────────────────────────────────────

function PerPlanRevenue({
  latest, catalog,
}: {
  latest: AdminDashboardSummary['mrr_series'][number] | undefined
  catalog: AdminDashboardSummary['plan_catalog']
}) {
  const order: ('solo' | 'studio' | 'salon')[] = ['solo', 'studio', 'salon']
  const total = latest ? latest.solo + latest.studio + latest.salon : 0

  return (
    <Panel title="Revenue by plan" subtitle="Where the MRR is coming from right now" icon={PieChart}>
      {total === 0 ? (
        <Empty>No paid plans yet. Tracks here once tenants convert from trial.</Empty>
      ) : (
        <div className="space-y-2.5">
          {order.map(plan => {
            const cents = latest![plan]
            const pct = total > 0 ? (cents / total) * 100 : 0
            return (
              <div key={plan}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-[12px] text-near-black">
                    {catalog[plan]?.label ?? plan}
                  </span>
                  <span className="text-[12px] text-muted-text">
                    <span className="font-semibold text-near-black">{money(cents)}</span>
                    <span className="ml-1.5">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 bg-[rgba(18,18,18,0.04)] overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{ width: `${pct}%`, background: PLAN_COLORS[plan] }}
                  />
                </div>
              </div>
            )
          })}
          <div className="pt-1 mt-1 border-t border-[rgba(18,18,18,0.06)] flex items-baseline justify-between">
            <span className="text-[11px] text-muted-text">Total MRR</span>
            <span className="text-[14px] font-bold text-near-black">{money(total)}<span className="text-[10px] font-normal text-muted-text">/mo</span></span>
          </div>
        </div>
      )}
    </Panel>
  )
}

// ── Today's signups ───────────────────────────────────────────────────────────

function todaysActivityItems(activity: AdminDashboardSummary['activity']) {
  const today = new Date().toDateString()
  return activity.filter(a => {
    const d = new Date(a.ts)
    return !Number.isNaN(d.getTime()) && d.toDateString() === today
  })
}

function TodaySignups({
  count, items,
}: {
  count: number
  items: AdminDashboardSummary['activity']
}) {
  const truncated = count > items.length
  return (
    <Panel
      title="Today's signups"
      subtitle={count === 0 ? 'No new tenants yet today' : `${count} new tenant${count === 1 ? '' : 's'}`}
      icon={CalendarCheck}
    >
      {count === 0 ? (
        <Empty>Quiet so far. New signups land here as they come in.</Empty>
      ) : (
        <>
          <p className="text-3xl font-bold text-near-black tracking-tight leading-none mb-3">
            {count}
          </p>
          <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-1">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  it.state === 'active' ? 'bg-[#0f6f3d]' : 'bg-[#C9A876]',
                )} />
                <div className="min-w-0 flex-1 text-[12px]">
                  <TenantLink slug={it.tenant} />
                </div>
                {planPill(it.plan)}
                <span className="text-[10px] text-muted-text w-12 text-right flex-shrink-0">
                  {relTime(it.ts)}
                </span>
              </li>
            ))}
          </ul>
          {truncated && (
            <p className="text-[10px] text-muted-text mt-2">
              Showing {items.length} of {count}; rest live on{' '}
              <Link href="/admin/tenants" className="underline hover:text-near-black">All tenants</Link>.
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

// ── Currently trialing ────────────────────────────────────────────────────────

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)))
}

const TRIAL_LENGTH_DAYS = 14  // matches the migration comment

function CurrentlyTrialing({
  items, catalog,
}: {
  items: NonNullable<AdminDashboardSummary['operator_focus']>['trialing']
  catalog: AdminDashboardSummary['plan_catalog']
}) {
  return (
    <Panel
      title="Currently trialing"
      subtitle={items.length === 0 ? 'No active trials' : `${items.length} on trial`}
      icon={Hourglass}
    >
      {items.length === 0 ? (
        <Empty>No-one's mid-trial right now.</Empty>
      ) : (
        <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-1">
          {items.map((it, i) => {
            const days = daysSince(it.created_at)
            const remaining = days != null ? Math.max(0, TRIAL_LENGTH_DAYS - days) : null
            const urgent = remaining != null && remaining <= 3
            return (
              <li key={i} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1 text-[12px]">
                  <TenantLink slug={it.slug} />
                </div>
                {planPill(it.plan)}
                <span
                  className={cn(
                    'text-[10px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border flex-shrink-0',
                    urgent
                      ? 'border-[rgba(180,40,40,0.25)] bg-[rgba(180,40,40,0.06)] text-[#b42828]'
                      : 'border-[rgba(18,18,18,0.12)] bg-blush text-[rgba(18,18,18,0.65)]',
                  )}
                  title={it.created_at ? `Trial started ${new Date(it.created_at).toLocaleDateString()}` : ''}
                >
                  {remaining != null
                    ? `${remaining}d left`
                    : `day ${days ?? '?'}`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// ── Abandoned checkouts ───────────────────────────────────────────────────────

function AbandonedCheckouts({
  items, catalog,
}: {
  items: NonNullable<AdminDashboardSummary['operator_focus']>['abandoned']
  catalog: AdminDashboardSummary['plan_catalog']
}) {
  return (
    <Panel
      title="Abandoned checkouts"
      subtitle={items.length === 0 ? 'No abandonments in the last 30 days' : `${items.length} in the last 30 days`}
      icon={UserMinus}
    >
      {items.length === 0 ? (
        <Empty>Nothing to chase. Trial expirations and cancellations from the last 30 days show up here.</Empty>
      ) : (
        <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-1">
          {items.map((it, i) => {
            const tone = STATE_TONE[it.state ?? ''] ?? STATE_TONE.cancelled
            return (
              <li key={i} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1 text-[12px]">
                  <TenantLink slug={it.slug} />
                </div>
                {planPill(it.plan)}
                <span
                  className="text-[10px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border flex-shrink-0"
                  style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
                >
                  {STATE_LABEL[it.state ?? ''] ?? it.state ?? 'unknown'}
                </span>
                <span className="text-[10px] text-muted-text w-12 text-right flex-shrink-0">
                  {it.created_at ? relTime(it.created_at) : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
