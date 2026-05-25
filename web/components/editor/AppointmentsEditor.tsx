'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  HandCoins,
  Plus,
  Scissors,
  Undo2,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  chargeEditorAppointmentBalance,
  chargeEditorAppointmentLateFee,
  createEditorAppointment,
  deleteEditorAppointment,
  getEditorAppointments,
  getEditorPaymentSettings,
  getEditorServices,
  markEditorAppointmentPaid,
  refundEditorAppointment,
  requestEditorAppointmentTip,
  updateEditorAppointment,
} from '@/lib/api'
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentPayload,
  MarkPaidPayload,
  PaymentSettings,
  RefundPayload,
  Service,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import { PaymentPill, PaymentSummary } from '@/components/editor/AppointmentPaymentStatus'
import RefundDialog from '@/components/editor/RefundDialog'
import MarkPaidDialog from '@/components/editor/MarkPaidDialog'
import ChargeBalanceDialog from '@/components/editor/ChargeBalanceDialog'

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Returns Mon-Sun date strings for the given week offset from now */
function getWeekDays(offset: number): string[] {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7 // 0 = Mon
  const start = new Date(d)
  start.setDate(d.getDate() - dow + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

function weekLabel(days: string[]): string {
  const a = new Date(days[0] + 'T00:00:00')
  const b = new Date(days[6] + 'T00:00:00')
  if (a.getFullYear() === b.getFullYear()) {
    return `${fmtShort(a)} – ${fmtShort(b)}, ${a.getFullYear()}`
  }
  return `${fmtShort(a)}, ${a.getFullYear()} – ${fmtShort(b)}, ${b.getFullYear()}`
}

/** Returns [monthStart, monthEnd] as YYYY-MM-DD strings */
function getMonthBounds(offset: number): [string, string] {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  const y = d.getFullYear()
  const mo = d.getMonth()
  const p = (n: number) => String(n).padStart(2, '0')
  return [`${y}-${p(mo + 1)}-01`, `${y}-${p(mo + 1)}-${p(new Date(y, mo + 1, 0).getDate())}`]
}

function monthLabel(offset: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

type CalendarCell = { date: string } | null

/** Builds the month grid (array of 7-cell week rows) */
function getMonthGrid(offset: number): CalendarCell[][] {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  const yr = d.getFullYear()
  const mo = d.getMonth()
  const p = (n: number) => String(n).padStart(2, '0')
  const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7
  const dim = new Date(yr, mo + 1, 0).getDate()
  const cells: CalendarCell[] = [
    ...Array.from({ length: firstDow }, (): null => null),
    ...Array.from({ length: dim }, (_, i) => ({ date: `${yr}-${p(mo + 1)}-${p(i + 1)}` })),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Returns the current week's [start, end] bounds */
function currentWeekBounds(): [string, string] {
  const days = getWeekDays(0)
  return [days[0], days[6]]
}

function apptStatusChipCls(status: string): string {
  if (status === 'confirmed') return 'bg-lavender border-transparent text-near-black'
  if (status === 'completed') return 'bg-near-black border-near-black text-white'
  if (status === 'no_show')   return 'bg-white border-[rgba(18,18,18,0.12)] text-near-black'
  if (status === 'cancelled') return 'bg-white border-[rgba(18,18,18,0.12)] text-muted-text'
  return 'bg-blush border-transparent text-near-black' // pending
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-blush border-transparent text-near-black' },
  confirmed: { label: 'Confirmed', cls: 'bg-lavender border-transparent text-near-black' },
  completed: { label: 'Completed', cls: 'bg-near-black border-near-black text-white' },
  cancelled: { label: 'Cancelled', cls: 'bg-white border-[rgba(18,18,18,0.20)] text-muted-text' },
  no_show:   { label: 'No-show',   cls: 'bg-white border-[rgba(18,18,18,0.20)] text-near-black' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-white border-[rgba(18,18,18,0.12)] text-near-black' }
  return (
    <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase border px-2 py-0.5 flex-shrink-0', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  customer_name: string
  customer_email: string
  customer_phone: string
  service_id: string
  appointment_date: string
  start_time: string
  notes: string
  status: AppointmentStatus
}

function emptyForm(): FormState {
  return {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_id: '',
    appointment_date: '',
    start_time: '',
    notes: '',
    status: 'pending',
  }
}

function appointmentToForm(a: Appointment): FormState {
  return {
    customer_name:    a.customer_name,
    customer_email:   a.customer_email ?? '',
    customer_phone:   a.customer_phone ?? '',
    service_id:       a.service_id ? String(a.service_id) : '',
    appointment_date: a.appointment_date,
    start_time:       a.start_time,
    notes:            a.notes ?? '',
    status:           a.status,
  }
}

// ── Main component ────────────────────────────────────────────────────────────

type Filter = 'today' | 'week' | 'month' | 'pending' | 'upcoming' | 'all'

export default function AppointmentsEditor() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [refundTarget, setRefundTarget]         = useState<Appointment | null>(null)
  const [markPaidTarget, setMarkPaidTarget]     = useState<Appointment | null>(null)
  const [chargeBalanceTarget, setChargeBalanceTarget] = useState<Appointment | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)

  useEffect(() => {
    Promise.all([
      getEditorAppointments({ limit: 200 }),
      getEditorServices(),
      getEditorPaymentSettings().catch(() => null),
    ])
      .then(([appts, svcs, ps]) => {
        setAppointments(appts)
        setServices(svcs.filter(s => s.is_active))
        setPaymentSettings(ps)
      })
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false))
  }, [])

  const today = todayStr()

  // Derived range data
  const weekDays    = getWeekDays(weekOffset)
  const monthGrid   = getMonthGrid(monthOffset)
  const [monthStart, monthEnd] = getMonthBounds(monthOffset)

  // Stats always show current (offset-0) week
  const [cwStart, cwEnd] = currentWeekBounds()
  const stats = {
    today:     appointments.filter(a => a.appointment_date === today && a.status !== 'cancelled').length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    thisWeek:  appointments.filter(a => a.appointment_date >= cwStart && a.appointment_date <= cwEnd && a.status !== 'cancelled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  }

  const filtered = appointments
    .filter(a => {
      if (filter === 'today')    return a.appointment_date === today
      if (filter === 'week')     return weekDays.includes(a.appointment_date) && a.status !== 'cancelled'
      if (filter === 'month')    return a.appointment_date >= monthStart && a.appointment_date <= monthEnd && a.status !== 'cancelled'
      if (filter === 'pending')  return a.status === 'pending'
      if (filter === 'upcoming') return a.appointment_date >= today && a.status !== 'cancelled'
      return true
    })
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navPrev() {
    if (filter === 'week')  setWeekOffset(o => o - 1)
    if (filter === 'month') setMonthOffset(o => o - 1)
  }
  function navNext() {
    if (filter === 'week')  setWeekOffset(o => o + 1)
    if (filter === 'month') setMonthOffset(o => o + 1)
  }
  function navToday() {
    setWeekOffset(0)
    setMonthOffset(0)
  }

  const navLabel = filter === 'week'
    ? weekLabel(weekDays)
    : filter === 'month'
    ? monthLabel(monthOffset)
    : ''

  // ── Form helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(a: Appointment) {
    setEditId(a.id)
    setForm(appointmentToForm(a))
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setFormError(null)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim() || !form.service_id || !form.appointment_date || !form.start_time) {
      setFormError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editId !== null) {
        const updated = await updateEditorAppointment(editId, {
          customer_name:    form.customer_name,
          customer_email:   form.customer_email || null,
          customer_phone:   form.customer_phone || null,
          service_id:       Number(form.service_id),
          appointment_date: form.appointment_date,
          start_time:       form.start_time,
          notes:            form.notes || null,
          status:           form.status,
        })
        setAppointments(prev => prev.map(a => a.id === editId ? updated : a))
      } else {
        const payload: CreateAppointmentPayload = {
          customer_name:    form.customer_name,
          customer_email:   form.customer_email || undefined,
          customer_phone:   form.customer_phone || undefined,
          service_id:       Number(form.service_id),
          appointment_date: form.appointment_date,
          start_time:       form.start_time,
          notes:            form.notes || undefined,
        }
        const created = await createEditorAppointment(payload)
        setAppointments(prev =>
          [created, ...prev].sort((a, b) =>
            a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)
          )
        )
      }
      closeForm()
    } catch {
      setFormError('Failed to save appointment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusUpdate(id: number, status: AppointmentStatus) {
    setActionLoading(id)
    try {
      const updated = await updateEditorAppointment(id, { status })
      setAppointments(prev => prev.map(a => a.id === id ? updated : a))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('Cancel this appointment?')) return
    setActionLoading(id)
    try {
      await deleteEditorAppointment(id)
      setAppointments(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a
      ))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRefund(id: number, payload: RefundPayload) {
    const res = await refundEditorAppointment(id, payload)
    setAppointments(prev => prev.map(a => a.id === id ? res.appointment : a))
  }

  async function handleMarkPaid(id: number, payload: MarkPaidPayload) {
    const res = await markEditorAppointmentPaid(id, payload)
    setAppointments(prev => prev.map(a => a.id === id ? res.appointment : a))
  }

  async function handleChargeBalance(id: number) {
    const res = await chargeEditorAppointmentBalance(id)
    setAppointments(prev => prev.map(a => a.id === id ? res.appointment : a))
    return { checkout_url: res.checkout_url, email_sent: res.email_sent, message: res.message }
  }

  async function handleRequestTip(id: number) {
    const appt = appointments.find(a => a.id === id)
    const who  = appt?.customer_email ?? 'the customer'
    if (! confirm(`Send a tip request email to ${who}?`)) return
    setActionLoading(id)
    try {
      const res = await requestEditorAppointmentTip(id)
      alert(res.message)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not send tip request.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleChargeLateFee(id: number, type: 'no_show' | 'late_cancel') {
    const fee = type === 'no_show'
      ? paymentSettings?.no_show_fee_amount
      : paymentSettings?.late_cancel_fee_amount
    const label = type === 'no_show' ? 'no-show fee' : 'late-cancellation fee'
    if (! fee || fee <= 0) {
      alert(`Set a ${label} amount in Payment Settings first.`)
      return
    }
    const sym = (paymentSettings?.currency ?? 'USD') === 'USD' ? '$' : ''
    if (! confirm(`Charge ${sym}${fee.toFixed(2)} ${label} to the saved card?`)) return
    setActionLoading(id)
    try {
      const res = await chargeEditorAppointmentLateFee(id, { type })
      setAppointments(prev => prev.map(a => a.id === id ? res.appointment : a))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not charge the fee.')
    } finally {
      setActionLoading(null)
    }
  }

  const selectedService = services.find(s => s.id === Number(form.service_id))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Inline action bar — page title now lives in EditorShell */}
        <div className="flex items-center justify-end">
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus size={11} /> New Appointment
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Today',     value: stats.today,     icon: Calendar },
            { label: 'Pending',   value: stats.pending,   icon: Clock },
            { label: 'This Week', value: stats.thisWeek,  icon: Calendar },
            { label: 'Completed', value: stats.completed, icon: CheckCircle },
          ] as const).map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white p-3 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1 mb-1.5 min-w-0">
                <Icon size={10} className="text-muted-text flex-shrink-0" />
                <p className="text-[8px] font-bold tracking-[0.10em] uppercase text-muted-text truncate">{label}</p>
              </div>
              <p className="text-2xl font-bold text-near-black tabular-nums">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Pending callout */}
        {!loading && stats.pending > 0 && filter !== 'pending' && (
          <div className="flex items-center justify-between gap-3 bg-blush px-4 py-3 border border-[rgba(18,18,18,0.08)]">
            <p className="text-[12px] font-semibold text-near-black">
              {stats.pending} pending booking request{stats.pending !== 1 ? 's' : ''} need your response.
            </p>
            <button
              onClick={() => setFilter('pending')}
              className="text-[10px] font-bold text-near-black underline underline-offset-2 flex-shrink-0 whitespace-nowrap"
            >
              Review
            </button>
          </div>
        )}

        {/* Create / edit form */}
        {showForm && (
          <div className="bg-white border border-[rgba(18,18,18,0.12)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(18,18,18,0.08)]">
              <h2 className="text-sm font-bold text-near-black tracking-tight">
                {editId !== null ? 'Edit Appointment' : 'New Appointment'}
              </h2>
              <button onClick={closeForm} className="text-muted-text hover:text-near-black transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{formError}</p>
              )}
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Client</p>
                <input
                  type="text" placeholder="Full name *" required
                  value={form.customer_name} onChange={e => setField('customer_name', e.target.value)}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email" placeholder="Email"
                    value={form.customer_email} onChange={e => setField('customer_email', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                  <input
                    type="tel" placeholder="Phone"
                    value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Service</p>
                <select
                  required value={form.service_id} onChange={e => setField('service_id', e.target.value)}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black appearance-none"
                >
                  <option value="">Select a service *</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.duration_minutes} min · ${s.price.toFixed(0)}
                    </option>
                  ))}
                </select>
                {selectedService && (
                  <p className="text-xs text-muted-text">
                    Duration: {selectedService.duration_minutes} min · Price: ${selectedService.price.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Date &amp; Time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-text mb-1">Date *</label>
                    <input
                      type="date" required
                      value={form.appointment_date} onChange={e => setField('appointment_date', e.target.value)}
                      className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-text mb-1">Start time *</label>
                    <input
                      type="time" required
                      value={form.start_time} onChange={e => setField('start_time', e.target.value)}
                      className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                </div>
              </div>
              {editId !== null && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Status</p>
                  <select
                    value={form.status} onChange={e => setField('status', e.target.value as AppointmentStatus)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No-show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Notes</p>
                <textarea
                  placeholder="Optional note for this appointment"
                  value={form.notes} onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editId !== null ? 'Save Changes' : 'Create Appointment'}
                </button>
                <button
                  type="button" onClick={closeForm}
                  className="border border-[rgba(18,18,18,0.15)] bg-white px-4 py-2.5 text-xs font-semibold text-near-black hover:bg-cream transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'today',    label: 'Today' },
            { key: 'week',     label: 'This Week' },
            { key: 'month',    label: 'This Month' },
            { key: 'pending',  label: 'Pending' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all',      label: 'All' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-semibold border transition-colors',
                filter === key
                  ? 'bg-near-black text-white border-near-black'
                  : 'bg-white text-muted-text border-[rgba(18,18,18,0.12)] hover:text-near-black'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Week / Month navigation */}
        {(filter === 'week' || filter === 'month') && (
          <div className="flex items-center gap-2">
            <button
              onClick={navPrev}
              className="border border-[rgba(18,18,18,0.12)] bg-white p-2 hover:bg-cream transition-colors flex-shrink-0"
              aria-label="Previous"
            >
              <ChevronLeft size={14} />
            </button>
            <p className="flex-1 text-center text-sm font-semibold text-near-black truncate">
              {navLabel}
            </p>
            <button
              onClick={navToday}
              className="border border-[rgba(18,18,18,0.12)] bg-white px-3 py-2 text-[10px] font-bold text-near-black hover:bg-cream transition-colors flex-shrink-0"
            >
              Today
            </button>
            <button
              onClick={navNext}
              className="border border-[rgba(18,18,18,0.12)] bg-white p-2 hover:bg-cream transition-colors flex-shrink-0"
              aria-label="Next"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center text-sm text-muted-text">
            Loading appointments…
          </div>
        ) : error ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-8 text-center text-sm text-red-500">
            {error}
          </div>
        ) : filter === 'week' ? (
          <WeekGridView weekDays={weekDays} appointments={filtered} today={today} />
        ) : filter === 'month' ? (
          <MonthCalendarView monthGrid={monthGrid} appointments={filtered} today={today} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center">
            <Calendar size={24} className="text-muted-text mx-auto mb-3" />
            <p className="text-sm font-semibold text-near-black mb-1">No appointments</p>
            <p className="text-xs text-muted-text">
              {filter === 'upcoming'
                ? 'No upcoming appointments. Create one to get started.'
                : `No ${filter} appointments found.`}
            </p>
            {filter === 'upcoming' && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
              >
                <Plus size={11} /> New Appointment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(appt => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                paymentSettings={paymentSettings}
                busy={actionLoading === appt.id}
                onEdit={() => openEdit(appt)}
                onStatus={status => handleStatusUpdate(appt.id, status)}
                onCancel={() => handleCancel(appt.id)}
                onRefund={() => setRefundTarget(appt)}
                onMarkPaid={() => setMarkPaidTarget(appt)}
                onChargeBalance={() => setChargeBalanceTarget(appt)}
                onRequestTip={() => handleRequestTip(appt.id)}
                onChargeLateFee={type => handleChargeLateFee(appt.id, type)}
              />
            ))}
          </div>
        )}

      </div>

      {refundTarget && (
        <RefundDialog
          appt={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSubmit={payload => handleRefund(refundTarget.id, payload)}
        />
      )}

      {markPaidTarget && (
        <MarkPaidDialog
          appt={markPaidTarget}
          onClose={() => setMarkPaidTarget(null)}
          onSubmit={payload => handleMarkPaid(markPaidTarget.id, payload)}
        />
      )}

      {chargeBalanceTarget && (
        <ChargeBalanceDialog
          appt={chargeBalanceTarget}
          onClose={() => setChargeBalanceTarget(null)}
          onSubmit={() => handleChargeBalance(chargeBalanceTarget.id)}
        />
      )}
    </div>
  )
}

// ── Week grid view ────────────────────────────────────────────────────────────

function WeekGridView({
  weekDays,
  appointments,
  today,
}: {
  weekDays: string[]
  appointments: Appointment[]
  today: string
}) {
  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden sm:grid grid-cols-7 border border-[rgba(18,18,18,0.10)] overflow-hidden">
        {weekDays.map((date, i) => {
          const dayAppts = appointments
            .filter(a => a.appointment_date === date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn(
                'border-r last:border-r-0 border-[rgba(18,18,18,0.08)] flex flex-col',
                isToday ? 'bg-[#F8F6F2]' : 'bg-white',
              )}
            >
              {/* Day header */}
              <div className={cn(
                'py-2.5 text-center border-b border-[rgba(18,18,18,0.06)] flex-shrink-0',
                isToday ? 'bg-near-black' : '',
              )}>
                <p className={cn('text-[8px] font-bold tracking-[0.10em] uppercase', isToday ? 'text-white/60' : 'text-muted-text')}>
                  {DAY_ABBR[i]}
                </p>
                <p className={cn('text-sm font-bold leading-none mt-0.5', isToday ? 'text-white' : 'text-near-black')}>
                  {new Date(date + 'T00:00:00').getDate()}
                </p>
              </div>
              {/* Appointment chips */}
              <div className="p-1 space-y-0.5 flex-1 min-h-[120px]">
                {dayAppts.length === 0 ? (
                  <p className="text-[8px] text-muted-text text-center py-4">—</p>
                ) : dayAppts.map(a => (
                  <div
                    key={a.id}
                    className={cn(
                      'px-1 py-1 text-[8px] leading-tight border overflow-hidden',
                      apptStatusChipCls(a.status),
                    )}
                    title={`${fmt12(a.start_time)} · ${a.customer_name} · ${a.service_name}`}
                  >
                    <div className="font-bold truncate">
                      {a.start_time.slice(0, 5)} {a.customer_name.split(' ')[0]}
                    </div>
                    <div className="truncate opacity-75">{a.service_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: stacked day cards */}
      <div className="sm:hidden space-y-2">
        {weekDays.map((date, i) => {
          const dayAppts = appointments
            .filter(a => a.appointment_date === date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn('border overflow-hidden', isToday ? 'border-near-black' : 'border-[rgba(18,18,18,0.10)]')}
            >
              <div className={cn(
                'px-4 py-3 flex items-center justify-between',
                isToday ? 'bg-near-black' : 'bg-white border-b border-[rgba(18,18,18,0.06)]',
              )}>
                <p className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-near-black')}>
                  {DAY_ABBR[i]} · {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {isToday && <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider">Today</span>}
                {!isToday && (
                  <span className="text-[10px] text-muted-text">
                    {dayAppts.length === 0 ? 'Free' : `${dayAppts.length} appt${dayAppts.length > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
              {dayAppts.length === 0 ? (
                <div className="bg-white px-4 py-3">
                  <p className="text-[11px] text-muted-text">No appointments</p>
                </div>
              ) : (
                <div className="bg-white divide-y divide-[rgba(18,18,18,0.06)]">
                  {dayAppts.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-near-black whitespace-nowrap">{fmt12(a.start_time)}</span>
                          <StatusBadge status={a.status} />
                          <PaymentPill appt={a} />
                        </div>
                        <p className="text-xs text-muted-text truncate mt-0.5">
                          {a.customer_name} · {a.service_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Month calendar view ───────────────────────────────────────────────────────

function MonthCalendarView({
  monthGrid,
  appointments,
  today,
}: {
  monthGrid: CalendarCell[][]
  appointments: Appointment[]
  today: string
}) {
  return (
    <>
      {/* Desktop + tablet: calendar grid */}
      <div className="hidden sm:block bg-white border border-[rgba(18,18,18,0.10)] overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-[rgba(18,18,18,0.08)]">
          {DAY_ABBR.map(d => (
            <div
              key={d}
              className="text-center py-2 text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text border-r last:border-r-0 border-[rgba(18,18,18,0.06)]"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Calendar rows */}
        {monthGrid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[rgba(18,18,18,0.06)] last:border-b-0">
            {week.map((cell, di) => {
              if (!cell) {
                return (
                  <div
                    key={di}
                    className="border-r last:border-r-0 border-[rgba(18,18,18,0.06)] min-h-[80px] bg-[rgba(18,18,18,0.015)]"
                  />
                )
              }
              const { date } = cell
              const isToday = date === today
              const dayAppts = appointments
                .filter(a => a.appointment_date === date)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
              const shown = dayAppts.slice(0, 2)
              const extra = dayAppts.length - 2

              return (
                <div
                  key={date}
                  className={cn(
                    'border-r last:border-r-0 border-[rgba(18,18,18,0.06)] min-h-[80px] p-1.5 flex flex-col gap-0.5',
                    isToday ? 'bg-near-black' : 'bg-white',
                  )}
                >
                  <span className={cn('text-[11px] font-bold leading-none mb-0.5', isToday ? 'text-white' : 'text-near-black')}>
                    {new Date(date + 'T00:00:00').getDate()}
                  </span>
                  {shown.map(a => (
                    <div
                      key={a.id}
                      className={cn('px-1 py-0.5 text-[8px] leading-tight truncate border', apptStatusChipCls(a.status))}
                      title={`${fmt12(a.start_time)} · ${a.customer_name} · ${a.service_name}`}
                    >
                      {a.start_time.slice(0, 5)} {a.customer_name.split(' ')[0]}
                    </div>
                  ))}
                  {extra > 0 && (
                    <span className={cn('text-[8px] font-bold px-0.5', isToday ? 'text-white/60' : 'text-muted-text')}>
                      +{extra} more
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Mobile: grouped day cards (only days with appointments) */}
      <div className="sm:hidden space-y-2">
        {(() => {
          const daysWithAppts = monthGrid
            .flat()
            .filter((cell): cell is { date: string } => cell !== null)
            .map(cell => ({
              date: cell.date,
              appts: appointments
                .filter(a => a.appointment_date === cell.date)
                .sort((a, b) => a.start_time.localeCompare(b.start_time)),
            }))
            .filter(({ appts }) => appts.length > 0)

          if (daysWithAppts.length === 0) {
            return (
              <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-10 text-center">
                <p className="text-sm font-semibold text-near-black mb-1">No appointments this month</p>
                <p className="text-xs text-muted-text">Use the navigation above to browse other months.</p>
              </div>
            )
          }

          return daysWithAppts.map(({ date, appts }) => {
            const isToday = date === today
            return (
              <div
                key={date}
                className={cn('border overflow-hidden', isToday ? 'border-near-black' : 'border-[rgba(18,18,18,0.10)]')}
              >
                <div className={cn(
                  'px-4 py-2.5 flex items-center justify-between',
                  isToday ? 'bg-near-black' : 'bg-white border-b border-[rgba(18,18,18,0.06)]',
                )}>
                  <p className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-near-black')}>
                    {fmtDate(date)}
                  </p>
                  {isToday && <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider">Today</span>}
                </div>
                <div className="bg-white divide-y divide-[rgba(18,18,18,0.06)]">
                  {appts.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-near-black whitespace-nowrap">{fmt12(a.start_time)}</span>
                          <StatusBadge status={a.status} />
                          <PaymentPill appt={a} />
                        </div>
                        <p className="text-xs text-muted-text truncate mt-0.5">
                          {a.customer_name} · {a.service_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        })()}
      </div>
    </>
  )
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  paymentSettings,
  busy,
  onEdit,
  onStatus,
  onCancel,
  onRefund,
  onMarkPaid,
  onChargeBalance,
  onRequestTip,
  onChargeLateFee,
}: {
  appt: Appointment
  paymentSettings: PaymentSettings | null
  busy: boolean
  onEdit: () => void
  onStatus: (s: AppointmentStatus) => void
  onCancel: () => void
  onRefund: () => void
  onMarkPaid: () => void
  onChargeBalance: () => void
  onRequestTip: () => void
  onChargeLateFee: (type: 'no_show' | 'late_cancel') => void
}) {
  const today = todayStr()
  const isToday = appt.appointment_date === today
  const isFuture = appt.appointment_date >= today
  const terminal = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show'

  // Refundable iff there's any payment beyond what's already been refunded —
  // works for Stripe payments (real refund) AND manual cash/Venmo (recorded
  // locally only; owner already gave the cash back). Total paid includes
  // any balance payment that came in after the initial deposit.
  const totalPaid     = (appt.deposit_paid_amount ?? 0) + (appt.balance_paid_amount ?? 0)
  const refunded      = appt.refunded_amount     ?? 0
  const isStripePaid  = !! appt.stripe_payment_intent_id
  const isManualPaid  = !! appt.payment_method && !isStripePaid
  const isRefundable  = (isStripePaid || isManualPaid)
                        && totalPaid > refunded + 0.001
                        && (appt.payment_status === 'deposit_paid'
                          || appt.payment_status === 'paid'
                          || appt.payment_status === 'partially_refunded')

  // Mark-as-paid shows when no payment has been recorded yet AND there's
  // no in-flight Stripe checkout pending. Hide on terminal appointments.
  const noPaymentYet = !appt.payment_status
                       || appt.payment_status === 'none'
                       || appt.payment_status === 'failed'
  const showMarkPaid = !terminal && noPaymentYet

  // "Send payment link" covers two flows on the same button:
  //   1. Appointment has a deposit and remaining balance owed → charges balance
  //   2. Appointment has no payment yet (manually created / phone booking)
  //      and a service price is set → charges the full service price
  // Both require a customer email on file and a non-terminal status.
  const due           = appt.amount_due ?? 0
  const price         = appt.service_price ?? 0
  const hasBalance    = appt.payment_status === 'deposit_paid' && due > 0 && !appt.balance_paid_at
  const hasNoPayment  = (!appt.payment_status || appt.payment_status === 'none' || appt.payment_status === 'failed')
                        && price > 0
  const showCharge    = !terminal
                        && !! appt.customer_email
                        && (hasBalance || hasNoPayment)
  const chargeLabel   = hasBalance
                        ? (appt.balance_checkout_session_id ? 'Resend link' : 'Charge balance')
                        : (appt.stripe_checkout_session_id  ? 'Resend link' : 'Send payment link')

  const activeDispute = appt.dispute_status
    && ['warning_needs_response', 'warning_under_review', 'needs_response', 'under_review'].includes(appt.dispute_status)

  // Tip request: completed appointments where customer email + manage_token
  // exist and no tip has been recorded yet.
  const showRequestTip = appt.status === 'completed'
                         && !! appt.customer_email
                         && !appt.tip_paid_at

  // Late fees: terminal state (no_show or cancelled) + saved card on file
  // + a fee amount configured in payment_settings + not already charged.
  const hasSavedCard = !! appt.stripe_customer_id && !! appt.saved_payment_method_id
  const showNoShowFee  = appt.status === 'no_show'
                         && hasSavedCard && !appt.late_fee_paid_at
                         && (paymentSettings?.no_show_fee_amount ?? 0) > 0
  const showLateCancelFee = appt.status === 'cancelled'
                            && hasSavedCard && !appt.late_fee_paid_at
                            && (paymentSettings?.late_cancel_fee_amount ?? 0) > 0

  return (
    <div className={cn(
      'bg-white border transition-colors',
      isToday ? 'border-near-black' : 'border-[rgba(18,18,18,0.10)]',
    )}>
      {isToday && (
        <div className="bg-near-black text-white text-[9px] font-bold tracking-[0.12em] uppercase px-4 py-1">
          Today
        </div>
      )}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-near-black truncate">{appt.customer_name}</p>
              <StatusBadge status={appt.status} />
              <PaymentPill appt={appt} />
            </div>
            {(appt.customer_email || appt.customer_phone) && (
              <p className="text-[11px] text-muted-text mt-0.5 truncate">
                {appt.customer_email || appt.customer_phone}
              </p>
            )}
            <PaymentSummary appt={appt} />
          </div>
          <button
            onClick={onEdit}
            className="flex-shrink-0 border border-[rgba(18,18,18,0.12)] px-2.5 py-1 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Scissors size={12} className="text-muted-text flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-near-black truncate">{appt.service_name}</p>
              {appt.service_price !== null && (
                <p className="text-[11px] text-muted-text">
                  ${appt.service_price.toFixed(0)}
                  {appt.service_duration_minutes ? ` · ${appt.service_duration_minutes} min` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-muted-text flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-near-black">{fmtDate(appt.appointment_date)}</p>
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-muted-text" />
                <p className="text-[11px] text-muted-text">{fmt12(appt.start_time)} – {fmt12(appt.end_time)}</p>
              </div>
            </div>
          </div>
        </div>
        {appt.notes && (
          <p className="text-[11px] text-muted-text border-l-2 border-[rgba(18,18,18,0.12)] pl-2.5 mb-3 italic">
            {appt.notes}
          </p>
        )}
        {activeDispute && (
          <div className="mb-3 px-3 py-2 bg-[#fff3f3] border border-[rgba(180,40,40,0.30)] flex items-start gap-2">
            <AlertTriangle size={13} className="text-[#b42828] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#7a1f1f] leading-snug">
              <strong className="font-bold">Payment disputed.</strong>{' '}
              Respond in your{' '}
              <a href="https://dashboard.stripe.com/disputes" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
                Stripe dashboard
              </a>
              {appt.dispute_amount != null && (
                <> · {(appt.currency ?? 'USD') === 'USD' ? '$' : ''}{appt.dispute_amount.toFixed(2)}</>
              )}
              {appt.dispute_reason && (
                <> · {appt.dispute_reason.replace(/_/g, ' ')}</>
              )}
            </div>
          </div>
        )}
        {(!terminal || isRefundable || showRequestTip || showNoShowFee || showLateCancelFee) && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[rgba(18,18,18,0.06)]">
            {!terminal && appt.status === 'pending' && isFuture && (
              <ActionBtn onClick={() => onStatus('confirmed')} disabled={busy} icon={<CheckCircle size={11} />} label="Confirm" primary />
            )}
            {!terminal && (appt.status === 'pending' || appt.status === 'confirmed') && (
              <ActionBtn onClick={() => onStatus('completed')} disabled={busy} icon={<CheckCircle size={11} />} label="Complete" />
            )}
            {!terminal && appt.status === 'confirmed' && (
              <ActionBtn onClick={() => onStatus('no_show')} disabled={busy} icon={<User size={11} />} label="No-show" />
            )}
            {showMarkPaid && (
              <ActionBtn onClick={onMarkPaid} disabled={busy} icon={<DollarSign size={11} />} label="Mark paid" />
            )}
            {showCharge && (
              <ActionBtn
                onClick={onChargeBalance}
                disabled={busy}
                icon={<CreditCard size={11} />}
                label={chargeLabel}
              />
            )}
            {showRequestTip && (
              <ActionBtn onClick={onRequestTip} disabled={busy} icon={<HandCoins size={11} />} label="Request tip" />
            )}
            {showNoShowFee && (
              <ActionBtn onClick={() => onChargeLateFee('no_show')} disabled={busy} icon={<Zap size={11} />} label="No-show fee" />
            )}
            {showLateCancelFee && (
              <ActionBtn onClick={() => onChargeLateFee('late_cancel')} disabled={busy} icon={<Zap size={11} />} label="Late-cancel fee" />
            )}
            {isRefundable && (
              <ActionBtn onClick={onRefund} disabled={busy} icon={<Undo2 size={11} />} label="Refund" />
            )}
            {!terminal && (
              <ActionBtn onClick={onCancel} disabled={busy} icon={<XCircle size={11} />} label="Cancel" danger />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  onClick, disabled, icon, label, primary, danger,
}: {
  onClick: () => void
  disabled: boolean
  icon: React.ReactNode
  label: string
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold border transition-colors disabled:opacity-50',
        primary ? 'bg-near-black text-white border-near-black hover:bg-[#2a2a2a]' :
        danger  ? 'bg-white text-[rgba(18,18,18,0.5)] border-[rgba(18,18,18,0.12)] hover:text-near-black' :
                  'bg-white text-near-black border-[rgba(18,18,18,0.12)] hover:bg-cream',
      )}
    >
      {icon} {label}
    </button>
  )
}
