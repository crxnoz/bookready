'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'
import { listCustomerBookings, type CustomerBookingRow } from '@/lib/customerApi'
import AccountShell from '@/components/account/AccountShell'

/**
 * Phase 4 — customer dashboard at /account.
 *
 * Lists bookings across every BookReady business the customer has
 * touched, split into "Upcoming" and "Past." Backend already returns
 * the combined set sorted desc by date+time; we partition locally
 * because the upcoming/past pivot depends on the user's local clock,
 * not the server's. (Edge timezone differences within ±24h are fine —
 * a booking 30 min in the past on the customer's clock vs server's
 * clock will land in the right bucket on a reload.)
 *
 * Empty state pitches the customer toward booking on a tenant site —
 * we don't have a "discover businesses" surface in v1, so the empty
 * state is intentionally lean.
 */
export default function CustomerDashboardPage() {
  return (
    <AccountShell>
      <DashboardInner />
    </AccountShell>
  )
}

function DashboardInner() {
  const [bookings, setBookings] = useState<CustomerBookingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listCustomerBookings()
      .then(rows => { if (!cancelled) setBookings(rows) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load bookings.') })
    return () => { cancelled = true }
  }, [])

  const { upcoming, past } = useMemo(() => {
    if (!bookings) return { upcoming: [], past: [] }
    const now = new Date()
    const upc: CustomerBookingRow[] = []
    const pst: CustomerBookingRow[] = []
    for (const b of bookings) {
      const at = new Date(`${b.appointment_date}T${b.start_time}:00`)
      // Cancelled / past — show in Past regardless of date.
      if (b.status === 'cancelled' || b.status === 'completed' || b.status === 'no_show') {
        pst.push(b)
      } else if (at >= now) {
        upc.push(b)
      } else {
        pst.push(b)
      }
    }
    // Upcoming should be ascending (soonest first); past stays desc.
    upc.sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time))
    return { upcoming: upc, past: pst }
  }, [bookings])

  if (error) {
    return (
      <div className="px-4 py-4 bg-red-50 border border-red-200 text-xs text-red-700">
        {error}
      </div>
    )
  }

  if (!bookings) {
    return <p className="text-xs text-muted-text">Loading your bookings…</p>
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="mx-auto text-muted-text" size={32} aria-hidden />
        <p className="mt-4 text-sm text-muted-text">
          You haven&rsquo;t booked anything through BookReady yet.
        </p>
        <p className="mt-2 text-xs text-muted-text">
          Book at any BookReady-powered business and your bookings will appear here.
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight mb-6">My bookings</h1>

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map(b => <BookingCard key={`${b.tenant_id}-${b.id}`} b={b} />)}
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Past">
          {past.map(b => <BookingCard key={`${b.tenant_id}-${b.id}`} b={b} />)}
        </Section>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function BookingCard({ b }: { b: CustomerBookingRow }) {
  const dateLabel = formatDate(b.appointment_date)
  const isCancelled = b.status === 'cancelled'

  return (
    <Link
      href={`/account/bookings/${b.tenant_id}/${b.id}`}
      className="block bg-white border border-[rgba(18,18,18,0.10)] hover:border-near-black transition-colors px-5 py-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1 truncate">
            {b.business_name}
          </p>
          <p className="text-sm font-semibold text-near-black truncate">{b.service_name}</p>
          <p className="text-xs text-muted-text mt-1">
            {dateLabel} · {b.start_time}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={b.status} />
          <ArrowRight className={isCancelled ? 'text-muted-text opacity-50' : 'text-near-black'} size={16} aria-hidden />
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pending',   cls: 'bg-blush text-near-black' },
    confirmed: { label: 'Confirmed', cls: 'bg-lavender text-near-black' },
    completed: { label: 'Completed', cls: 'bg-near-black text-white' },
    cancelled: { label: 'Cancelled', cls: 'bg-[rgba(18,18,18,0.08)] text-muted-text line-through' },
    no_show:   { label: 'No-show',   cls: 'bg-[rgba(18,18,18,0.08)] text-muted-text' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-[rgba(18,18,18,0.08)] text-muted-text' }
  return (
    <span className={`text-[10px] font-bold tracking-[0.10em] uppercase px-2 py-1 ${cls}`}>
      {label}
    </span>
  )
}

function formatDate(d: string): string {
  // d is YYYY-MM-DD. Format as e.g. "Wed, May 28".
  try {
    const dt = new Date(`${d}T12:00:00`)
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}
