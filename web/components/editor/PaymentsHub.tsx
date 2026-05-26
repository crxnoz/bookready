'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard, DollarSign, Receipt, Banknote, Settings as SettingsIcon,
  Loader2, AlertCircle, ChevronRight, ExternalLink, ArrowRight, Calendar,
  Search, Hash, ArrowDownToLine,
} from 'lucide-react'
import {
  getConnectDashboardLink,
  getEditorAppointments,
  getEditorPaymentSettings,
  getEditorPaymentsPayouts,
  getEditorPaymentsTransactions,
} from '@/lib/api'
import type {
  Appointment,
  PaymentSettings,
  PaymentStatus,
  PaymentTransaction,
  StripePayout,
} from '@/lib/types'
import { PaymentPill, PaymentSummary } from '@/components/editor/AppointmentPaymentStatus'
import { cn } from '@/lib/cn'

type SubTab = 'overview' | 'deposits' | 'transactions' | 'payouts'

const VALID_TABS: SubTab[] = ['overview', 'deposits', 'transactions', 'payouts']

function hrefFor(tab: SubTab): string {
  return tab === 'overview' ? '/editor/payments' : `/editor/payments?tab=${tab}`
}

export default function PaymentsHub() {
  const sp  = useSearchParams()
  const raw = sp?.get('tab') ?? 'overview'
  const tab: SubTab = VALID_TABS.includes(raw as SubTab) ? (raw as SubTab) : 'overview'

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
      {/* Phase 15 — tab nav. Always visible so the owner can hop between
          Overview / Deposits / Transactions / Payouts without using the
          URL bar. Sticky-feeling row, same chip style as Bookings. */}
      <div className="flex flex-row overflow-x-auto gap-1.5 -mx-1 px-1 pb-1">
        {([
          { key: 'overview',     label: 'Overview',     icon: SettingsIcon },
          { key: 'deposits',     label: 'Deposits',     icon: DollarSign },
          { key: 'transactions', label: 'Transactions', icon: Receipt },
          { key: 'payouts',      label: 'Payouts',      icon: Banknote },
        ] as const).map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <Link
              key={key}
              href={hrefFor(key)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5 border whitespace-nowrap flex-shrink-0 transition-colors',
                active
                  ? 'bg-near-black border-near-black text-white'
                  : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black',
              )}
            >
              <Icon size={11} /> {label}
            </Link>
          )
        })}
      </div>

      {tab === 'overview'     && <PaymentsOverview />}
      {tab === 'deposits'     && <DepositsList />}
      {tab === 'transactions' && <TransactionsList />}
      {tab === 'payouts'      && <PayoutsList />}
    </div>
  )
}

// ── Aggregates ──────────────────────────────────────────────────────────────

interface PaymentSummary {
  totalDepositsCollected: number
  pendingDepositCount:    number
  depositPaidCount:       number
  remainingBalanceTotal:  number
  failedPaymentCount:     number
  currency:               string
}

