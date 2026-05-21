'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  createEditorCustomer,
  getEditorCustomers,
  updateEditorCustomer,
} from '@/lib/api'
import type { Customer, CustomerCreatePayload, CustomerUpdatePayload } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function thisMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-blush text-near-black' },
  confirmed: { label: 'Confirmed', cls: 'bg-lavender text-near-black' },
  completed: { label: 'Completed', cls: 'bg-near-black text-white' },
  cancelled: { label: 'Cancelled', cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' },
  no_show:   { label: 'No-show',   cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-near-black' },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_LABEL[status] ?? { label: status, cls: 'bg-white border border-[rgba(18,18,18,0.12)] text-near-black' }
  return (
    <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0 whitespace-nowrap', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  email: string
  phone: string
  notes: string
}

function emptyForm(): FormData {
  return { name: '', email: '', phone: '', notes: '' }
}

function customerToForm(c: Customer): FormData {
  return {
    name:  c.name,
    email: c.email  ?? '',
    phone: c.phone  ?? '',
    notes: c.notes  ?? '',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomersEditor() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Form state
  const [showForm, setShowForm]   = useState(false)
  const [formMode, setFormMode]   = useState<'create' | 'edit'>('create')
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [formData, setFormData]   = useState<FormData>(emptyForm())
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    getEditorCustomers({ limit: 200 })
      .then(setCustomers)
      .catch(() => setError('Failed to load customers.'))
      .finally(() => setLoading(false))
  }, [])

  const monthStart = thisMonthStart()

  const stats = {
    total:           customers.length,
    newThisMonth:    customers.filter(c => c.created_at >= monthStart).length,
    bookedThisMonth: customers.filter(c =>
      c.last_appointment_at != null && c.last_appointment_at >= monthStart
    ).length,
    repeatClients:   customers.filter(c => c.appointment_count > 1).length,
  }

  const filtered = search.trim()
    ? customers.filter(c => {
        const q = search.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone?.includes(q) ?? false)
        )
      })
    : customers

  // ── Form helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setFormMode('create')
    setEditTarget(null)
    setFormData(emptyForm())
    setFormError(null)
    setShowForm(true)
    // Collapse any expanded row
    setExpandedId(null)
  }

  function openEdit(customer: Customer) {
    setFormMode('edit')
    setEditTarget(customer)
    setFormData(customerToForm(customer))
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setFormError(null)
  }

  function setField(key: keyof FormData, value: string) {
    setFormData(f => ({ ...f, [key]: value }))
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Name is required.')
      return
    }

    setFormSaving(true)
    setFormError(null)

    try {
      if (formMode === 'create') {
        const payload: CustomerCreatePayload = {
          name:  formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }
        const created = await createEditorCustomer(payload)
        setCustomers(prev => [created, ...prev])
        closeForm()
      } else if (editTarget) {
        const payload: CustomerUpdatePayload = {
          name:  formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          notes: formData.notes.trim() || null,
        }
        const updated = await updateEditorCustomer(editTarget.id, payload)
        setCustomers(prev => prev.map(c => c.id === editTarget.id ? updated : c))
        closeForm()
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setFormSaving(false)
    }
  }

  function toggleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Customers</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus size={11} /> Add Customer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Page head */}
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">Customers</h1>
          <p className="text-sm text-muted-text mt-0.5">
            View client details, booking history, and contact info.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Total',          value: stats.total,           icon: Users },
            { label: 'New This Month', value: stats.newThisMonth,    icon: User },
            { label: 'Booked / Month', value: stats.bookedThisMonth, icon: Calendar },
            { label: 'Repeat Clients', value: stats.repeatClients,   icon: CheckCircle },
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

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black transition-colors"
          />
        </div>

        {/* Create / Edit form panel */}
        {showForm && (
          <div className="bg-white border border-[rgba(18,18,18,0.12)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(18,18,18,0.08)]">
              <h2 className="text-sm font-bold text-near-black tracking-tight">
                {formMode === 'create' ? 'Add Customer' : 'Edit Customer'}
              </h2>
              <button
                onClick={closeForm}
                className="text-muted-text hover:text-near-black transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                  {formError}
                </p>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-muted-text mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  required
                  value={formData.name}
                  onChange={e => setField('name', e.target.value)}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-text mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={e => setField('email', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-text mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="555-555-5555"
                    value={formData.phone}
                    onChange={e => setField('phone', e.target.value)}
                    className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-text mb-1.5">Notes</label>
                <textarea
                  placeholder="Any notes about this customer…"
                  rows={3}
                  value={formData.notes}
                  onChange={e => setField('notes', e.target.value)}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-y"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={formSaving}
                  className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {formSaving
                    ? 'Saving…'
                    : formMode === 'create'
                    ? 'Add Customer'
                    : 'Save Changes'}
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

        {/* Customer list */}
        {loading ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center text-sm text-muted-text">
            Loading customers…
          </div>
        ) : error ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-8 text-center text-sm text-red-500">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center">
            <Users size={24} className="text-muted-text mx-auto mb-3" />
            <p className="text-sm font-semibold text-near-black mb-1">
              {search ? 'No customers match your search' : 'No customers yet'}
            </p>
            <p className="text-xs text-muted-text mb-4">
              {search
                ? 'Try a different name, email, or phone number.'
                : 'Add a customer manually or they will be created automatically when a booking is submitted.'}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
              >
                <Plus size={11} /> Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="border border-[rgba(18,18,18,0.10)] overflow-hidden">
            {filtered.map((customer, i) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                expanded={expandedId === customer.id}
                onToggle={() => toggleExpand(customer.id)}
                onEdit={() => openEdit(customer)}
                isLast={i === filtered.length - 1}
              />
            ))}
          </div>
        )}

        {/* Count hint */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-[11px] text-muted-text text-center">
            {search
              ? `${filtered.length} of ${customers.length} customers`
              : `${customers.length} customer${customers.length !== 1 ? 's' : ''} total`}
          </p>
        )}

      </div>
    </div>
  )
}

