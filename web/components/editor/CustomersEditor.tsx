'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  DollarSign,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  StickyNote,
  User,
  Users,
  X,
} from 'lucide-react'
import {
  createEditorCustomer,
  getEditorCustomer,
  getEditorCustomers,
  toggleEditorCustomerVip,
  updateEditorCustomer,
} from '@/lib/api'
import type {
  Customer,
  CustomerAppointmentRow,
  CustomerCreatePayload,
  CustomerDetail,
  CustomerStatus,
  CustomerUpdatePayload,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '$0'
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`
}

function daysAgo(date: string | null): string | null {
  if (!date) return null
  const then = new Date(date + (date.length === 10 ? 'T00:00:00' : ''))
  const diff = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (diff <= 0)   return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 30)  return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}yr ago`
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<CustomerStatus, { label: string; cls: string }> = {
  new:       { label: 'New',       cls: 'bg-blush border-transparent text-near-black' },
  returning: { label: 'Returning', cls: 'bg-lavender border-transparent text-near-black' },
  regular:   { label: 'Regular',   cls: 'bg-near-black border-near-black text-white' },
  vip:       { label: 'VIP',       cls: 'bg-gradient-to-r from-[#E8C7DA] to-[#C9B4E6] border-transparent text-near-black' },
  inactive:  { label: 'Inactive',  cls: 'bg-white border-[rgba(18,18,18,0.20)] text-muted-text' },
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span
      className={cn(
        'text-[9px] font-bold tracking-[0.06em] uppercase border px-2 py-0.5 flex-shrink-0 whitespace-nowrap',
        cfg.cls,
      )}
    >
      {status === 'vip' && <Star size={9} className="inline -mt-px mr-1" fill="currentColor" />}
      {cfg.label}
    </span>
  )
}

// Appointment status pill — same palette as AppointmentsEditor so the
// timeline reads consistently with the bookings page.
function ApptStatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending:   'bg-blush text-near-black',
    confirmed: 'bg-lavender text-near-black',
    completed: 'bg-near-black text-white',
    cancelled: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text',
    no_show:   'bg-white border border-[rgba(18,18,18,0.20)] text-near-black',
  }
  return (
    <span
      className={cn(
        'text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 whitespace-nowrap',
        cfg[status] ?? 'bg-white border border-[rgba(18,18,18,0.12)] text-near-black',
      )}
    >
      {status.replace('_', '-')}
    </span>
  )
}

// ── Filter chip type ──────────────────────────────────────────────────────────