function computeSummary(appts: Appointment[]): PaymentSummary {
  let totalCollected = 0
  let remaining      = 0
  let pending        = 0
  let paid           = 0
  let failed         = 0
  let currency       = 'USD'

  for (const a of appts) {
    if (a.currency) currency = a.currency

    const s = a.payment_status
    if (!s || s === 'none') continue

    if (s === 'pending_payment') pending++
    if (s === 'deposit_paid' || s === 'paid') paid++
    if (s === 'failed') failed++

    if (typeof a.deposit_paid_amount === 'number' && a.deposit_paid_amount > 0) {
      totalCollected += a.deposit_paid_amount
    }
    // Remaining balance is only meaningful for non-cancelled, deposit-paid
    // appointments. We don't track future top-up payments yet — this is
    // "what the business is still owed at the appointment".
    if ((s === 'deposit_paid' || s === 'paid') && a.status !== 'cancelled'
        && typeof a.amount_due === 'number' && a.amount_due > 0) {
      remaining += a.amount_due
    }
  }

  return {
    totalDepositsCollected: round2(totalCollected),
    pendingDepositCount:    pending,
    depositPaidCount:       paid,
    remainingBalanceTotal:  round2(remaining),
    failedPaymentCount:     failed,
    currency,
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
function fmtMoney(n: number, cur: string): string {
  const sym = cur.toUpperCase() === 'USD' ? '$' : ''
  return `${sym}${n.toFixed(2)}`
}

function fmtApptDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ── Overview ────────────────────────────────────────────────────────────────

function PaymentsOverview() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [appts,    setAppts]    = useState<Appointment[] | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorPaymentSettings(),
      getEditorAppointments({ limit: 200 }),
    ])
      .then(([s, list]) => {
        if (cancelled) return
        setSettings(s)
        setAppts(list)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingRow />
  if (error)   return <ErrorRow message={error} />

  const summary = computeSummary(appts ?? [])
  const recent = (appts ?? [])
    .filter(a => a.payment_status && a.payment_status !== 'none')
    .sort((a, b) => {
      // Most recent activity first — paid_at if present, else updated_at
      const aKey = a.paid_at || a.updated_at || ''
      const bKey = b.paid_at || b.updated_at || ''
      return bKey.localeCompare(aKey)
    })
    .slice(0, 8)

  const stripeNeedsAttention = settings?.payments_enabled
    && settings?.stripe_connect_status !== 'active'

  const hasConnectedAccount = !! settings?.stripe_connect_account_id
    && ['active', 'pending', 'restricted'].includes(settings?.stripe_connect_status ?? '')

  return (
    <>
      {stripeNeedsAttention && (
        <div className="bg-white border border-[rgba(180,120,0,0.35)] p-3.5 flex items-start gap-3">
          <AlertCircle size={14} className="text-[#8a5a00] flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#8a5a00]">Stripe not fully connected</p>
            <p className="text-[11px] text-muted-text mt-0.5">
              Customers can&apos;t complete payment until Stripe is active. Finish onboarding to start accepting deposits.
            </p>
          </div>
          <Link
            href="/editor/settings?tab=payments"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-1.5 hover:bg-[#2a2a2a] flex-shrink-0"
          >
            Open Settings
          </Link>
        </div>
      )}

      {hasConnectedAccount && (
        <StripeDashboardButton />
      )}

      {/* Headline numbers — every card is a Link with a "View →" cue.
          The Customer-Payments card lands on Stripe Settings so the
          owner can flip the master toggle (or finish Connect onboarding). */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Total collected"
          value={fmtMoney(summary.totalDepositsCollected, summary.currency)}
          accent="positive"
          href="/editor/payments?tab=transactions&filter=paid"
        />
        <StatCard
          label="Remaining balance"
          value={fmtMoney(summary.remainingBalanceTotal, summary.currency)}
          accent="default"
          hint="Owed at appointment"
          href="/editor/payments?tab=transactions&filter=deposits"
          cta="See deposits"
        />
        <StatCard
          label="Deposits paid"
          value={String(summary.depositPaidCount)}
          accent="positive"
          href="/editor/payments?tab=transactions&filter=deposits"
        />
        <StatCard
          label="Deposits pending"
          value={String(summary.pendingDepositCount)}
          accent={summary.pendingDepositCount > 0 ? 'warn' : 'muted'}
          href="/editor/payments?tab=deposits"
        />
        <StatCard
          label="Failed payments"
          value={String(summary.failedPaymentCount)}
          accent={summary.failedPaymentCount > 0 ? 'danger' : 'muted'}
          href="/editor/payments?tab=transactions&filter=failed"
          cta={summary.failedPaymentCount > 0 ? 'Investigate' : 'View'}
        />
        <StatCard
          label="Customer payments"
          value={settings?.payments_enabled ? 'Enabled' : 'Disabled'}
          accent={settings?.payments_enabled ? 'positive' : 'muted'}
          // Always points to Settings → Payments so the owner can either
          // flip the master toggle off, or — when Disabled — turn it on
          // and finish Stripe Connect.
          href="/editor/settings?tab=payments"
          cta={settings?.payments_enabled ? 'Manage' : 'Enable'}
        />
      </div>

      {/* Recent activity */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[rgba(18,18,18,0.08)]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Recent activity</p>
            <p className="text-[11px] text-muted-text mt-0.5">Latest customer payment status changes.</p>
          </div>
          {recent.length > 0 && (
            <Link
              href={hrefFor('deposits')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] uppercase text-near-black hover:underline"
            >
              View all <ChevronRight size={11} />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[11px] text-muted-text">
              No payment activity yet. Once customers start paying deposits they&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(18,18,18,0.06)]">
            {recent.map(a => <ActivityRow key={a.id} appt={a} />)}
          </div>
        )}
      </section>

      {/* Footer CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CardLink
          href="/editor/settings?tab=payments"
          icon={SettingsIcon}
          title="Manage payment settings"
          body="Connect Stripe, configure deposits, choose currency."
          external
          primary
        />
        <CardLink
          href={hrefFor('deposits')}
          icon={DollarSign}
          title="Deposits"
          body="See which appointments need a deposit and which have paid."
        />
      </div>
    </>
  )
}

// ── Deposits list with filters ──────────────────────────────────────────────

type FilterKey = 'all' | 'pending' | 'paid' | 'failed' | 'none'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid',    label: 'Deposit paid' },
  { key: 'failed',  label: 'Failed' },
  { key: 'none',    label: 'No payment required' },
]

function matchesFilter(a: Appointment, f: FilterKey): boolean {
  const s = a.payment_status
  switch (f) {
    case 'all':     return true
    case 'pending': return s === 'pending_payment'
    case 'paid':    return s === 'deposit_paid' || s === 'paid'
    case 'failed':  return s === 'failed'
    case 'none':    return !s || s === 'none'
  }
}

function DepositsList() {
  const [appts,   setAppts]   = useState<Appointment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [filter,  setFilter]  = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    getEditorAppointments({ limit: 200 })
      .then(a => { if (!cancelled) setAppts(a) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const counts = useMemo(() => {
    if (!appts) return null
    const c: Record<FilterKey, number> = { all: 0, pending: 0, paid: 0, failed: 0, none: 0 }
    for (const a of appts) {
      c.all++
      if (matchesFilter(a, 'pending')) c.pending++
      if (matchesFilter(a, 'paid'))    c.paid++
      if (matchesFilter(a, 'failed'))  c.failed++
      if (matchesFilter(a, 'none'))    c.none++
    }
    return c
  }, [appts])

  const filtered = useMemo(() => {
    if (!appts) return []
    return appts
      .filter(a => matchesFilter(a, filter))
      .sort((a, b) => {
        const aKey = (a.appointment_date ?? '') + (a.start_time ?? '')
        const bKey = (b.appointment_date ?? '') + (b.start_time ?? '')
        return bKey.localeCompare(aKey)
      })
  }, [appts, filter])

  if (loading) return <LoadingRow />
  if (error)   return <ErrorRow message={error} />

  return (
    <>
      {/* Filter chips */}
      <div className="flex flex-row overflow-x-auto gap-1.5 -mx-1 px-1 pb-1">
        {FILTERS.map(f => {
          const active = filter === f.key
          const n = counts?.[f.key]
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5 border whitespace-nowrap flex-shrink-0',
                active
                  ? 'bg-near-black border-near-black text-white'
                  : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black',
              )}
            >
              {f.label}
              {typeof n === 'number' && (
                <span className={cn(
                  'text-[9px] font-bold tracking-[0.04em] px-1 py-px',
                  active ? 'bg-white/10 text-white' : 'bg-cream text-muted-text',
                )}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 text-center">
          <p className="text-[11px] text-muted-text">
            {filter === 'none'
              ? 'No appointments without a payment requirement match.'
              : 'No appointments match this filter yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
          {filtered.map(a => <ActivityRow key={a.id} appt={a} dense={false} />)}
        </div>
      )}
    </>
  )
}

// ── Shared activity row ─────────────────────────────────────────────────────

function ActivityRow({ appt, dense = true }: { appt: Appointment; dense?: boolean }) {
  const hasPayment = appt.payment_status && appt.payment_status !== 'none'
  return (
    <Link
      href="/editor/appointments"
      className="block px-4 py-3 hover:bg-cream/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {appt.receipt_number && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-near-black px-2 py-0.5 tabular-nums">
                <Hash size={9} /> {appt.receipt_number.replace(/^R-/, '')}
              </span>
            )}
            <p className={cn('font-bold text-near-black truncate', dense ? 'text-[13px]' : 'text-sm')}>
              {appt.customer_name}
            </p>
            {hasPayment ? <PaymentPill appt={appt} /> : (
              <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] bg-cream text-muted-text px-1.5 py-0.5">
                No payment
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-text truncate flex items-center gap-1">
            {appt.service_name}
            <span className="text-muted-text">·</span>
            <Calendar size={10} />
            {fmtApptDate(appt.appointment_date)}
            <span className="text-muted-text">·</span>
            {fmt12(appt.start_time)}
          </p>
          <PaymentSummary appt={appt} />
        </div>
        <ArrowRight size={12} className="text-muted-text mt-1 flex-shrink-0" />
      </div>
    </Link>
  )
}

// ── Tiny shared bits ────────────────────────────────────────────────────────

function StatCard({
  label, value, accent = 'default', hint, href, cta,
}: {
  label: string
  value: string
  accent?: 'default' | 'positive' | 'muted' | 'warn' | 'danger'
  hint?:  string
  /** When set, the whole card becomes a Link with a "View →" affordance.
   *  Matches the pattern used on the Bookings dashboard stats. */
  href?:  string
  /** Override the CTA verb (e.g. "Enable" instead of "View"). */
  cta?:   string
}) {
  const body = (
    <>
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</p>
      <p className={cn(
        'text-lg font-bold mt-1 tracking-tight tabular-nums',
        accent === 'positive' ? 'text-[#0f6f3d]'
          : accent === 'warn'  ? 'text-[#8a5a00]'
          : accent === 'danger'? 'text-[#b42828]'
          : accent === 'muted' ? 'text-muted-text'
          : 'text-near-black',
      )}>{value}</p>
      {hint && <p className="text-[10px] text-muted-text mt-0.5">{hint}</p>}
      {href && (
        <p className="text-[9px] font-semibold text-muted-text group-hover:text-near-black mt-1 inline-flex items-center gap-0.5">
          {cta ?? 'View'} <ChevronRight size={10} />
        </p>
      )}
    </>
  )
  if (href) {
    return (
      <Link
        href={href}
        className="group bg-white border border-[rgba(18,18,18,0.10)] px-3.5 py-3 block hover:bg-cream transition-colors"
      >
        {body}
      </Link>
    )
  }
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] px-3.5 py-3">
      {body}
    </div>
  )
}

function CardLink({
  href, icon: Icon, title, body, soon, external, primary,
}: {
  href: string
  icon: React.ElementType
  title: string
  body: string
  soon?:     boolean
  external?: boolean
  primary?:  boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-start gap-3 border px-3.5 py-3 transition-colors',
        primary
          ? 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black'
          : 'bg-white border-[rgba(18,18,18,0.10)] text-near-black hover:border-near-black',
        soon && 'opacity-70',
      )}
    >
      <span className={cn(
        'w-8 h-8 flex items-center justify-center flex-shrink-0 border',
        primary
          ? 'bg-white/10 border-white/20 text-white group-hover:bg-cream group-hover:text-near-black group-hover:border-[rgba(18,18,18,0.08)]'
          : 'bg-cream border-[rgba(18,18,18,0.08)] text-near-black',
      )}>
        <Icon size={14} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('text-[13px] font-semibold', primary ? 'text-white group-hover:text-near-black' : 'text-near-black')}>{title}</p>
          {soon && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-1.5 py-0.5">
              Soon
            </span>
          )}
        </div>
        <p className={cn('text-[11px] mt-0.5', primary ? 'text-white/75 group-hover:text-muted-text' : 'text-muted-text')}>{body}</p>
      </div>
      {external
        ? <ExternalLink size={13} className={cn('mt-1 flex-shrink-0', primary ? 'text-white/75 group-hover:text-muted-text' : 'text-muted-text group-hover:text-near-black')} />
        : <ChevronRight size={14} className={cn('mt-1 flex-shrink-0', primary ? 'text-white/75 group-hover:text-muted-text' : 'text-muted-text group-hover:text-near-black')} />}
    </Link>
  )
}

