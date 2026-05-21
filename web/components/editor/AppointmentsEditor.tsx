'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
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

// ── Form defaults ─────────────────────────────────────────────────────────────

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

type Filter = 'upcoming' | 'today' | 'pending' | 'completed' | 'all'

export default function AppointmentsEditor() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([getEditorAppointments({ limit: 200 }), getEditorServices()])
      .then(([appts, svcs]) => {
        setAppointments(appts)
        setServices(svcs.filter(s => s.is_active))
      })
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false))
  }, [])

  const today = todayStr()

  const stats = {
    today:     appointments.filter(a => a.appointment_date === today).length,
    upcoming:  appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled').length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  }

  const filtered = appointments.filter(a => {
    if (filter === 'today')     return a.appointment_date === today
    if (filter === 'upcoming')  return a.appointment_date >= today && a.status !== 'cancelled'
    if (filter === 'pending')   return a.status === 'pending'
    if (filter === 'completed') return a.status === 'completed'
    return true
  })

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
        setAppointments(prev => [created, ...prev].sort((a, b) =>
          a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)
        ))
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

  // ── Computed service info for form preview ────────────────────────────────

  const selectedService = services.find(s => s.id === Number(form.service_id))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Bookings / Appointments
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus size={11} /> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Page head */}
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-text mt-0.5">Manage bookings, clients, and appointment status.</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Today',     value: stats.today,     icon: Calendar },
            { label: 'Upcoming',  value: stats.upcoming,  icon: Clock },
            { label: 'Pending',   value: stats.pending,   icon: CheckCircle },
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

              {/* Client info */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Client</p>
                <input
                  type="text"
                  placeholder="Full name *"
                  value={form.customer_name}
                  onChange={e => setField('customer_name', e.target.value)}
                  required
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.customer_email}
                    onChange={e => setField('customer_email', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={form.customer_phone}
                    onChange={e => setField('customer_phone', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                </div>
              </div>

              {/* Service */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Service</p>
                <select
                  value={form.service_id}
                  onChange={e => setField('service_id', e.target.value)}
                  required
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

              {/* Date & time */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Date &amp; Time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-text mb-1">Date *</label>
                    <input
                      type="date"
                      value={form.appointment_date}
                      onChange={e => setField('appointment_date', e.target.value)}
                      required
                      className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-text mb-1">Start time *</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => setField('start_time', e.target.value)}
                      required
                      className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                </div>
              </div>

              {/* Status (edit only) */}
              {editId !== null && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Status</p>
                  <select
                    value={form.status}
                    onChange={e => setField('status', e.target.value as AppointmentStatus)}
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

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">Notes</p>
                <textarea
                  placeholder="Optional note for this appointment"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editId !== null ? 'Save Changes' : 'Create Appointment'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
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
            { key: 'upcoming',  label: 'Upcoming' },
            { key: 'today',     label: 'Today' },
            { key: 'pending',   label: 'Pending' },
            { key: 'completed', label: 'Completed' },
            { key: 'all',       label: 'All' },
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

        {/* Appointments list */}
        {loading ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center text-sm text-muted-text">
            Loading appointments…
          </div>
        ) : error ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-8 text-center text-sm text-red-500">
            {error}
          </div>
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
                busy={actionLoading === appt.id}
                onEdit={() => openEdit(appt)}
                onStatus={status => handleStatusUpdate(appt.id, status)}
                onCancel={() => handleCancel(appt.id)}
              />
            ))}
          </div>
        )}

        {/* TODOs for future */}
        {/* TODO: prevent overlapping appointments */}
        {/* TODO: apply availability rules (hours, blocked dates) */}
        {/* TODO: apply buffer_before_minutes / buffer_after_minutes */}
        {/* TODO: apply slot release rules */}
        {/* TODO: apply minimum_notice_minutes */}

      </div>
    </div>
  )
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  busy,
  onEdit,
  onStatus,
  onCancel,
}: {
  appt: Appointment
  busy: boolean
  onEdit: () => void
  onStatus: (s: AppointmentStatus) => void
  onCancel: () => void
}) {
  const today = todayStr()
  const isToday = appt.appointment_date === today
  const isFuture = appt.appointment_date >= today
  const terminal = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show'

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
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-near-black truncate">{appt.customer_name}</p>
              <StatusBadge status={appt.status} />
            </div>
            {(appt.customer_email || appt.customer_phone) && (
              <p className="text-[11px] text-muted-text mt-0.5 truncate">
                {appt.customer_email || appt.customer_phone}
              </p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="flex-shrink-0 border border-[rgba(18,18,18,0.12)] px-2.5 py-1 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Service + time */}
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

        {/* Action buttons */}
        {!terminal && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[rgba(18,18,18,0.06)]">
            {appt.status === 'pending' && isFuture && (
              <ActionBtn
                onClick={() => onStatus('confirmed')}
                disabled={busy}
                icon={<CheckCircle size={11} />}
                label="Confirm"
                primary
              />
            )}
            {(appt.status === 'pending' || appt.status === 'confirmed') && (
              <ActionBtn
                onClick={() => onStatus('completed')}
                disabled={busy}
                icon={<CheckCircle size={11} />}
                label="Complete"
              />
            )}
            {appt.status === 'confirmed' && (
              <ActionBtn
                onClick={() => onStatus('no_show')}
                disabled={busy}
                icon={<User size={11} />}
                label="No-show"
              />
            )}
            <ActionBtn
              onClick={onCancel}
              disabled={busy}
              icon={<XCircle size={11} />}
              label="Cancel"
              danger
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  onClick,
  disabled,
  icon,
  label,
  primary,
  danger,
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