type Filter = 'all' | 'new' | 'returning' | 'regular' | 'vip' | 'inactive' | 'balance_due'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'new',         label: 'New' },
  { key: 'returning',   label: 'Returning' },
  { key: 'regular',     label: 'Regular' },
  { key: 'vip',         label: 'VIP' },
  { key: 'inactive',    label: 'Inactive' },
  { key: 'balance_due', label: 'Balance Due' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomersEditor() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<Filter>('all')

  // Drawer state — open by id, lazy-fetch full detail when opened.
  const [drawerId, setDrawerId]       = useState<number | null>(null)
  const [detail, setDetail]           = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    getEditorCustomers({ limit: 200 })
      .then(setCustomers)
      .catch(() => setError('Failed to load customers.'))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:        customers.length,
    vip:          customers.filter(c => c.is_vip).length,
    balanceDue:   customers.filter(c => (c.outstanding_balance ?? 0) > 0).length,
    inactive:     customers.filter(c => c.status === 'inactive').length,
  }), [customers])

  const filtered = useMemo(() => {
    let list = customers
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false),
      )
    }
    if (filter === 'balance_due') {
      list = list.filter(c => (c.outstanding_balance ?? 0) > 0)
    } else if (filter !== 'all') {
      list = list.filter(c => c.status === filter)
    }
    return list
  }, [customers, search, filter])

  // ── Drawer wiring ───────────────────────────────────────────────────────────

  async function openDrawer(id: number) {
    setDrawerId(id)
    setDetailLoading(true)
    setDetail(null)
    try {
      const d = await getEditorCustomer(id)
      setDetail(d)
    } catch {
      setError('Failed to load customer detail.')
      setDrawerId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDrawer() {
    setDrawerId(null)
    setDetail(null)
  }

  // Splice an updated customer back into both the list and the drawer
  // so a single source of truth stays in sync after VIP toggles / notes.
  function applyCustomer(updated: Customer) {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    setDetail(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Action bar */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus size={11} /> Add Customer
          </button>
        </div>

        {/* Stats strip — same visual language as AppointmentsEditor. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Total',       value: stats.total,      icon: Users,         filter: 'all'         as Filter },
            { label: 'VIP',         value: stats.vip,        icon: Star,          filter: 'vip'         as Filter },
            { label: 'Balance Due', value: stats.balanceDue, icon: DollarSign,    filter: 'balance_due' as Filter },
            { label: 'Inactive',    value: stats.inactive,   icon: AlertCircle,   filter: 'inactive'    as Filter },
          ] as const).map(({ label, value, icon: Icon, filter: target }) => {
            const isActive = filter === target
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(target)}
                className={cn(
                  'bg-white p-3 min-w-0 overflow-hidden text-left transition-colors',
                  isActive ? 'bg-cream' : 'hover:bg-cream',
                )}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <Icon size={10} className="text-muted-text flex-shrink-0" />
                  <p className="text-[8px] font-bold tracking-[0.10em] uppercase text-muted-text truncate">{label}</p>
                </div>
                <p className="text-2xl font-bold text-near-black tabular-nums">{loading ? '—' : value}</p>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white pl-9 pr-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-semibold border transition-colors',
                filter === key
                  ? 'bg-near-black text-white border-near-black'
                  : 'bg-white text-muted-text border-[rgba(18,18,18,0.12)] hover:text-near-black',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <EmptyMessage>Loading customers…</EmptyMessage>
        ) : error ? (
          <EmptyMessage error>{error}</EmptyMessage>
        ) : filtered.length === 0 ? (
          <EmptyMessage>
            {customers.length === 0
              ? 'No customers yet — add one with the button above or wait for your first public booking.'
              : 'No customers match those filters.'}
          </EmptyMessage>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <CustomerRow key={c.id} customer={c} onOpen={() => openDrawer(c.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {drawerId !== null && (
        <CustomerDrawer
          drawerCustomer={detail}
          loading={detailLoading}
          onClose={closeDrawer}
          onApply={applyCustomer}
        />
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateCustomerDialog
          onClose={() => setShowCreate(false)}
          onCreated={c => {
            setCustomers(prev => [c, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function EmptyMessage({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className={cn(
      'bg-white border border-[rgba(18,18,18,0.10)] px-5 py-12 text-center text-sm',
      error ? 'text-red-500' : 'text-muted-text',
    )}>
      {children}
    </div>
  )
}

function CustomerRow({ customer: c, onOpen }: { customer: Customer; onOpen: () => void }) {
  const balanceDue = (c.outstanding_balance ?? 0) > 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white border border-[rgba(18,18,18,0.10)] hover:border-near-black transition-colors px-4 py-3.5 flex items-start gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-near-black truncate">{c.name}</p>
          <StatusBadge status={c.status} />
          {balanceDue && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.20)] bg-blush text-near-black px-2 py-0.5">
              {fmtMoney(c.outstanding_balance)} due
            </span>
          )}
        </div>
        {(c.email || c.phone) && (
          <p className="text-[11px] text-muted-text truncate">
            {[c.email, c.phone].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-text flex-wrap mt-1">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {c.appointment_count === 0
              ? 'No visits yet'
              : `${c.appointment_count} visit${c.appointment_count === 1 ? '' : 's'}`}
          </span>
          {c.last_appointment && (
            <span>Last · {fmtDate(c.last_appointment.date)} ({daysAgo(c.last_appointment.date)})</span>
          )}
          {c.next_appointment && (
            <span className="text-near-black font-semibold">
              Next · {fmtDate(c.next_appointment.date)} {fmt12(c.next_appointment.start_time ?? '00:00')}
            </span>
          )}
          {c.total_spent > 0 && (
            <span className="text-near-black font-semibold">{fmtMoney(c.total_spent)} spent</span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-muted-text flex-shrink-0 mt-1" />
    </button>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function CustomerDrawer({
  drawerCustomer,
  loading,
  onClose,
  onApply,
}: {
  drawerCustomer: CustomerDetail | null
  loading: boolean
  onClose: () => void
  onApply: (c: Customer) => void
}) {
  // ESC closes the drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close drawer"
        className="absolute inset-0 bg-near-black/40 cursor-default"
      />
      {/* Panel */}
      <div className="ml-auto relative bg-cream w-full sm:max-w-lg h-full overflow-y-auto shadow-xl border-l border-[rgba(18,18,18,0.10)]">
        {loading || !drawerCustomer ? (
          <div className="p-6 text-sm text-muted-text">Loading customer…</div>
        ) : (
          <DrawerContent c={drawerCustomer} onClose={onClose} onApply={onApply} />
        )}
      </div>
    </div>
  )
}

function DrawerContent({
  c,
  onClose,
  onApply,
}: {
  c: CustomerDetail
  onClose: () => void
  onApply: (c: Customer) => void
}) {
  const [notes, setNotes] = useState(c.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [vipBusy, setVipBusy] = useState(false)

  // Sync local notes when drawer opens for a different customer.
  useEffect(() => { setNotes(c.notes ?? ''); setNotesSaved(false) }, [c.id, c.notes])

  const notesDirty = (c.notes ?? '') !== notes

  async function saveNotes() {
    if (! notesDirty) return
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      const payload: CustomerUpdatePayload = {
        name:  c.name,
        email: c.email,
        phone: c.phone,
        notes: notes || null,
      }
      const updated = await updateEditorCustomer(c.id, payload)
      onApply(updated)
      setNotesSaved(true)
      // Hide the saved chip after a bit so it feels live.
      setTimeout(() => setNotesSaved(false), 2200)
    } catch {
      // Leave the user's text intact; they can retry.
    } finally {
      setNotesSaving(false)
    }
  }

  async function toggleVip() {
    setVipBusy(true)
    try {
      const updated = await toggleEditorCustomerVip(c.id, ! c.is_vip)
      onApply(updated)
    } finally {
      setVipBusy(false)
    }
  }

  const createApptHref = `/editor/appointments?new=1&customer_id=${c.id}`
  const viewApptsHref  = `/editor/appointments?customer_id=${c.id}`

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-[rgba(18,18,18,0.10)] px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-near-black truncate">{c.name}</h2>
            <StatusBadge status={c.status} />
          </div>
          {(c.email || c.phone) && (
            <p className="text-xs text-muted-text mt-1 truncate">
              {[c.email, c.phone].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-text hover:text-near-black transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <DrawerAction icon={<Plus size={12} />} label="Create appt" href={createApptHref} primary />
          <DrawerAction icon={<Calendar size={12} />} label="View appts" href={viewApptsHref} />
          <DrawerAction
            icon={<Star size={12} fill={c.is_vip ? 'currentColor' : 'none'} />}
            label={c.is_vip ? 'Remove VIP' : 'Mark VIP'}
            onClick={toggleVip}
            disabled={vipBusy}
            active={c.is_vip}
          />
          <DrawerAction
            icon={<StickyNote size={12} />}
            label="Add note"
            onClick={() => {
              const el = document.getElementById('drawer-notes-textarea') as HTMLTextAreaElement | null
              el?.focus()
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        </div>

        {/* Contact */}
        <DrawerSection title="Contact">
          <ContactRow icon={<Mail size={11} />} label="Email" value={c.email} />
          <ContactRow icon={<Phone size={11} />} label="Phone" value={c.phone} />
          <ContactRow
            icon={<Calendar size={11} />}
            label="Customer since"
            value={fmtDate(c.created_at.slice(0, 10))}
          />
        </DrawerSection>

        {/* Payment snapshot */}
        <DrawerSection title="Payment snapshot">
          <div className="grid grid-cols-2 gap-2">
            <SnapshotCell label="Total spent"  value={fmtMoney(c.total_spent)} accent="ink" />
            <SnapshotCell label="Deposits"     value={fmtMoney(c.deposits_paid)} />
            <SnapshotCell label="Outstanding"  value={fmtMoney(c.outstanding_balance)} accent={c.outstanding_balance > 0 ? 'warn' : undefined} />
            <SnapshotCell label="Last payment" value={c.last_payment_status ? c.last_payment_status.replace(/_/g, ' ') : '—'} small />
          </div>
        </DrawerSection>

        {/* Appointment timeline */}
        <DrawerSection title="Appointment history" badge={`${c.appointments.length}`}>
          {c.appointments.length === 0 ? (
            <div className="bg-white border border-[rgba(18,18,18,0.08)] px-4 py-6 text-center text-xs text-muted-text">
              No appointments yet.
            </div>
          ) : (
            <div className="relative pl-4">
              {/* Vertical timeline rule */}
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[rgba(18,18,18,0.10)]" aria-hidden="true" />
              <ul className="space-y-3">
                {c.appointments.map(a => (
                  <TimelineRow key={a.id} a={a} />
                ))}
              </ul>
            </div>
          )}
        </DrawerSection>

        {/* Private notes */}
        <DrawerSection
          title="Private notes"
          subtitle="Only visible to your team — not shared with the customer."
          badge={notesSaved ? <span className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#0f6f3d]">Saved</span> : null}
        >
          <textarea
            id="drawer-notes-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Allergies, preferences, conversation starters…"
            rows={5}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={saveNotes}
              disabled={! notesDirty || notesSaving}
              className="px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase bg-near-black text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {notesSaving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </DrawerSection>
      </div>
    </>
  )
}

// ── Drawer building blocks ────────────────────────────────────────────────────

function DrawerSection({
  title, subtitle, badge, children,
}: {
  title:    string
  subtitle?: string
  badge?:   React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted-text">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-text">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[9px] font-bold tracking-[0.08em] uppercase text-muted-text">{badge}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function DrawerAction({
  icon, label, href, onClick, disabled, primary, active,
}: {
  icon:    React.ReactNode
  label:   string
  href?:   string
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
  active?:  boolean
}) {
  const className = cn(
    'flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-bold tracking-[0.08em] uppercase border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    primary
      ? 'bg-near-black text-white border-near-black hover:bg-[#2a2a2a]'
      : active
        ? 'bg-near-black text-white border-near-black hover:bg-[#2a2a2a]'
        : 'bg-white text-near-black border-[rgba(18,18,18,0.15)] hover:bg-cream',
  )
  if (href) {
    return (
      <a href={href} className={className}>{icon} {label}</a>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {icon} {label}
    </button>
  )
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.08)] px-3 py-2.5 flex items-center gap-3">
      <span className="text-muted-text flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text">{label}</p>
        <p className="text-xs text-near-black truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

function SnapshotCell({
  label, value, accent, small,
}: {
  label:   string
  value:   string
  accent?: 'ink' | 'warn'
  small?:  boolean
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.08)] px-3 py-2.5">
      <p className="text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text">{label}</p>
      <p className={cn(
        'font-bold tabular-nums mt-0.5',
        small ? 'text-xs capitalize' : 'text-base',
        accent === 'warn' ? 'text-[#b42828]' : 'text-near-black',
      )}>
        {value}
      </p>
    </div>
  )
}

function TimelineRow({ a }: { a: CustomerAppointmentRow }) {
  const paid    = (a.deposit_paid_amount ?? 0) + (a.balance_paid_amount ?? 0)
  const refund  = a.refunded_amount ?? 0
  const tip     = a.tip_amount ?? 0
  const due     = a.amount_due ?? 0
  return (
    <li className="relative">
      <span
        className={cn(
          'absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-cream',
          a.status === 'completed' ? 'bg-near-black' :
          a.status === 'confirmed' ? 'bg-[#C9B4E6]' :
          a.status === 'pending'   ? 'bg-[#E8C7DA]' :
                                     'bg-[rgba(18,18,18,0.20)]',
        )}
        aria-hidden="true"
      />
      <div className="bg-white border border-[rgba(18,18,18,0.08)] px-3 py-2.5 ml-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-near-black">
            {fmtDate(a.appointment_date)}
            <span className="text-muted-text font-normal ml-2">{fmt12(a.start_time)}</span>
          </p>
          <ApptStatusPill status={a.status} />
        </div>
        <p className="text-[11px] text-muted-text mt-1 truncate">{a.service_name}</p>
        {(paid > 0 || due > 0 || tip > 0 || refund > 0) && (
          <p className="text-[10px] text-muted-text mt-1.5 flex items-center gap-2 flex-wrap">
            {paid > 0 && (
              <span className="text-near-black">
                <DollarSign size={9} className="inline -mt-px" />{paid.toFixed(0)} paid
              </span>
            )}
            {due > 0 && (
              <span className="text-[#b42828]">{fmtMoney(due)} due</span>
            )}
            {tip > 0 && (
              <span className="text-[#0f6f3d]">+{fmtMoney(tip)} tip</span>
            )}
            {refund > 0 && (
              <span className="text-muted-text">−{fmtMoney(refund)} refunded</span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateFormState {
  name:  string
  email: string
  phone: string
  notes: string
}

function CreateCustomerDialog({
  onClose,
  onCreated,
}: {
  onClose:   () => void
  onCreated: (c: Customer) => void
}) {
  const [form, setForm] = useState<CreateFormState>({ name: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof CreateFormState>(k: K, v: CreateFormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (! form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: CustomerCreatePayload = {
        name:  form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      const created = await createEditorCustomer(payload)
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute inset-0 bg-near-black/40 cursor-default"
      />
      <div className="relative bg-white w-full max-w-md border border-[rgba(18,18,18,0.12)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(18,18,18,0.08)]">
          <h2 className="text-sm font-bold text-near-black tracking-tight">New Customer</h2>
          <button onClick={onClose} className="text-muted-text hover:text-near-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
          )}
          <input
            type="text" placeholder="Full name *" required
            value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <input
            type="email" placeholder="Email"
            value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <input
            type="tel" placeholder="Phone"
            value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <textarea
            placeholder="Private notes (optional)"
            value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
          />
          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add customer'}
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
    </div>
  )
}