// ── Transactions tab (Phase 15) ─────────────────────────────────────────────

type TxFilter = 'all' | 'deposits' | 'paid' | 'refunded' | 'disputed' | 'failed'

const TX_FILTERS: { key: TxFilter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'deposits', label: 'Deposit only' },
  { key: 'paid',     label: 'Paid in full' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'failed',   label: 'Failed' },
]

function TransactionsList() {
  const sp = useSearchParams()
  const initialFilter: TxFilter = (() => {
    const raw = sp?.get('filter') ?? 'all'
    return (TX_FILTERS.find(f => f.key === raw)?.key ?? 'all') as TxFilter
  })()

  const [filter, setFilter]   = useState<TxFilter>(initialFilter)
  const [search, setSearch]   = useState('')
  const [committed, setCommitted] = useState('')
  const [rows, setRows]       = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Debounce the search so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setCommitted(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEditorPaymentsTransactions({ filter, search: committed, limit: 100 })
      .then(res => { if (! cancelled) setRows(res.transactions) })
      .catch(e => { if (! cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filter, committed])

  return (
    <>
      {/* Search bar — Hash icon hints that receipt #s are first-class here. */}
      <div className="relative">
        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
        <input
          type="text"
          placeholder="Search by receipt #, customer, or service…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-[rgba(18,18,18,0.15)] bg-white pl-9 pr-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-text hover:text-near-black"
            aria-label="Clear search"
          >
            <Search size={14} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-row overflow-x-auto gap-1.5 -mx-1 px-1 pb-1">
        {TX_FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5 border whitespace-nowrap flex-shrink-0',
                active
                  ? 'bg-near-black border-near-black text-white'
                  : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingRow />
      ) : error ? (
        <ErrorRow message={error} />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 text-center">
          <p className="text-[11px] text-muted-text">
            {committed
              ? `No transactions match “${committed}”.`
              : 'No transactions match this filter yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => <TransactionRow key={r.appointment_id} r={r} />)}
        </div>
      )}
    </>
  )
}

function TransactionRow({ r }: { r: PaymentTransaction }) {
  const sym = (r.currency ?? 'USD').toUpperCase() === 'USD' ? '$' : ''
  return (
    <Link
      href={`/editor/appointments?customer_id=${r.customer_id ?? ''}`}
      className="block px-4 py-3 hover:bg-cream/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {r.receipt_number && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-near-black px-2 py-0.5 tabular-nums">
                <Hash size={9} /> {r.receipt_number.replace(/^R-/, '')}
              </span>
            )}
            <p className="text-[13px] font-bold text-near-black truncate">{r.customer_name}</p>
            <TxStatusPill r={r} />
            {r.payment_method && (
              <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] bg-white text-muted-text px-1.5 py-0.5">
                {r.payment_method}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-text truncate flex items-center gap-1">
            {r.service_name}
            <span className="text-muted-text">·</span>
            <Calendar size={10} />
            {fmtApptDate(r.appointment_date)}
            <span className="text-muted-text">·</span>
            {fmt12(r.start_time)}
          </p>
          <p className="text-[11px] text-near-black font-semibold tabular-nums">
            {sym}{r.paid_amount.toFixed(2)}
            {(r.tip_amount ?? 0) > 0 && (
              <span className="text-[#0f6f3d] ml-2">+ {sym}{(r.tip_amount ?? 0).toFixed(2)} tip</span>
            )}
            {(r.refunded_amount ?? 0) > 0 && (
              <span className="text-muted-text ml-2">− {sym}{(r.refunded_amount ?? 0).toFixed(2)} refund</span>
            )}
            {(r.amount_due ?? 0) > 0 && (
              <span className="text-[#b42828] ml-2">{sym}{(r.amount_due ?? 0).toFixed(2)} due</span>
            )}
          </p>
        </div>
        <ArrowRight size={12} className="text-muted-text mt-1 flex-shrink-0" />
      </div>
    </Link>
  )
}

function TxStatusPill({ r }: { r: PaymentTransaction }) {
  const map: Record<string, { label: string; cls: string }> = {
    deposit_paid:       { label: 'Deposit',      cls: 'bg-lavender text-near-black' },
    paid:               { label: 'Paid',         cls: 'bg-near-black text-white' },
    refunded:           { label: 'Refunded',     cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' },
    partially_refunded: { label: 'Part refund',  cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-near-black' },
    failed:             { label: 'Failed',       cls: 'bg-[#fff3f3] border border-[rgba(180,40,40,0.30)] text-[#b42828]' },
  }
  if (r.dispute_status) {
    return (
      <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-[#fff3f3] border border-[rgba(180,40,40,0.30)] text-[#b42828] px-1.5 py-0.5">
        Dispute · {r.dispute_status.replace(/_/g, ' ')}
      </span>
    )
  }
  const cfg = map[r.payment_status] ?? { label: r.payment_status, cls: 'bg-cream text-muted-text' }
  return (
    <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ── Payouts tab (Phase 15) ──────────────────────────────────────────────────

function PayoutsList() {
  const [data, setData]       = useState<{ payouts: StripePayout[]; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPaymentsPayouts(25)
      .then(res => { if (! cancelled) setData({ payouts: res.payouts, status: res.connect_status }) })
      .catch(e => { if (! cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingRow />
  if (error)   return <ErrorRow message={error} />
  if (! data)  return null

  // Empty state copy depends on why the list is empty.
  if (data.payouts.length === 0) {
    const isConnectMissing = ['not_connected', 'onboarding_started', 'pending', 'restricted'].includes(data.status)
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="w-10 h-10 flex items-center justify-center bg-cream border border-[rgba(18,18,18,0.08)] text-near-black flex-shrink-0">
            <Banknote size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-near-black">No payouts yet</h2>
            <p className="text-xs text-muted-text mt-1 max-w-md">
              {isConnectMissing
                ? 'Connect your Stripe account in Settings → Payments to start receiving payouts to your bank.'
                : data.status === 'error'
                  ? 'We couldn’t load payouts from Stripe right now. Try again in a moment.'
                  : 'Payouts show up here once Stripe sends a deposit to your bank — typically 1–2 business days after a charge.'}
            </p>
            {isConnectMissing && (
              <Link
                href="/editor/settings?tab=payments"
                className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-1.5 hover:bg-[#2a2a2a]"
              >
                Open Settings
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
      {data.payouts.map(p => <PayoutRow key={p.id} p={p} />)}
    </div>
  )
}

function PayoutRow({ p }: { p: StripePayout }) {
  const sym = p.currency === 'USD' ? '$' : ''
  const status = (() => {
    switch (p.status) {
      case 'paid':       return { label: 'Paid',        cls: 'bg-near-black text-white' }
      case 'pending':    return { label: 'Pending',     cls: 'bg-blush text-near-black' }
      case 'in_transit': return { label: 'In transit',  cls: 'bg-lavender text-near-black' }
      case 'canceled':   return { label: 'Canceled',    cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' }
      case 'failed':     return { label: 'Failed',      cls: 'bg-[#fff3f3] border border-[rgba(180,40,40,0.30)] text-[#b42828]' }
      default:           return { label: p.status,      cls: 'bg-cream text-muted-text' }
    }
  })()
  const arrival = new Date(p.arrival_date * 1000)
  const created = new Date(p.created_at * 1000)
  return (
    <div className="block px-4 py-3">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowDownToLine size={11} className="text-muted-text" />
            <p className="text-[13px] font-bold text-near-black tabular-nums">{sym}{p.amount.toFixed(2)} {p.currency}</p>
            <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5', status.cls)}>
              {status.label}
            </span>
            {p.method && (
              <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] bg-white text-muted-text px-1.5 py-0.5">
                {p.method}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-text">
            Initiated {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="mx-1">·</span>
            Arrives {arrival.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {p.failure_message && (
            <p className="text-[11px] text-[#b42828] mt-1">{p.failure_message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
      <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
      <AlertCircle size={14} /> {message}
    </div>
  )
}

/**
 * Mints a single-use Stripe Express dashboard URL on click and opens it
 * in a new tab. We don't pre-fetch the URL because Stripe's login link
 * expires in seconds — the only safe time to fetch it is at click time.
 */
function StripeDashboardButton() {
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  async function handleClick() {
    setErr(''); setBusy(true)
    try {
      const { url } = await getConnectDashboardLink()
      // Pop a new tab BEFORE the await would have done it — actually we already
      // awaited so just open it now. Browsers may block this when not in a
      // direct click handler; the await preceding it is short so it usually works.
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate dashboard link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 flex items-center gap-3">
      <ExternalLink size={14} className="text-near-black flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-near-black">Open your Stripe dashboard</p>
        <p className="text-[11px] text-muted-text mt-0.5">
          View payouts, transactions, and update your bank details directly in Stripe.
        </p>
        {err && (
          <p className="text-[11px] text-[#b42828] mt-1">{err}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.20)] bg-white px-3 py-1.5 hover:border-near-black transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {busy ? 'Opening…' : 'Open Stripe'}
      </button>
    </div>
  )
}
