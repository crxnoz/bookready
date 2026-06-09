'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, Clock, Plus, Users, Repeat } from 'lucide-react'
import {
  deleteEditorAppointment,
  getEditorAppointments,
  updateEditorAppointment,
} from '@/lib/api'
import type { Appointment, AppointmentStatus } from '@/lib/types'
import { cn } from '@/lib/cn'
import StatusBadge from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PaymentPill, PaymentSummary } from '@/components/editor/AppointmentPaymentStatus'
import { ComingSoonCard } from '@/components/editor/ComingSoonPanel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function getWeekBounds(): [string, string] {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - dow)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
}

// ── Main component (Bookings Hub) ─────────────────────────────────────────────

export default function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const confirm = useConfirm()

  useEffect(() => {
    getEditorAppointments({ limit: 200 })
      .then(setAppointments)
      .finally(() => setLoading(false))
  }, [])

  const today = todayStr()
  const [weekStart, weekEnd] = getWeekBounds()

  const pending  = appointments.filter(a => a.status === 'pending')
  const todayAp  = appointments.filter(a => a.appointment_date === today && a.status !== 'cancelled')
  const thisWeek = appointments.filter(a =>
    a.appointment_date >= weekStart && a.appointment_date <= weekEnd && a.status !== 'cancelled'
  )

  // Preview: today + pending + upcoming, up to 5, sorted by date/time
  const previewAppts = appointments
    .filter(a => (a.appointment_date >= today || a.status === 'pending') && a.status !== 'cancelled')
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5)

  async function handleConfirm(id: number) {
    setActionLoading(id)
    try {
      const updated = await updateEditorAppointment(id, { status: 'confirmed' })
      setAppointments(prev => prev.map(a => a.id === id ? updated : a))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDecline(id: number) {
    const ok = await confirm({ title: 'Decline this request?', message: 'The client will be notified their booking was declined.', confirmLabel: 'Decline', tone: 'danger' })
    if (! ok) return
    setActionLoading(id)
    try {
      await deleteEditorAppointment(id)
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a)
      )
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-cream">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* Stats strip — each cell is a deep-link into the Appointments
            page with the matching filter pre-applied. */}
        <div className="grid grid-cols-3 border border-hairline-soft divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Pending',   value: pending.length,   icon: Clock,    filter: 'pending' },
            { label: 'Today',     value: todayAp.length,   icon: Calendar, filter: 'today'   },
            { label: 'This week', value: thisWeek.length,  icon: Calendar, filter: 'week'    },
          ] as const).map(({ label, value, icon: Icon, filter }) => (
            <Link
              key={label}
              href={`/editor/appointments?filter=${filter}`}
              className="bg-white p-3 min-w-0 overflow-hidden hover:bg-cream transition-colors group"
            >
              <div className="flex items-center gap-1 mb-1.5">
                <Icon size={10} className="text-muted-text flex-shrink-0" />
                <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text truncate">{label}</p>
              </div>
              <p className="text-2xl font-bold text-near-black tabular-nums">{loading ? '—' : value}</p>
              <p className="text-eyebrow font-semibold text-muted-text group-hover:text-near-black mt-0.5 inline-flex items-center gap-0.5">
                View <ChevronRight size={10} />
              </p>
            </Link>
          ))}
        </div>

        {/* Section cards */}
        <div>
          <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text mb-3">Manage</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HubCard
              href="/editor/appointments"
              title="Appointments"
              description="View, create, and manage all bookings."
              badge={!loading && pending.length > 0 ? `${pending.length} pending` : undefined}
            />
            <HubCard
              href="/editor/services"
              title="Services"
              description="Set up the services you offer and their pricing."
            />
            <HubCard
              href="/editor/availability"
              title="Availability"
              description="Set your hours, buffers between appointments, and booking windows."
            />
            <HubCard
              href="/editor/staff"
              title="Staff"
              description="Manage your team and their public profiles."
            />
          </div>
        </div>

        {/* Appointments preview */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">
                Appointments preview
              </p>
              <p className="text-2xs text-muted-text mt-0.5">
                A quick look at what's on the books and any new requests.
              </p>
            </div>
            <Link
              href="/editor/appointments"
              className="text-eyebrow font-bold text-near-black border border-hairline-strong px-3 py-1.5 hover:bg-cream transition-colors flex-shrink-0 whitespace-nowrap"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="bg-white border border-hairline-soft px-4 py-8 text-center text-sm text-muted-text">
              Loading…
            </div>
          ) : previewAppts.length === 0 ? (
            <div className="bg-white border border-hairline-soft px-4 py-10 text-center">
              <Calendar size={20} className="text-muted-text mx-auto mb-2" />
              <p className="text-sm font-semibold text-near-black mb-1">No upcoming appointments</p>
              <p className="text-xs text-muted-text mb-4">When clients book you, they'll show up here. You can also add one yourself.</p>
              <Link
                href="/editor/appointments"
                className="inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
              >
                <Plus size={11} /> Create appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {previewAppts.map(appt => (
                <PreviewCard
                  key={appt.id}
                  appt={appt}
                  busy={actionLoading === appt.id}
                  onConfirm={() => handleConfirm(appt.id)}
                  onDecline={() => handleDecline(appt.id)}
                />
              ))}
              <Link
                href="/editor/appointments"
                className="flex items-center justify-center gap-1 text-2xs font-semibold text-near-black border border-hairline bg-white py-3 hover:bg-cream transition-colors"
              >
                View all appointments <ChevronRight size={11} />
              </Link>
            </div>
          )}
        </div>

        {/* Coming next — availability features still on the roadmap. Moved
            here from the Advanced tab so the overview previews what's next. */}
        <div>
          <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text mb-3">
            Coming next
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ComingSoonCard
              icon={Users}
              tone="accent"
              title="Group appointments"
              description="One session, multiple clients. Perfect for classes or workshops."
              bullets={[
                'Set a minimum and maximum number of people per session',
                'Auto-confirm once the minimum is hit',
                'One shared calendar event for the studio',
              ]}
            />
            <ComingSoonCard
              icon={Repeat}
              title="Recurring appointments"
              description="Let regulars book the same time every week or month, automatically."
              bullets={[
                'Weekly, biweekly, or monthly schedules',
                'Pause or skip individual occurrences',
                'Owner-side bulk reschedule for studio holidays',
              ]}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({
  appt,
  busy,
  onConfirm,
  onDecline,
}: {
  appt: Appointment
  busy: boolean
  onConfirm: () => void
  onDecline: () => void
}) {
  const today = todayStr()
  const isToday = appt.appointment_date === today

  return (
    <div className={cn(
      'bg-white border px-4 py-3',
      isToday ? 'border-near-black' : 'border-hairline-soft',
    )}>
      {isToday && (
        <div className="text-eyebrow font-bold tracking-[0.12em] uppercase text-near-black mb-2">
          Today
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-near-black truncate">{appt.customer_name}</p>
            <StatusBadge domain="appointment" status={appt.status} className="flex-shrink-0" />
            <PaymentPill appt={appt} />
          </div>
          <p className="text-2xs text-muted-text truncate">
            {appt.service_name} · {fmtDate(appt.appointment_date)} at {fmt12(appt.start_time)}
          </p>
          <PaymentSummary appt={appt} />
          {(appt.customer_email || appt.customer_phone) && (
            <p className="text-2xs text-muted-text truncate mt-0.5">
              {appt.customer_email || appt.customer_phone}
            </p>
          )}
        </div>
        {appt.status === 'pending' && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-2.5 py-1.5 text-eyebrow font-bold bg-near-black text-white hover:opacity-90 transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={onDecline}
              disabled={busy}
              className="px-2.5 py-1.5 text-eyebrow font-semibold border border-hairline text-muted-text hover:text-near-black transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hub card ──────────────────────────────────────────────────────────────────

function HubCard({
  href,
  title,
  description,
  badge,
  disabled,
}: {
  href: string
  title: string
  description: string
  badge?: string
  disabled?: boolean
}) {
  const inner = (
    <div className={cn(
      'h-full min-h-[120px] flex flex-col justify-between p-4 border transition-colors',
      disabled
        ? 'bg-[rgba(18,18,18,0.02)] border-hairline-soft cursor-not-allowed'
        : 'bg-white border-hairline hover:border-near-black'
    )}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className={cn('text-sm font-bold', disabled ? 'text-muted-text' : 'text-near-black')}>
            {title}
          </p>
          {badge && (
            <span className="text-eyebrow font-bold bg-blush text-near-black px-2 py-0.5 flex-shrink-0">
              {badge}
            </span>
          )}
          {disabled && (
            <span className="text-eyebrow font-bold text-muted-text border border-hairline px-2 py-0.5 flex-shrink-0">
              Soon
            </span>
          )}
        </div>
        <p className={cn('text-xs', disabled ? 'text-[rgba(18,18,18,0.35)]' : 'text-muted-text')}>
          {description}
        </p>
      </div>
      <div className={cn(
        'mt-3 text-2xs font-semibold flex items-center gap-0.5',
        disabled ? 'invisible' : 'text-near-black'
      )}>
        Open <ChevronRight size={11} />
      </div>
    </div>
  )

  if (disabled) return <div>{inner}</div>
  return <Link href={href} className="block h-full">{inner}</Link>
}
