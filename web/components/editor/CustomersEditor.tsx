'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarClock,
  ChevronRight,
  DollarSign,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  StickyNote,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  createEditorCustomer,
  createEditorCustomerTag,
  deleteEditorCustomerTag,
  getEditorCustomer,
  getEditorCustomers,
  getEditorCustomerTags,
  getEditorServices,
  getEditorStaff,
  toggleEditorCustomerVip,
  updateEditorCustomer,
  updateEditorCustomerTag,
} from '@/lib/api'
import type {
  ApiStaffMember,
  Customer,
  CustomerAppointmentRow,
  CustomerCreatePayload,
  CustomerDetail,
  CustomerStatus,
  CustomerTag,
  CustomerTagPayload,
  CustomerUpdatePayload,
  Service,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import StatusBadge from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Friendly labels for the raw payment-status enum so owners never see
// snake_case like "pending_payment". Falls back to a humanized version.
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment:    'Deposit pending',
  deposit_paid:       'Deposit paid',
  paid:               'Paid',
  failed:             'Payment failed',
  refunded:           'Refunded',
  partially_refunded: 'Partially refunded',
}

function prettyPaymentStatus(s: string | null | undefined): string {
  if (!s) return 'None yet'
  return PAYMENT_STATUS_LABELS[s] ?? s.replace(/_/g, ' ')
}

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

// Status badges use the shared registry-driven <StatusBadge>:
//   domain="customer"    → lifecycle tier (New/Returning/Regular/VIP/Inactive)
//   domain="appointment" → the drawer's appointment timeline

// ── Filter chip type ──────────────────────────────────────────────────────────

