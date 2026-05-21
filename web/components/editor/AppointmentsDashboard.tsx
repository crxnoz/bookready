'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  User,
  X,
  XCircle,
} from 'lucide-react'
import {
  createEditorAppointment,
  deleteEditorAppointment,
  getEditorAppointments,
  getEditorServices,
  updateEditorAppointment,
} from '@/lib/api'
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentPayload,
  Service,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Date helpers (no external libs) ──────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', opts ?? { weekday: 'short', month: 'short', day: 'numeric' })
}

function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().slice(0, 10)
}

function addMonths(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(1)
  dt.setMonth(dt.getMonth() + n)
  return dt.toISOString().slice(0, 10)
}

function getWeekDays(ref: string): string[] {
  const d = new Date(ref + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7 // 0=Mon … 6=Sun
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() - dow + i)
    return day.toISOString().slice(0, 10)
  })
}

function getMonthGrid(ref: string): (string | null)[][] {
  const d = new Date(ref + 'T00:00:00')
  const yr = d.getFullYear()
  const mo = d.getMonth()
  const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7
  const dim = new Date(yr, mo + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) =>
      `${yr}-${String(mo + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    ),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function weekLabel(days: string[]) {
  const a = new Date(days[0] + 'T00:00:00')
  const b = new Date(days[6] + 'T00:00:00')
  if (a.getMonth() === b.getMonth()) {
    return (
      a.toLocaleDateString('en-US', { month: 'long' }) +
      ' ' + a.getDate() + '–' + b.getDate() +
      ', ' + a.getFullYear()
    )
  }
  return (
    a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' +
    b.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  )
}

function monthLabel(ref: string) {
  return new Date(ref + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-blush border-transparent text-near-black' },
  confirmed: { label: 'Confirmed', cls: 'bg-lavender border-transparent text-near-black' },
  completed: { label: 'Completed', cls: 'bg-near-black border-near-black text-white' },
  cancelled: { label: 'Cancelled', cls: 'bg-white border-[rgba(18,18,18,0.20)] text-muted-text' },
  no_show:   { label: 'No-show',   cls: 'bg-white border-[rgba(18,18,18,0.20)] text-near-black' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, cls: 'bg-white border-[rgba(18,18,18,0.12)] text-near-black' }
  return (
    <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 flex-shrink-0', c.cls)}>
      {c.label}
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

function emptyForm(date = ''): FormState {
  return {
    customer_name: '', customer_email: '', customer_phone: '',
    service_id: '', appointment_date: date, start_time: '',
    notes: '', status: 'pending',
  }
}

function apptToForm(a: Appointment): FormState {
  return {
    customer_name: a.customer_name,
    customer_email: a.customer_email ?? '',
    customer_phone: a.customer_phone ?? '',
    service_id: a.service_id ? String(a.service_id) : '',
    appointment_date: a.appointment_date,
    start_time: a.start_time,
    notes: a.notes ?? '',
    status: a.status,
  }
}

// ── Main component ────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'month'
const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('day')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([getEditorAppointments({ limit: 500 }), getEditorServices()])
      .then(([appts, svcs]) => {
        setAppointments(appts)
        setServices(svcs.filter(s => s.is_active))
      })
      .finally(() => setLoading(false))
  }, [])

  const today = todayStr()
  const weekDays = getWeekDays(selectedDate)
  const monthGrid = getMonthGrid(selectedDate)

  const countByDate = appointments.reduce<Record<string, number>>((acc, a) => {
    if (a.status !== 'cancelled') acc[a.appointment_date] = (acc[a.appointment_date] || 0) + 1
    return acc
  }, {})

  const stats = {
    today:    appointments.filter(a => a.appointment_date === today && a.status !== 'cancelled').length,
    upcoming: appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled').length,
    pending:  appointments.filter(a => a.status === 'pending').length,
    done:     appointments.filter(a => a.status === 'completed').length,
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function prev() {
    if (view === 'day')   setSelectedDate(d => addDays(d, -1))
    if (view === 'week')  setSelectedDate(d => addDays(d, -7))
    if (view === 'month') setSelectedDate(d => addMonths(d, -1))
  }
  function next() {
    if (view === 'day')   setSelectedDate(d => addDays(d, 1))
    if (view === 'week')  setSelectedDate(d => addDays(d, 7))
    if (view === 'month') setSelectedDate(d => addMonths(d, 1))
  }

  // ── Form handlers ──────────────────────────────────────────────────────────

  function openCreate(date?: string) {
    setEditId(null)
    setForm(emptyForm(date ?? selectedDate))
    setFormError(null)
    setShowForm(true)
  }
  function openEdit(a: Appointment) {
    setEditId(a.id)
    setForm(apptToForm(a))
    setFormError(null)
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditId(null); setFormError(null) }
  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
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
        setAppointments(p => p.map(a => a.id === editId ? updated : a))
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
        setAppointments(p =>
          [...p, created].sort(
            (a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)
          )
        )
        // Jump to day view for the newly created appointment
        setSelectedDate(created.appointment_date)
        setView('day')
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
      setAppointments(p => p.map(a => a.id === id ? updated : a))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('Cancel this appointment?')) return
    setActionLoading(id)
    try {
      await deleteEditorAppointment(id)
      setAppointments(p =>
        p.map(a => a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a)
      )
    } finally {
      setActionLoading(null)
    }
  }

  function goToDay(date: string) {
    setSelectedDate(date)
    setView('day')
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const viewLabel =
    view === 'day'   ? fmtDate(selectedDate) :
    view === 'week'  ? weekLabel(weekDays) :
                       monthLabel(selectedDate)

  const dayAppts = appointments
    .filter(a => a.appointment_date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const selectedSvc = services.find(s => s.id === Number(form.service_id))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Bookings</p>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus size={11} /> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Stats strip */}
        <div className="grid grid-cols-4 border-b border-[rgba(18,18,18,0.10)] divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden bg-white">
          {([
            { label: 'Today',    value: stats.today    },
            { label: 'Upcoming', value: stats.upcoming },
            { label: 'Pending',  value: stats.pending  },
            { label: 'Done',     value: stats.done     },
          ]).map(({ label, value }) => (
            <div key={label} className="px-3 py-2.5 min-w-0 overflow-hidden">
              <p className="text-[8px] font-bold tracking-[0.10em] uppercase text-muted-text truncate mb-0.5">{label}</p>
              <p className="text-xl font-bold text-near-black tabular-nums">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-4">

          {/* View switcher + nav */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View tabs */}
            <div className="flex border border-[rgba(18,18,18,0.12)] overflow-hidden flex-shrink-0">
              {(['day', 'week', 'month'] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-bold tracking-[0.06em] uppercase transition-colors border-r border-[rgba(18,18,18,0.12)] last:border-r-0',
                    view === v
                      ? 'bg-near-black text-white'
                      : 'bg-white text-muted-text hover:text-near-black'
                  )}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Date navigation */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={prev}
                className="border border-[rgba(18,18,18,0.12)] bg-white p-1.5 hover:bg-cream transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setSelectedDate(todayStr())}
                className="border border-[rgba(18,18,18,0.12)] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors"
              >
                Today
              </button>
              <button
                onClick={next}
                className="border border-[rgba(18,18,18,0.12)] bg-white p-1.5 hover:bg-cream transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Range label */}
          <p className="text-sm font-semibold text-near-black -mt-1">{viewLabel}</p>

          {/* Create / edit form */}
          {showForm && (
            <CreateForm
              editId={editId}
              form={form}
              services={services}
              selectedSvc={selectedSvc}
              saving={saving}
              formError={formError}
              setField={setField}
              onSubmit={handleSubmit}
              onClose={closeForm}
            />
          )}

          {/* Views */}
          {view === 'day' && (
            <DayView
              date={selectedDate}
              appointments={dayAppts}
              loading={loading}
              actionLoading={actionLoading}
              onEdit={openEdit}
              onStatus={handleStatusUpdate}
              onCancel={handleCancel}
              onCreate={() => openCreate(selectedDate)}
            />
          )}

          {view === 'week' && (
            <WeekView
              weekDays={weekDays}
              appointments={appointments}
              today={today}
              loading={loading}
              onSelectDay={goToDay}
            />
          )}

          {view === 'month' && (
            <MonthView
              monthGrid={monthGrid}
              today={today}
              selectedDate={selectedDate}
              countByDate={countByDate}
              loading={loading}
              onSelectDay={goToDay}
            />
          )}

        </div>
      </div>
    </div>
  )
}

// ── Create / Edit form ────────────────────────────────────────────────────────

function CreateForm({
  editId, form, services, selectedSvc, saving, formError,
  setField, onSubmit, onClose,
}: {
  editId: number | null
  form: FormState
  services: Service[]
  selectedSvc?: Service
  saving: boolean
  formError: string | null
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.12)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(18,18,18,0.08)]">
        <h2 className="text-sm font-bold text-near-black">
          {editId !== null ? 'Edit Appointment' : 'New Appointment'}
        </h2>
        <button onClick={onClose} className="text-muted-text hover:text-near-black transition-colors">
          <X size={15} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-4 space-y-3">
        {formError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{formError}</p>
        )}

        <input
          type="text" placeholder="Full name *" required
          value={form.customer_name} onChange={e => setField('customer_name', e.target.value)}
          className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
        />

        <div className="grid grid-cols-2 gap-2">
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

        <select
          required value={form.service_id} onChange={e => setField('service_id', e.target.value)}
          className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
        >
          <option value="">Select a service *</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes} min · ${s.price.toFixed(0)}
            </option>
          ))}
        </select>

        {selectedSvc && (
          <p className="text-xs text-muted-text -mt-1">
            {selectedSvc.duration_minutes} min · ${selectedSvc.price.toFixed(2)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted-text mb-1">Date *</label>
            <input
              type="date" required
              value={form.appointment_date} onChange={e => setField('appointment_date', e.target.value)}
              className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-text mb-1">Time *</label>
            <input
              type="time" required
              value={form.start_time} onChange={e => setField('start_time', e.target.value)}
              className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
          </div>
        </div>

        {editId !== null && (
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
        )}

        <textarea
          placeholder="Notes (optional)" rows={2}
          value={form.notes} onChange={e => setField('notes', e.target.value)}
          className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
        />

        <div className="flex gap-2 pt-1">
          <button
            type="submit" disabled={saving}
            className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editId !== null ? 'Save Changes' : 'Create Appointment'}
          </button>
          <button
            type="button" onClick={onClose}
            className="border border-[rgba(18,18,18,0.15)] bg-white px-4 py-2.5 text-xs font-semibold text-near-black hover:bg-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  date, appointments, loading, actionLoading,
  onEdit, onStatus, onCancel, onCreate,
}: {
  date: string
  appointments: Appointment[]
  loading: boolean
  actionLoading: number | null
  onEdit: (a: Appointment) => void
  onStatus: (id: number, s: AppointmentStatus) => void
  onCancel: (id: number) => void
  onCreate: () => void
}) {
  if (loading) {
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-10 text-center text-sm text-muted-text">
        Loading…
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-10 text-center">
        <Calendar size={22} className="text-muted-text mx-auto mb-3" />
        <p className="text-sm font-semibold text-near-black mb-1">Nothing scheduled</p>
        <p className="text-xs text-muted-text mb-4">No appointments for this day.</p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus size={11} /> New Appointment
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {appointments.map(appt => {
        const terminal = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show'
        const busy = actionLoading === appt.id

        return (
          <div key={appt.id} className="bg-white border border-[rgba(18,18,18,0.10)]">
            <div className="px-4 py-3 space-y-2">

              {/* Time range + status + edit */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Clock size={11} className="text-muted-text flex-shrink-0" />
                  <span className="text-xs font-bold text-near-black whitespace-nowrap">
                    {fmt12(appt.start_time)} – {fmt12(appt.end_time)}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
                <button
                  onClick={() => onEdit(appt)}
                  className="flex-shrink-0 border border-[rgba(18,18,18,0.12)] px-2 py-1 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors"
                >
                  Edit
                </button>
              </div>

              {/* Client + service */}
              <div>
                <p className="text-sm font-semibold text-near-black truncate">{appt.customer_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Scissors size={10} className="text-muted-text flex-shrink-0" />
                  <p className="text-xs text-muted-text truncate">{appt.service_name}</p>
                  {appt.service_price !== null && (
                    <span className="text-xs text-muted-text flex-shrink-0">· ${appt.service_price.toFixed(0)}</span>
                  )}
                  {appt.service_duration_minutes && (
                    <span className="text-xs text-muted-text flex-shrink-0">· {appt.service_duration_minutes} min</span>
                  )}
                </div>
              </div>

              {appt.notes && (
                <p className="text-[11px] text-muted-text border-l-2 border-[rgba(18,18,18,0.12)] pl-2 italic">
                  {appt.notes}
                </p>
              )}

              {/* Action buttons */}
              {!terminal && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[rgba(18,18,18,0.06)]">
                  {appt.status === 'pending' && (
                    <ActionBtn
                      onClick={() => onStatus(appt.id, 'confirmed')}
                      disabled={busy} icon={<CheckCircle size={11} />} label="Confirm" primary
                    />
                  )}
                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <ActionBtn
                      onClick={() => onStatus(appt.id, 'completed')}
                      disabled={busy} icon={<CheckCircle size={11} />} label="Complete"
                    />
                  )}
                  {appt.status === 'confirmed' && (
                    <ActionBtn
                      onClick={() => onStatus(appt.id, 'no_show')}
                      disabled={busy} icon={<User size={11} />} label="No-show"
                    />
                  )}
                  <ActionBtn
                    onClick={() => onCancel(appt.id)}
                    disabled={busy} icon={<XCircle size={11} />} label="Cancel" danger
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  weekDays, appointments, today, loading, onSelectDay,
}: {
  weekDays: string[]
  appointments: Appointment[]
  today: string
  loading: boolean
  onSelectDay: (d: string) => void
}) {
  const byDay = weekDays.map(d => ({
    date: d,
    appts: appointments
      .filter(a => a.appointment_date === d)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }))

  return (
    <div>
      {/* Desktop: 7-column grid (sm+) */}
      <div className="hidden sm:grid grid-cols-7 border border-[rgba(18,18,18,0.10)] overflow-hidden rounded-none">
        {byDay.map(({ date, appts }, i) => {
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn(
                'border-r border-[rgba(18,18,18,0.08)] last:border-r-0 min-h-[100px] flex flex-col',
                isToday ? 'bg-cream' : 'bg-white'
              )}
            >
              {/* Day header */}
              <button
                onClick={() => onSelectDay(date)}
                className={cn(
                  'w-full py-2 text-center border-b border-[rgba(18,18,18,0.06)] hover:bg-[rgba(18,18,18,0.04)] transition-colors flex-shrink-0',
                  isToday ? 'bg-near-black hover:bg-near-black' : ''
                )}
              >
                <p className={cn('text-[8px] font-bold tracking-[0.10em] uppercase', isToday ? 'text-white/60' : 'text-muted-text')}>
                  {DAY_ABBR[i]}
                </p>
                <p className={cn('text-sm font-bold leading-none mt-0.5', isToday ? 'text-white' : 'text-near-black')}>
                  {new Date(date + 'T00:00:00').getDate()}
                </p>
              </button>

              {/* Appointment chips */}
              <div className="p-1 space-y-0.5 flex-1">
                {!loading && appts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onSelectDay(date)}
                    title={`${fmt12(a.start_time)} · ${a.customer_name} · ${a.service_name}`}
                    className={cn(
                      'w-full text-left px-1 py-0.5 text-[8px] leading-tight truncate border transition-colors',
                      a.status === 'cancelled' ? 'bg-white border-[rgba(18,18,18,0.10)] text-muted-text line-through' :
                      a.status === 'completed' ? 'bg-near-black border-near-black text-white' :
                      a.status === 'confirmed' ? 'bg-lavender border-transparent text-near-black' :
                                                  'bg-blush border-transparent text-near-black'
                    )}
                  >
                    <span className="font-bold">{a.start_time.slice(0, 5)}</span>{' '}
                    {a.customer_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: day-by-day list */}
      <div className="sm:hidden space-y-2">
        {byDay.map(({ date, appts }) => {
          const isToday = date === today
          return (
            <div key={date} className="bg-white border border-[rgba(18,18,18,0.10)]">
              <button
                onClick={() => onSelectDay(date)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                  isToday
                    ? 'bg-near-black hover:bg-near-black'
                    : 'hover:bg-cream border-b border-[rgba(18,18,18,0.06)]'
                )}
              >
                <span className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-near-black')}>
                  {fmtDate(date)}
                </span>
                <span className={cn('text-[10px]', isToday ? 'text-white/60' : 'text-muted-text')}>
                  {loading ? '…' : appts.length === 0 ? 'Free' : `${appts.length} appt${appts.length > 1 ? 's' : ''}`}
                </span>
              </button>
              {!loading && appts.length > 0 && (
                <div className="divide-y divide-[rgba(18,18,18,0.06)]">
                  {appts.map(a => (
                    <div key={a.id} className="px-4 py-2.5 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-near-black">{fmt12(a.start_time)}</span>
                          <StatusBadge status={a.status} />
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
    </div>
  )
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  monthGrid, today, selectedDate, countByDate, loading, onSelectDay,
}: {
  monthGrid: (string | null)[][]
  today: string
  selectedDate: string
  countByDate: Record<string, number>
  loading: boolean
  onSelectDay: (d: string) => void
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-[rgba(18,18,18,0.08)]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-center py-2 text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text border-r border-[rgba(18,18,18,0.06)] last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      {monthGrid.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[rgba(18,18,18,0.06)] last:border-b-0">
          {week.map((date, di) => {
            if (!date) {
              return (
                <div
                  key={di}
                  className="border-r border-[rgba(18,18,18,0.06)] last:border-r-0 min-h-[48px] bg-[rgba(18,18,18,0.015)]"
                />
              )
            }

            const isToday = date === today
            const isSelected = date === selectedDate
            const count = !loading ? (countByDate[date] || 0) : 0

            return (
              <button
                key={date}
                onClick={() => onSelectDay(date)}
                className={cn(
                  'border-r border-[rgba(18,18,18,0.06)] last:border-r-0 min-h-[48px] p-1.5 text-left flex flex-col gap-0.5 transition-colors hover:bg-cream',
                  isToday ? 'bg-near-black hover:bg-near-black' :
                  isSelected ? 'bg-cream' : 'bg-white'
                )}
              >
                <span className={cn(
                  'text-[11px] font-bold leading-none',
                  isToday ? 'text-white' : 'text-near-black'
                )}>
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                {count > 0 && (
                  <span className={cn(
                    'text-[8px] font-bold px-1 py-0.5 leading-none self-start',
                    isToday ? 'bg-white/25 text-white' : 'bg-blush text-near-black'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Action button ─────────────────────────────────────────────────────────────

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
        danger   ? 'bg-white text-[rgba(18,18,18,0.5)] border-[rgba(18,18,18,0.12)] hover:text-near-black' :
                   'bg-white text-near-black border-[rgba(18,18,18,0.12)] hover:bg-cream',
      )}
    >
      {icon} {label}
    </button>
  )
}