// ── Customer row ──────────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  expanded,
  onToggle,
  onEdit,
  isLast,
}: {
  customer: Customer
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  isLast: boolean
}) {
  return (
    <div className={cn('bg-white', !isLast && 'border-b border-[rgba(18,18,18,0.08)]')}>

      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-4 hover:bg-[rgba(18,18,18,0.02)] transition-colors"
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-bold text-near-black truncate">{customer.name}</p>
              {customer.appointment_count > 0 && (
                <span className="text-[9px] font-bold bg-[rgba(18,18,18,0.06)] text-near-black px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                  {customer.appointment_count} appt{customer.appointment_count !== 1 ? 's' : ''}
                </span>
              )}
              {customer.upcoming_appointment_count > 0 && (
                <span className="text-[9px] font-bold bg-lavender text-near-black px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                  {customer.upcoming_appointment_count} upcoming
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {customer.email && (
                <span className="flex items-center gap-1 text-[11px] text-muted-text min-w-0">
                  <Mail size={10} className="flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1 text-[11px] text-muted-text">
                  <Phone size={10} className="flex-shrink-0" />
                  <span className="whitespace-nowrap">{customer.phone}</span>
                </span>
              )}
            </div>
            {customer.last_appointment_at && (
              <p className="text-[11px] text-muted-text mt-1">
                Last booked {fmtDate(customer.last_appointment_at.slice(0, 10))}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <div className={cn(
              'border border-[rgba(18,18,18,0.12)] px-2 py-1 text-[10px] font-semibold text-near-black transition-colors',
              expanded ? 'bg-near-black text-white border-near-black' : 'hover:bg-cream',
            )}>
              {expanded ? 'Close' : 'Details'}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[rgba(18,18,18,0.08)] bg-[#FAFAF8] px-4 py-4 space-y-4">

          {/* Contact */}
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">Contact</p>
            <div className="space-y-1.5">
              {customer.email ? (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-muted-text flex-shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-sm text-near-black hover:underline truncate">
                    {customer.email}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-text italic">No email on file</p>
              )}
              {customer.phone ? (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-muted-text flex-shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-sm text-near-black hover:underline">
                    {customer.phone}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-text italic">No phone on file</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">Notes</p>
              <p className="text-sm text-near-black whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}

          {/* Booking history */}
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">Booking History</p>
            <div className="space-y-2">
              {customer.next_appointment && (
                <div className="flex items-start gap-2.5">
                  <Clock size={12} className="text-muted-text flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-muted-text">Next</p>
                    <p className="text-sm font-semibold text-near-black">
                      {fmtDate(customer.next_appointment.date)}
                      {customer.next_appointment.start_time
                        ? ` at ${fmt12(customer.next_appointment.start_time)}`
                        : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-text truncate">{customer.next_appointment.service_name}</p>
                      <StatusPill status={customer.next_appointment.status} />
                    </div>
                  </div>
                </div>
              )}
              {customer.last_appointment && (
                <div className="flex items-start gap-2.5">
                  <Calendar size={12} className="text-muted-text flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-muted-text">Last</p>
                    <p className="text-sm font-semibold text-near-black">
                      {fmtDate(customer.last_appointment.date)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-text truncate">{customer.last_appointment.service_name}</p>
                      <StatusPill status={customer.last_appointment.status} />
                    </div>
                  </div>
                </div>
              )}
              {customer.appointment_count === 0 && (
                <p className="text-xs text-muted-text italic">No appointment history found.</p>
              )}
              <div className="text-[11px] text-muted-text">
                <span className="font-semibold text-near-black">{customer.appointment_count}</span>
                {' '}total appointment{customer.appointment_count !== 1 ? 's' : ''}
                {customer.upcoming_appointment_count > 0 && (
                  <> · <span className="font-semibold text-near-black">{customer.upcoming_appointment_count}</span> upcoming</>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[rgba(18,18,18,0.06)] pt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-muted-text">
              Client since {fmtDate(customer.created_at.slice(0, 10))}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                className="text-[10px] font-bold text-near-black border border-[rgba(18,18,18,0.15)] px-3 py-1.5 hover:bg-cream transition-colors"
              >
                Edit
              </button>
              <Link
                href="/editor/appointments"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-near-black border border-[rgba(18,18,18,0.15)] px-3 py-1.5 hover:bg-cream transition-colors"
              >
                View Appointments <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