type Filter =
  | 'all' | 'new' | 'returning' | 'regular' | 'vip' | 'inactive'
  | 'balance_due' | 'upcoming' | 'no_show_risk'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'new',          label: 'New' },
  { key: 'returning',    label: 'Returning' },
  { key: 'regular',      label: 'Regular' },
  { key: 'vip',          label: 'VIP' },
  { key: 'inactive',     label: 'Inactive' },
  { key: 'balance_due',  label: 'Balance due' },
  { key: 'upcoming',     label: 'Upcoming' },
  { key: 'no_show_risk', label: 'No-show risk' },
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

  // Phase 14 — master tag list + service / staff lookups for the
  // preferences dropdowns inside the drawer. Loaded once on mount;
  // each individually defensive so a 503 on one doesn't break the page.
  const [tags, setTags]         = useState<CustomerTag[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff]       = useState<ApiStaffMember[]>([])
  const [showTagsModal, setShowTagsModal] = useState(false)

  useEffect(() => {
    Promise.all([
      getEditorCustomers({ limit: 200 }),
      getEditorCustomerTags().catch(() => [] as CustomerTag[]),
      getEditorServices().catch(() => [] as Service[]),
      getEditorStaff({ active: true }).catch(() => [] as ApiStaffMember[]),
    ])
      .then(([cs, ts, svcs, stf]) => {
        setCustomers(cs)
        setTags(ts)
        setServices(svcs.filter(s => s.is_active))
        setStaff(stf.filter(s => s.is_active))
      })
      .catch(() => setError("Couldn’t load your customers. Refresh the page to try again."))
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
    } else if (filter === 'upcoming') {
      list = list.filter(c => (c.upcoming_appointment_count ?? 0) > 0)
    } else if (filter === 'no_show_risk') {
      list = list.filter(c => c.no_show_risk)
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
      setError("Couldn’t load this customer’s details. Try again in a minute.")
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
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowTagsModal(true)}
            className="flex items-center gap-1.5 bg-white border border-hairline-strong text-near-black px-3 py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:bg-cream transition-colors"
          >
            <TagIcon size={11} /> Manage tags
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
          >
            <Plus size={11} /> Add customer
          </button>
        </div>

        {/* Stats strip — same visual language as AppointmentsEditor. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-hairline-soft divide-y sm:divide-y-0 sm:divide-x divide-hairline-soft overflow-hidden">
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
                  'bg-white p-3 min-w-0 overflow-hidden text-left transition-colors group',
                  isActive ? 'bg-cream' : 'hover:bg-cream',
                )}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <Icon size={10} className="text-muted-text flex-shrink-0" />
                  <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text truncate">{label}</p>
                </div>
                <p className="text-2xl font-bold text-near-black tabular-nums">{loading ? '—' : value}</p>
                <p className="text-eyebrow font-semibold text-muted-text group-hover:text-near-black mt-0.5 inline-flex items-center gap-0.5">
                  {isActive ? 'Viewing' : 'View'} <ChevronRight size={10} />
                </p>
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
            className="w-full border border-hairline-strong bg-white pl-9 pr-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
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
                'px-3 py-1.5 text-eyebrow font-semibold border transition-colors',
                filter === key
                  ? 'bg-near-black text-white border-near-black'
                  : 'bg-white text-muted-text border-hairline hover:text-near-black',
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
              ? 'No customers yet. Add one with the Add customer button above, or your list will fill in as bookings come in.'
              : 'No customers match your search or filters. Try clearing them.'}
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
          tags={tags}
          services={services}
          staff={staff}
          onClose={closeDrawer}
          onApply={applyCustomer}
          onCreateTag={async (name, color) => {
            const created = await createEditorCustomerTag({ name, color })
            setTags(prev => [...prev, created].sort((a, b) =>
              a.sort_order - b.sort_order || a.name.localeCompare(b.name),
            ))
            return created
          }}
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

      {/* Manage tags modal (Phase 14) */}
      {showTagsModal && (
        <ManageTagsModal
          tags={tags}
          onClose={() => setShowTagsModal(false)}
          onCreate={async (name, color) => {
            const t = await createEditorCustomerTag({ name, color })
            setTags(prev => [...prev, t].sort((a, b) =>
              a.sort_order - b.sort_order || a.name.localeCompare(b.name),
            ))
          }}
          onUpdate={async (id, patch) => {
            const t = await updateEditorCustomerTag(id, patch)
            setTags(prev => prev.map(x => x.id === id ? t : x))
            // Also reflect the rename/color on the open detail's tags.
            setDetail(prev => prev
              ? { ...prev, tags: prev.tags.map(x => x.id === id ? { ...x, ...t } : x) }
              : prev)
            setCustomers(prev => prev.map(c => ({
              ...c,
              tags: c.tags?.map(x => x.id === id ? { ...x, ...t } : x) ?? c.tags,
            })))
          }}
          onDelete={async id => {
            await deleteEditorCustomerTag(id)
            setTags(prev => prev.filter(t => t.id !== id))
            // Strip the deleted tag from every customer + the detail.
            setDetail(prev => prev
              ? { ...prev, tags: prev.tags.filter(t => t.id !== id) }
              : prev)
            setCustomers(prev => prev.map(c => ({
              ...c,
              tags: c.tags?.filter(t => t.id !== id) ?? c.tags,
            })))
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
      'bg-white border border-hairline-soft px-5 py-12 text-center text-sm',
      error ? 'text-danger' : 'text-muted-text',
    )}>
      {children}
    </div>
  )
}

function CustomerRow({ customer: c, onOpen }: { customer: Customer; onOpen: () => void }) {
  const balanceDue = (c.outstanding_balance ?? 0) > 0
  const tagsShown  = (c.tags ?? []).slice(0, 3)
  const tagsExtra  = Math.max(0, (c.tags?.length ?? 0) - tagsShown.length)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white border border-hairline-soft hover:border-near-black transition-colors px-4 py-3.5 flex items-start gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-near-black truncate">{c.name}</p>
          <StatusBadge domain="customer" status={c.status} />
          {balanceDue && (
            <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-blush text-near-black px-2 py-0.5">
              {fmtMoney(c.outstanding_balance)} due
            </span>
          )}
          {c.no_show_risk && (
            <span
              className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.06em] uppercase border border-danger bg-danger-bg text-danger px-2 py-0.5"
              title="Flagged because they’ve missed 2 or more of their last 5 visits, or no-show on 30% or more of bookings."
            >
              <AlertTriangle size={9} /> No-show risk
            </span>
          )}
          {c.is_account_holder && (
            <span
              className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-lavender text-near-black px-2 py-0.5"
              title="This customer has a BookReady account, so their email is verified and they can manage their own bookings."
            >
              Account
            </span>
          )}
        </div>
        {tagsShown.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {tagsShown.map(t => <TagChip key={t.id} tag={t} />)}
            {tagsExtra > 0 && (
              <span className="text-eyebrow font-semibold text-muted-text">+{tagsExtra}</span>
            )}
          </div>
        )}
        {(c.email || c.phone) && (
          <p className="text-2xs text-muted-text truncate">
            {[c.email, c.phone].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center gap-3 text-2xs text-muted-text flex-wrap mt-1">
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
  tags,
  services,
  staff,
  onClose,
  onApply,
  onCreateTag,
}: {
  drawerCustomer: CustomerDetail | null
  loading:        boolean
  tags:           CustomerTag[]
  services:       Service[]
  staff:          ApiStaffMember[]
  onClose:        () => void
  onApply:        (c: Customer) => void
  /** Inline tag creation from the picker. Returns the newly created
   *  tag so the picker can immediately add it to the customer's set. */
  onCreateTag:    (name: string, color: string | null) => Promise<CustomerTag>
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
      <div className="ml-auto relative bg-cream w-full sm:max-w-lg h-full overflow-y-auto shadow-xl border-l border-hairline-soft">
        {loading || !drawerCustomer ? (
          <div className="p-6 text-sm text-muted-text">Loading customer…</div>
        ) : (
          <DrawerContent
            c={drawerCustomer}
            tags={tags}
            services={services}
            staff={staff}
            onClose={onClose}
            onApply={onApply}
            onCreateTag={onCreateTag}
          />
        )}
      </div>
    </div>
  )
}

function DrawerContent({
  c,
  tags,
  services,
  staff,
  onClose,
  onApply,
  onCreateTag,
}: {
  c:           CustomerDetail
  tags:        CustomerTag[]
  services:    Service[]
  staff:       ApiStaffMember[]
  onClose:     () => void
  onApply:     (c: Customer) => void
  onCreateTag: (name: string, color: string | null) => Promise<CustomerTag>
}) {
  const [notes, setNotes] = useState(c.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [vipBusy, setVipBusy] = useState(false)

  // Sync local notes when drawer opens for a different customer.
  useEffect(() => { setNotes(c.notes ?? ''); setNotesSaved(false) }, [c.id, c.notes])

  const toast = useToast()
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
      toast.error("Couldn’t save note — try again in a moment.")
    } finally {
      setNotesSaving(false)
    }
  }

  async function toggleVip() {
    setVipBusy(true)
    try {
      const updated = await toggleEditorCustomerVip(c.id, ! c.is_vip)
      onApply(updated)
      toast.success(updated.is_vip ? 'Marked as VIP' : 'No longer VIP')
    } catch {
      toast.error("Couldn’t update VIP status — try again in a moment.")
    } finally {
      setVipBusy(false)
    }
  }

  const createApptHref = `/editor/appointments?new=1&customer_id=${c.id}`
  const viewApptsHref  = `/editor/appointments?customer_id=${c.id}`

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-hairline-soft px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-near-black truncate">{c.name}</h2>
            <StatusBadge domain="customer" status={c.status} />
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
          <DrawerAction icon={<Plus size={12} />} label="New appointment" href={createApptHref} primary />
          <DrawerAction icon={<Calendar size={12} />} label="View appointments" href={viewApptsHref} />
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

        {/* Tags (Phase 14) */}
        <DrawerSection title="Tags" subtitle="Quick labels to organize and find customers later.">
          <TagsPicker
            customerId={c.id}
            assigned={c.tags}
            available={tags}
            onCreateTag={onCreateTag}
            onChange={async nextIds => {
              // Save the new tag set immediately. We send a partial PATCH
              // that only touches the pivot so other fields don't bounce.
              const updated = await updateEditorCustomer(c.id, {
                name:    c.name,
                tag_ids: nextIds,
              })
              onApply(updated)
            }}
          />
        </DrawerSection>

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

        {/* Preferences (Phase 14) */}
        <DrawerSection
          title="Preferences"
          subtitle="What they like, so future bookings come pre-filled with the right service and stylist."
        >
          <PreferencesForm
            customer={c}
            services={services}
            staff={staff}
            onApply={onApply}
          />
        </DrawerSection>

        {/* Payment snapshot */}
        <DrawerSection title="Payment snapshot">
          <div className="grid grid-cols-2 gap-2">
            <SnapshotCell label="Total spent"  value={fmtMoney(c.total_spent)} accent="ink" />
            <SnapshotCell label="Deposits"     value={fmtMoney(c.deposits_paid)} />
            <SnapshotCell label="Outstanding"  value={fmtMoney(c.outstanding_balance)} accent={c.outstanding_balance > 0 ? 'warn' : undefined} />
            <SnapshotCell label="Last payment" value={prettyPaymentStatus(c.last_payment_status)} small />
          </div>
        </DrawerSection>

        {/* Appointment timeline */}
        <DrawerSection title="Appointment history" badge={`${c.appointments.length}`}>
          {c.appointments.length === 0 ? (
            <div className="bg-white border border-hairline-soft px-4 py-6 text-center text-xs text-muted-text">
              No appointments yet.
            </div>
          ) : (
            <div className="relative pl-4">
              {/* Vertical timeline rule */}
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-hairline-soft" aria-hidden="true" />
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
          subtitle="Only your team sees these. Never shared with the customer."
          badge={notesSaved ? <span className="text-eyebrow font-bold tracking-[0.08em] uppercase text-success">Saved</span> : null}
        >
          <textarea
            id="drawer-notes-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Allergies, preferences, conversation starters…"
            rows={5}
            className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={saveNotes}
              disabled={! notesDirty || notesSaving}
              className="px-3 py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {notesSaving ? 'Saving…' : 'Save notes'}
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
          <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">{title}</p>
          {subtitle && <p className="text-2xs text-muted-text">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-eyebrow font-bold tracking-[0.08em] uppercase text-muted-text">{badge}</span>
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
    'flex items-center justify-center gap-1.5 px-3 py-2.5 text-eyebrow font-bold tracking-[0.08em] uppercase border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    primary
      ? 'bg-near-black text-white border-near-black hover:opacity-90'
      : active
        ? 'bg-near-black text-white border-near-black hover:opacity-90'
        : 'bg-white text-near-black border-hairline-strong hover:bg-cream',
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
    <div className="bg-white border border-hairline-soft px-3 py-2.5 flex items-center gap-3">
      <span className="text-muted-text flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text">{label}</p>
        <p className="text-xs text-near-black truncate">{value || 'Not on file'}</p>
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
    <div className="bg-white border border-hairline-soft px-3 py-2.5">
      <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text">{label}</p>
      <p className={cn(
        'font-bold tabular-nums mt-0.5',
        small ? 'text-xs capitalize' : 'text-base',
        accent === 'warn' ? 'text-danger' : 'text-near-black',
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
          'absolute -left-3 top-1.5 w-2.5 h-2.5  border-2 border-cream',
          a.status === 'completed' ? 'bg-near-black' :
          a.status === 'confirmed' ? 'bg-[#C9B4E6]' :
          a.status === 'pending'   ? 'bg-[#E8C7DA]' :
                                     'bg-hairline-strong',
        )}
        aria-hidden="true"
      />
      <div className="bg-white border border-hairline-soft px-3 py-2.5 ml-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-near-black">
            {fmtDate(a.appointment_date)}
            <span className="text-muted-text font-normal ml-2">{fmt12(a.start_time)}</span>
          </p>
          <StatusBadge domain="appointment" status={a.status} />
        </div>
        <p className="text-2xs text-muted-text mt-1 truncate">{a.service_name}</p>
        {(paid > 0 || due > 0 || tip > 0 || refund > 0) && (
          <p className="text-eyebrow text-muted-text mt-1.5 flex items-center gap-2 flex-wrap">
            {paid > 0 && (
              <span className="text-near-black">
                <DollarSign size={9} className="inline -mt-px" />{paid.toFixed(0)} paid
              </span>
            )}
            {due > 0 && (
              <span className="text-danger">{fmtMoney(due)} due</span>
            )}
            {tip > 0 && (
              <span className="text-success">+{fmtMoney(tip)} tip</span>
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
      setError(err instanceof Error ? err.message : "Couldn’t save this customer. Try again in a moment.")
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
      <div className="relative bg-white w-full max-w-md border border-hairline max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
          <h2 className="text-sm font-bold text-near-black tracking-tight">New customer</h2>
          <button onClick={onClose} className="text-muted-text hover:text-near-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-danger bg-danger-bg border border-danger px-3 py-2">{error}</p>
          )}
          <input
            type="text" placeholder="Full name (required)" required
            value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <input
            type="email" placeholder="Email"
            value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <input
            type="tel" placeholder="Phone"
            value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
          />
          <textarea
            placeholder="Private notes — allergies, preferences, anything to remember (optional)"
            value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
          />
          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add customer'}
            </button>
            <button
              type="button" onClick={onClose}
              className="border border-hairline-strong bg-white px-4 py-2.5 text-xs font-semibold text-near-black hover:bg-cream transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tag UI helpers (Phase 14) ─────────────────────────────────────────────────

/** Small fixed palette so tags feel branded without a full color picker. */
const TAG_PALETTE: { name: string; hex: string; ink: 'light' | 'dark' }[] = [
  { name: 'Pink',     hex: '#E8C7DA', ink: 'dark' },
  { name: 'Lavender', hex: '#C9B4E6', ink: 'dark' },
  { name: 'Blush',    hex: '#F4D9CE', ink: 'dark' },
  { name: 'Ink',      hex: '#121212', ink: 'light' },
  { name: 'Forest',   hex: '#0F6F3D', ink: 'light' },
  { name: 'Clay',     hex: '#B45F3A', ink: 'light' },
]

function inkForTag(hex: string | null | undefined): 'light' | 'dark' {
  const match = TAG_PALETTE.find(p => p.hex.toLowerCase() === (hex ?? '').toLowerCase())
  return match?.ink ?? 'dark'
}

function TagChip({ tag, onRemove }: { tag: CustomerTag; onRemove?: () => void }) {
  const ink   = inkForTag(tag.color)
  const style = tag.color
    ? { backgroundColor: tag.color, color: ink === 'light' ? '#fff' : '#121212', borderColor: 'transparent' }
    : undefined
  return (
    <span
      className="inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.04em] border border-hairline bg-white text-near-black px-2 py-0.5"
      style={style}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          className="opacity-70 hover:opacity-100"
          aria-label={`Remove ${tag.name}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

function TagsPicker({
  customerId, assigned, available, onCreateTag, onChange,
}: {
  customerId:  number
  assigned:    CustomerTag[]
  available:   CustomerTag[]
  onCreateTag: (name: string, color: string | null) => Promise<CustomerTag>
  onChange:    (nextIds: number[]) => Promise<void>
}) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  // Close on outside click + Escape.
  useEffect(() => {
    if (! open) return
    function onDown(e: MouseEvent) {
      if (ref.current && ! ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const assignedIds = new Set(assigned.map(t => t.id))
  const filtered = available.filter(t =>
    ! assignedIds.has(t.id) &&
    t.name.toLowerCase().includes(query.toLowerCase()),
  )

  async function toggle(tagId: number, on: boolean) {
    setBusy(true)
    try {
      const next = on
        ? Array.from(new Set([...assigned.map(t => t.id), tagId]))
        : assigned.map(t => t.id).filter(id => id !== tagId)
      await onChange(next)
    } finally {
      setBusy(false)
    }
  }

  async function submitNew() {
    const name = newName.trim()
    if (! name || busy) return
    setBusy(true)
    try {
      const created = await onCreateTag(name, newColor)
      await onChange([...assigned.map(t => t.id), created.id])
      setNewName('')
      setNewColor(null)
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {assigned.map(t => (
          <TagChip key={t.id} tag={t} onRemove={() => toggle(t.id, false)} />
        ))}
        <button
          type="button"
          onClick={() => setOpen(o => ! o)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.08em] uppercase border border-dashed border-hairline-strong text-near-black bg-white px-2 py-0.5 hover:bg-cream transition-colors disabled:opacity-50"
        >
          <Plus size={10} /> Add tag
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-2 left-0 w-[280px] bg-white border border-hairline-strong shadow-xl p-2">
          {! creating && (
            <>
              <input
                type="text"
                placeholder="Search tags…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full border border-hairline bg-white px-2 py-1.5 text-xs text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black mb-2"
              />
              <div className="max-h-44 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                  <p className="text-2xs text-muted-text px-1.5 py-2">
                    {available.length === 0
                      ? 'No tags yet. Create your first one below.'
                      : 'No tags match your search.'}
                  </p>
                ) : filtered.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id, true)}
                    disabled={busy}
                    className="w-full flex items-center gap-2 px-1.5 py-1 text-left hover:bg-cream transition-colors text-xs disabled:opacity-50"
                  >
                    <TagChip tag={t} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setCreating(true); setNewName(query) }}
                className="mt-2 w-full flex items-center justify-center gap-1 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white py-1.5 hover:opacity-90 transition-colors"
              >
                <Plus size={10} /> New tag
              </button>
            </>
          )}
          {creating && (
            <div className="space-y-2">
              <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text">New tag</p>
              <input
                type="text"
                placeholder="Tag name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitNew() }}
                autoFocus
                className="w-full border border-hairline bg-white px-2 py-1.5 text-xs text-near-black focus:outline-none focus:border-near-black"
              />
              <ColorPalettePicker value={newColor} onChange={setNewColor} />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={submitNew}
                  disabled={! newName.trim() || busy}
                  className="flex-1 bg-near-black text-white py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors disabled:opacity-50"
                >Create</button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(''); setNewColor(null) }}
                  className="border border-hairline-strong bg-white px-3 py-1.5 text-eyebrow font-semibold text-near-black hover:bg-cream transition-colors"
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ColorPalettePicker({
  value, onChange,
}: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'w-6 h-6 border border-hairline-strong flex items-center justify-center text-eyebrow font-bold',
          value === null && 'ring-2 ring-near-black',
        )}
        title="No color"
      >×</button>
      {TAG_PALETTE.map(p => (
        <button
          key={p.hex}
          type="button"
          onClick={() => onChange(p.hex)}
          style={{ backgroundColor: p.hex }}
          className={cn(
            'w-6 h-6 border border-hairline-strong',
            value === p.hex && 'ring-2 ring-near-black',
          )}
          title={p.name}
        />
      ))}
    </div>
  )
}

// ── Preferences form (Phase 14) ──────────────────────────────────────────────

function PreferencesForm({
  customer, services, staff, onApply,
}: {
  customer: CustomerDetail
  services: Service[]
  staff:    ApiStaffMember[]
  onApply:  (c: Customer) => void
}) {
  const p = customer.preferences
  const initial = {
    preferred_service_id:     p.preferred_service_id     ?? '',
    preferred_staff_id:       p.preferred_staff_id       ?? '',
    preferred_time_of_day:    p.preferred_time_of_day    ?? '',
    preferred_contact_method: p.preferred_contact_method ?? '',
    birthday:                 p.birthday                 ?? '',
    preferences_notes:        p.preferences_notes        ?? '',
  }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Reset when the drawer switches customer.
  useEffect(() => {
    setForm({
      preferred_service_id:     p.preferred_service_id     ?? '',
      preferred_staff_id:       p.preferred_staff_id       ?? '',
      preferred_time_of_day:    p.preferred_time_of_day    ?? '',
      preferred_contact_method: p.preferred_contact_method ?? '',
      birthday:                 p.birthday                 ?? '',
      preferences_notes:        p.preferences_notes        ?? '',
    })
    setSaved(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id])

  const dirty =
    String(form.preferred_service_id)     !== String(p.preferred_service_id     ?? '') ||
    String(form.preferred_staff_id)       !== String(p.preferred_staff_id       ?? '') ||
    (form.preferred_time_of_day    || null) !== (p.preferred_time_of_day    ?? null) ||
    (form.preferred_contact_method || null) !== (p.preferred_contact_method ?? null) ||
    (form.birthday                 || null) !== (p.birthday                 ?? null) ||
    (form.preferences_notes        || null) !== (p.preferences_notes        ?? null)

  const toast = useToast()
  async function save() {
    if (! dirty) return
    setSaving(true)
    setSaved(false)
    try {
      const payload: CustomerUpdatePayload = {
        name:                      customer.name,
        preferred_service_id:      form.preferred_service_id === '' ? null : Number(form.preferred_service_id),
        preferred_staff_id:        form.preferred_staff_id   === '' ? null : Number(form.preferred_staff_id),
        preferred_time_of_day:     (form.preferred_time_of_day    || null) as CustomerUpdatePayload['preferred_time_of_day'],
        preferred_contact_method:  (form.preferred_contact_method || null) as CustomerUpdatePayload['preferred_contact_method'],
        birthday:                  form.birthday || null,
        preferences_notes:         form.preferences_notes || null,
      }
      const updated = await updateEditorCustomer(customer.id, payload)
      onApply(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch {
      toast.error("Couldn’t save preferences — try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <PrefDropdown
        label="Preferred service"
        value={String(form.preferred_service_id)}
        onChange={v => setForm(f => ({ ...f, preferred_service_id: v }))}
        options={[{ value: '', label: 'No preference' }, ...services.map(s => ({ value: String(s.id), label: s.name }))]}
      />
      <PrefDropdown
        label="Preferred staff"
        value={String(form.preferred_staff_id)}
        onChange={v => setForm(f => ({ ...f, preferred_staff_id: v }))}
        options={[{ value: '', label: 'No preference' }, ...staff.map(s => ({ value: String(s.id), label: s.name }))]}
      />
      <PrefDropdown
        label="Preferred time of day"
        value={form.preferred_time_of_day}
        onChange={v => setForm(f => ({ ...f, preferred_time_of_day: v }))}
        options={[
          { value: '',          label: 'No preference' },
          { value: 'morning',   label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
          { value: 'evening',   label: 'Evening' },
        ]}
      />
      <PrefDropdown
        label="Preferred contact"
        value={form.preferred_contact_method}
        onChange={v => setForm(f => ({ ...f, preferred_contact_method: v }))}
        options={[
          { value: '',      label: 'No preference' },
          { value: 'email', label: 'Email' },
          { value: 'sms',   label: 'Text message' },
          { value: 'phone', label: 'Phone call' },
        ]}
      />
      <div className="bg-white border border-hairline-soft px-3 py-2.5">
        <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-1">Birthday</p>
        <input
          type="date"
          value={form.birthday}
          onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
          className="w-full text-xs text-near-black bg-transparent focus:outline-none"
        />
      </div>
      <div className="bg-white border border-hairline-soft px-3 py-2.5">
        <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-1">
          Service preferences
        </p>
        <p className="text-eyebrow text-muted-text mb-2">
          Hair / skin / nails / lashes specifics, allergies, formulas they hate, and so on.
        </p>
        <textarea
          value={form.preferences_notes}
          onChange={e => setForm(f => ({ ...f, preferences_notes: e.target.value }))}
          placeholder="e.g. Allergic to lavender, prefers shorter cuticles, hates pink polish…"
          rows={4}
          className="w-full border-0 bg-transparent text-xs text-near-black placeholder:text-muted-text focus:outline-none resize-none p-0"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="text-eyebrow font-bold tracking-[0.08em] uppercase text-success">Saved</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={! dirty || saving}
          className="px-3 py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}

function PrefDropdown({
  label, value, onChange, options,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string }[]
}) {
  return (
    <div className="bg-white border border-hairline-soft px-3 py-2.5">
      <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-1">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-xs text-near-black bg-transparent focus:outline-none appearance-none cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Manage tags modal (Phase 14) ─────────────────────────────────────────────

function ManageTagsModal({
  tags, onClose, onCreate, onUpdate, onDelete,
}: {
  tags:     CustomerTag[]
  onClose:  () => void
  onCreate: (name: string, color: string | null) => Promise<void>
  onUpdate: (id: number, patch: Partial<CustomerTagPayload>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName]   = useState('')
  const [editColor, setEditColor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()

  async function submitNew() {
    const name = newName.trim()
    if (! name || busy) return
    setBusy(true)
    try {
      await onCreate(name, newColor)
      setNewName(''); setNewColor(null); setCreating(false)
    } finally { setBusy(false) }
  }
  async function submitEdit(id: number) {
    if (! editName.trim() || busy) return
    setBusy(true)
    try {
      await onUpdate(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
    } finally { setBusy(false) }
  }
  async function remove(id: number) {
    const ok = await confirm({
      title: 'Delete this tag?',
      message: "This tag will be removed from every customer who has it. This can’t be undone.",
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (! ok) return
    setBusy(true)
    try { await onDelete(id) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute inset-0 bg-near-black/40 cursor-default"
      />
      <div className="relative bg-white w-full max-w-md border border-hairline max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
          <h2 className="text-sm font-bold text-near-black tracking-tight inline-flex items-center gap-2">
            <TagIcon size={14} /> Manage tags
          </h2>
          <button onClick={onClose} className="text-muted-text hover:text-near-black transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {tags.length === 0 && ! creating && (
            <p className="text-xs text-muted-text">No tags yet. Create your first one below.</p>
          )}

          {tags.map(t => (
            <div key={t.id} className="border border-hairline-soft bg-white p-3">
              {editingId === t.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitEdit(t.id) }}
                    className="w-full border border-hairline bg-white px-2 py-1.5 text-xs text-near-black focus:outline-none focus:border-near-black"
                    autoFocus
                  />
                  <ColorPalettePicker value={editColor} onChange={setEditColor} />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => submitEdit(t.id)}
                      disabled={busy}
                      className="flex-1 bg-near-black text-white py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors disabled:opacity-50"
                    >Save</button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="border border-hairline-strong bg-white px-3 py-1.5 text-eyebrow font-semibold text-near-black hover:bg-cream transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <TagChip tag={t} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingId(t.id); setEditName(t.name); setEditColor(t.color) }}
                      disabled={busy}
                      className="text-muted-text hover:text-near-black p-1"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      disabled={busy}
                      className="text-muted-text hover:text-danger p-1"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {creating ? (
            <div className="border border-hairline-soft bg-cream p-3 space-y-2">
              <p className="text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text">New tag</p>
              <input
                type="text"
                placeholder="Tag name, e.g. Allergy: latex"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitNew() }}
                autoFocus
                className="w-full border border-hairline bg-white px-2 py-1.5 text-xs text-near-black focus:outline-none focus:border-near-black"
              />
              <ColorPalettePicker value={newColor} onChange={setNewColor} />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={submitNew}
                  disabled={! newName.trim() || busy}
                  className="flex-1 bg-near-black text-white py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors disabled:opacity-50"
                >Create</button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(''); setNewColor(null) }}
                  className="border border-hairline-strong bg-white px-3 py-1.5 text-eyebrow font-semibold text-near-black hover:bg-cream transition-colors"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full inline-flex items-center justify-center gap-1 bg-near-black text-white py-2 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
            >
              <Plus size={11} /> New tag
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
