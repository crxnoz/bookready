'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard, DollarSign, Receipt, Banknote, Settings as SettingsIcon,
  Loader2, AlertCircle, ChevronRight, ExternalLink,
} from 'lucide-react'
import {
  getEditorAppointments,
  getEditorPaymentSettings,
} from '@/lib/api'
import type { Appointment, PaymentSettings } from '@/lib/types'
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
    <div className="mx-auto w-full max-w-3xl p-3 sm:p-5 md:p-6 space-y-4">
      {tab === 'overview'     && <PaymentsOverview />}
      {tab === 'deposits'     && <DepositsList />}
      {tab === 'transactions' && <ComingSoonCard label="Transactions" icon={Receipt}
        body="A unified ledger of every customer payment will live here once we add transaction tracking." />}
      {tab === 'payouts'      && <ComingSoonCard label="Payouts" icon={Banknote}
        body="Payouts to your bank become available once you connect a Stripe Connect account. We&apos;ll surface schedules and history here." />}
    </div>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────

function PaymentsOverview() {
  const [settings, setSettings]       = useState<PaymentSettings | null>(null)
  const [counts,   setCounts]         = useState<{ pending: number; paid: number } | null>(null)
  const [loading,  setLoading]        = useState(true)
  const [error,    setError]          = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorPaymentSettings(),
      getEditorAppointments({ limit: 200 }),
    ])
      .then(([s, appts]) => {
        if (cancelled) return
        setSettings(s)
        setCounts({
          pending: appts.filter(a => a.payment_status === 'pending_payment').length,
          paid:    appts.filter(a => a.payment_status === 'deposit_paid' || a.payment_status === 'paid').length,
        })
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingRow />
  if (error)   return <ErrorRow message={error} />

  const paymentsOn = settings?.payments_enabled ?? false
  const depositsOn = settings?.deposits_enabled ?? false

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Customer payments"
          value={paymentsOn ? 'Enabled' : 'Disabled'}
          accent={paymentsOn ? 'positive' : 'muted'}
        />
        <StatCard
          label="Deposits"
          value={depositsOn ? (settings?.deposit_type === 'percent'
            ? `${settings?.deposit_amount ?? 0}%`
            : `$${(settings?.deposit_amount ?? 0).toFixed(2)}`)
            : 'Off'}
          accent={depositsOn ? 'positive' : 'muted'}
        />
        <StatCard
          label="Deposits pending"
          value={counts ? String(counts.pending) : '—'}
        />
        <StatCard
          label="Deposits paid"
          value={counts ? String(counts.paid) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CardLink
          href={hrefFor('deposits')}
          icon={DollarSign}
          title="Deposits"
          body="See which appointments need a deposit and which have already paid."
        />
        <CardLink
          href="/editor/settings?tab=payments"
          icon={SettingsIcon}
          title="Payment Settings"
          body="Turn customer payments on, configure deposit type and amount, choose currency."
          external
        />
        <CardLink
          href={hrefFor('transactions')}
          icon={Receipt}
          title="Transactions"
          body="Unified payment ledger."
          soon
        />
        <CardLink
          href={hrefFor('payouts')}
          icon={Banknote}
          title="Payouts"
          body="Track payouts to your bank account."
          soon
        />
      </div>
    </>
  )
}

// ── Deposits list ───────────────────────────────────────────────────────────

function DepositsList() {
  const [appts,   setAppts]   = useState<Appointment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorAppointments({ limit: 200 })
      .then(a => { if (!cancelled) setAppts(a) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!appts) return []
    return appts.filter(a => {
      const s = a.payment_status
      return s && s !== 'none'
    })
  }, [appts])

  if (loading) return <LoadingRow />
  if (error)   return <ErrorRow message={error} />

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 text-center">
        <p className="text-[11px] text-muted-text">
          No appointments require a deposit yet. Once customers book and pay a deposit they&apos;ll show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
      {filtered.map(a => (
        <div key={a.id} className="px-3.5 py-3">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-near-black truncate">{a.customer_name}</p>
            <PaymentPill appt={a} />
          </div>
          <p className="text-[11px] text-muted-text">
            {a.service_name} · {a.appointment_date} at {a.start_time}
          </p>
          <PaymentSummary appt={a} />
        </div>
      ))}
    </div>
  )
}

// ── Tiny shared bits ────────────────────────────────────────────────────────

function StatCard({
  label, value, accent = 'default',
}: {
  label: string
  value: string
  accent?: 'default' | 'positive' | 'muted'
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] px-3.5 py-3">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</p>
      <p className={cn(
        'text-lg font-bold mt-1 tracking-tight',
        accent === 'positive' ? 'text-[#0f6f3d]'
          : accent === 'muted' ? 'text-muted-text'
          : 'text-near-black',
      )}>{value}</p>
    </div>
  )
}

function CardLink({
  href, icon: Icon, title, body, soon, external,
}: {
  href: string
  icon: React.ElementType
  title: string
  body: string
  soon?: boolean
  external?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-start gap-3 border bg-white px-3.5 py-3 transition-colors',
        'border-[rgba(18,18,18,0.10)] hover:border-near-black',
        soon && 'opacity-70',
      )}
    >
      <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 border bg-cream border-[rgba(18,18,18,0.08)] text-near-black">
        <Icon size={14} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-near-black">{title}</p>
          {soon && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-1.5 py-0.5">
              Soon
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-text mt-0.5">{body}</p>
      </div>
      {external
        ? <ExternalLink size={13} className="text-muted-text group-hover:text-near-black mt-1 flex-shrink-0" />
        : <ChevronRight size={14} className="text-muted-text group-hover:text-near-black mt-1 flex-shrink-0" />}
    </Link>
  )
}

function ComingSoonCard({ label, icon: Icon, body }: { label: string; icon: React.ElementType; body: string }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 flex items-center justify-center bg-cream border border-[rgba(18,18,18,0.08)] text-near-black flex-shrink-0">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1">Coming Soon</p>
          <h2 className="text-sm font-bold text-near-black">{label}</h2>
          <p className="text-xs text-muted-text mt-1 max-w-md">{body}</p>
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
