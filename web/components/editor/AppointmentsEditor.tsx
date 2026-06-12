'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  getEditorServiceAddons,
  getEditorServices,
  getEditorStaff,
  markEditorAppointmentPaid,
  refundEditorAppointment,
  requestEditorAppointmentTip,
  updateEditorAppointment,
} from '@/lib/api'
import type {
  ApiStaffMember,
  Appointment,
  AppointmentStatus,
  CreateAppointmentPayload,
  MarkPaidPayload,
  PaymentSettings,
  RefundPayload,
  Service,
  ServiceAddon,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import { safeHref } from '@/lib/safeHref'
import { PaymentPill, PaymentSummary } from '@/components/editor/AppointmentPaymentStatus'
import StatusBadge from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { usePlan } from '@/components/editor/PlanContext'
import { useRole } from '@/components/app/RoleContext'
import { useToast } from '@/components/ui/Toast'
import RefundDialog from '@/components/editor/RefundDialog'
import MarkPaidDialog from '@/components/editor/MarkPaidDialog'
import ChargeBalanceDialog from '@/components/editor/ChargeBalanceDialog'

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** YYYY-MM-DD for "today + offset days" (negative offsets go backward). */
function dateWithOffset(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

/** Compute the integer day-offset between an arbitrary date and today. */
function offsetFromDate(date: string): number {
  const a = new Date(date + 'T00:00:00')
  const b = new Date(todayStr() + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** Long human label for the day toolbar, e.g. "Today · Mon, Nov 3". */
function dayNavLabel(date: string): string {
  const t = todayStr()
  const long = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  if (date === t)                        return `Today · ${long}`
  if (date === dateWithOffset(-1))       return `Yesterday · ${long}`
  if (date === dateWithOffset(1))        return `Tomorrow · ${long}`
  return long
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
  if (status === 'no_show')   return 'bg-white border-hairline text-near-black'
  if (status === 'cancelled') return 'bg-white border-hairline text-muted-text'
  return 'bg-blush border-transparent text-near-black' // pending
}

// Status badges use the shared registry-driven <StatusBadge domain="appointment">.
// (apptStatusChipCls above still styles the compact week/month calendar chips.)

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
  // Phase 7 — chosen staff + add-on selection. Empty string staff_id
  // means "any staff" (server stores null).
  staff_id: string
  addon_ids: number[]
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
    staff_id: '',
    addon_ids: [],
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
    staff_id:         a.staff_id != null ? String(a.staff_id) : '',
    addon_ids:        (a.addons ?? []).map(x => x.addon_id),
  }
}

// ── Main component ────────────────────────────────────────────────────────────

type Filter = 'today' | 'week' | 'month' | 'pending' | 'upcoming' | 'all'

const VALID_FILTERS: Filter[] = ['today', 'week', 'month', 'pending', 'upcoming', 'all']

export default function AppointmentsEditor() {
  // Phase 3 plan gate: hide team-oriented UI (staff picker on the
  // appointment form) for Solo plans. usePlan() returns Solo defaults
  // until the snapshot loads, so the staff picker is hidden during
  // initial mount and reveals if the tenant is Studio/Salon.
  const plan = usePlan()
  // Wave D — a staff login sees ONLY their own bookings (enforced server-
  // side; the index returns just their rows). Owner-only bulk actions like
  // "New appointment" are hidden for them.
  const { isStaff } = useRole()

  // Allow deep-linking from the Bookings Overview cards (and anywhere
  // else that wants to land owners on a specific filter view).
  const searchParams = useSearchParams()
  // A16 — `?date=YYYY-MM-DD` (used by the dashboard "This week" strip
  // and the bookings-chart detail panel) lands the user on the day
  // view scrolled to that exact date. Validated as a real ISO date
  // before honoring it so a junk query param doesn't break the page.
  const dateParam = (() => {
    const raw = searchParams?.get('date')
    if (! raw || ! /^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
    const parsed = new Date(raw + 'T00:00:00')
    if (Number.isNaN(parsed.getTime())) return null
    return raw
  })()
  const initialFilter: Filter = (() => {
    // ?date= takes precedence: if the caller wants a specific day, the
    // day-view filter is the right home regardless of any other params.
    if (dateParam) return 'today'
    const q = searchParams?.get('filter')
    if (q && (VALID_FILTERS as string[]).includes(q)) return q as Filter
    // Phase 13 — when arriving filtered to a customer, default to 'all'
    // so their full history surfaces immediately (otherwise upcoming-
    // only would hide past visits, which is usually the point of
    // opening someone's history).
    if (searchParams?.get('customer_id')) return 'all'
    return 'upcoming'
  })()
  // A16 — initial day-offset when ?date= is present. Negative for past
  // days, positive for future days, 0 for today.
  const initialDayOffset = dateParam ? offsetFromDate(dateParam) : 0

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  // Phase 7 — staff roster + add-on catalog drive the new form widgets.
  // Both fetch defensively (.catch(() => [])) so tenants that haven't
  // migrated yet still get a working appointments page.
  const [staff, setStaff] = useState<ApiStaffMember[]>([])
  const [addons, setAddons] = useState<ServiceAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  // Day offset relative to today, used only when filter === 'today'.
  // Zero = today; negative = past days; positive = future days. The label
  // gets a friendly "Yesterday / Today / Tomorrow" prefix when applicable.
  // A16 — seeded from ?date= when present so the day view opens directly
  // on the requested date (dashboard "This week" strip + chart drill-in).
  const [dayOffset, setDayOffset] = useState(initialDayOffset)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const [refundTarget, setRefundTarget]         = useState<Appointment | null>(null)
  const [markPaidTarget, setMarkPaidTarget]     = useState<Appointment | null>(null)
  const [chargeBalanceTarget, setChargeBalanceTarget] = useState<Appointment | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)

  // Phase 13 — deep-link from Customers drawer:
  //   ?customer_id=N           → filter list to that customer's appointments
  //   ?new=1&customer_id=N     → also open the New Appointment dialog,
  //                              pre-filled with that customer's contact info
  // Pinned name surfaces in the filter banner so the owner sees who's
  // currently being filtered before they jump in.
  const customerIdParam = (() => {
    const raw = searchParams?.get('customer_id')
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) ? n : null
  })()
  const wantsNew = searchParams?.get('new') === '1'
  const [filterCustomerName, setFilterCustomerName] = useState<string | null>(null)
  const [filterCustomerId,   setFilterCustomerId]   = useState<number | null>(customerIdParam)

  useEffect(() => {
    // FEGATE-1 — /editor/services is owner-only (tenant_owner), so it
    // 403s for a staff login and rejects the whole Promise.all, flipping
    // the page to its error banner. Staff reach this page at
    // ?scope=mine and only need their schedule; the services list feeds
    // the owner-only "New appointment" form (already hidden for staff),
    // so an empty list is correct for them. isStaff comes from useRole(),
    // which the EditorGuard resolves (alongside `slug`) BEFORE it renders
    // this page, so `isStaff` is already the real value when this mount
    // effect runs — no role race despite the empty deps. Owners still
    // load services; the .catch keeps a transient services 500 from
    // sinking the rest of the load.
    Promise.all([
      getEditorAppointments({ limit: 200 }),
      isStaff ? Promise.resolve([] as Service[]) : getEditorServices().catch(() => [] as Service[]),
      getEditorPaymentSettings().catch(() => null),
      getEditorStaff({ active: true }).catch(() => [] as ApiStaffMember[]),
      getEditorServiceAddons().catch(() => [] as ServiceAddon[]),
    ])
      .then(([appts, svcs, ps, stf, ads]) => {
        setAppointments(appts)
        setServices(svcs.filter(s => s.is_active))
        setPaymentSettings(ps)
        setStaff(stf.filter(s => s.is_active))
        setAddons(ads.filter(a => a.is_active))
      })
      .catch(() => setError("Couldn't load your appointments. Refresh the page to try again."))
      .finally(() => setLoading(false))
    // Mount-only load. `isStaff` is already resolved by EditorGuard before
    // this page renders (see comment above), so it's stable on first run —
    // no re-fetch needed when it's read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 13 — when arriving via the Customers drawer, hydrate the
  // customer for the banner label + the optional create-pre-fill.
  // Runs once per customer_id; clearing the filter resets state.
  useEffect(() => {
    if (filterCustomerId == null) {
      setFilterCustomerName(null)
      return
    }
    let cancelled = false
    import('@/lib/api').then(({ getEditorCustomer }) => getEditorCustomer(filterCustomerId))
      .then(c => {
        if (cancelled) return
        setFilterCustomerName(c.name)
        if (wantsNew) {
          // Pre-fill the new-appointment form with the customer's contact
          // info, open it, and strip the ?new=1 so a refresh doesn't
          // re-pop the dialog on every render.
          setForm(f => ({
            ...f,
            customer_name:  c.name,
            customer_email: c.email ?? '',
            customer_phone: c.phone ?? '',
          }))
          setEditId(null)
          setFormError(null)
          setShowForm(true)
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.delete('new')
            window.history.replaceState({}, '', url.toString())
          }
        }
      })
      .catch(() => { /* leave label empty — filter still applies by id */ })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCustomerId])

  const today = todayStr()
  // The date currently displayed by the Today view. Defaults to actual today;
  // diverges as the owner steps prev/next through the day toolbar.
  const selectedDay = dateWithOffset(dayOffset)

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
    // Phase 13 — customer-scoped filter from the Customers drawer link.
    // Layered ON TOP of the existing filter chip so the owner can still
    // narrow to today/week/etc within a single customer's history.
    .filter(a => filterCustomerId == null || a.customer_id === filterCustomerId)
    .filter(a => {
      if (filter === 'today')    return a.appointment_date === selectedDay
      if (filter === 'week')     return weekDays.includes(a.appointment_date) && a.status !== 'cancelled'
      if (filter === 'month')    return a.appointment_date >= monthStart && a.appointment_date <= monthEnd && a.status !== 'cancelled'
      if (filter === 'pending')  return a.status === 'pending'
      if (filter === 'upcoming') return a.appointment_date >= today && a.status !== 'cancelled'
      return true
    })
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navPrev() {
    if (filter === 'today') setDayOffset(o => o - 1)
    if (filter === 'week')  setWeekOffset(o => o - 1)
    if (filter === 'month') setMonthOffset(o => o - 1)
  }
  function navNext() {
    if (filter === 'today') setDayOffset(o => o + 1)
    if (filter === 'week')  setWeekOffset(o => o + 1)
    if (filter === 'month') setMonthOffset(o => o + 1)
  }
  function navToday() {
    setDayOffset(0)
    setWeekOffset(0)
    setMonthOffset(0)
  }

  // Click a chip / day-cell in Week or Month → land on that exact day
  // in the Today view. Centralized so both child views share the
  // same handler; they only need the date string.
  function jumpToDay(date: string) {
    setDayOffset(offsetFromDate(date))
    setFilter('today')
  }

  const navLabel = filter === 'week'
    ? weekLabel(weekDays)
    : filter === 'month'
    ? monthLabel(monthOffset)
    : filter === 'today'
    ? dayNavLabel(selectedDay)
    : ''

  // ── Form helpers ──────────────────────────────────────────────────────────

  // "New appointment" click feedback — the form panel mounts below the
  // stats strip and callouts, off-screen on most viewports, so opening
  // it has to visibly move the page or the click reads as dead.
  // scroll-mt-20 on the panel keeps the sticky topbar from covering it.
  const formRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  function scrollFormIntoView(focusFirstField = true) {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Skip focus on touch devices so the keyboard doesn't pop over
      // the freshly scrolled-to panel.
      if (focusFirstField && ! window.matchMedia('(hover: none)').matches) {
        firstFieldRef.current?.focus({ preventScroll: true })
      }
    })
  }

  useEffect(() => {
    if (showForm) scrollFormIntoView()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm])

  function openCreate() {
    if (showForm && editId === null) {
      // Second click while the create form is already open means the
      // owner never saw the panel. Point them at it instead of wiping
      // anything they may have typed.
      toast.info('The new appointment form is open below.')
      scrollFormIntoView()
      return
    }
    const wasOpen = showForm
    setEditId(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(true)
    // Switching from edit to create keeps showForm true, so the
    // showForm effect won't re-fire. Scroll explicitly.
    if (wasOpen) scrollFormIntoView()
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
      setFormError('Add the client name, service, date, and time to continue.')
      scrollFormIntoView(false)
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
          // Phase 7 — empty string means "any staff" (server stores null).
          staff_id:         form.staff_id ? Number(form.staff_id) : null,
          // Always send addon_ids on edit so omission == "remove all".
          // (The backend treats key-presence as the replace signal.)
          addon_ids:        form.addon_ids,
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
          staff_id:         form.staff_id ? Number(form.staff_id) : null,
          addon_ids:        form.addon_ids,
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
      setFormError("Couldn't save this appointment. Try again, or check your connection.")
      // The error banner renders at the top of the form, which can sit
      // above the fold after scrolling down to the submit button. Bring
      // it back into view so the failure is never silent; skip the
      // focus so we don't yank the owner's cursor.
      scrollFormIntoView(false)
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
    const ok = await confirm({ title: 'Cancel this appointment?', message: "The customer will be emailed a cancellation notice.", confirmLabel: 'Cancel appointment', tone: 'danger' })
    if (! ok) return
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
    const ok = await confirm({ title: 'Send a tip request?', message: `We'll email ${who} a tip link.`, confirmLabel: 'Send request' })
    if (! ok) return
    setActionLoading(id)
    try {
      const res = await requestEditorAppointmentTip(id)
      toast.success(res.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the tip request. Try again in a moment.")
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
      toast.error(`Set a ${label} amount under Settings > Payments first.`)
      return
    }
    const sym = (paymentSettings?.currency ?? 'USD') === 'USD' ? '$' : ''
    const ok = await confirm({ title: `Charge ${label}?`, message: `We'll charge ${sym}${fee.toFixed(2)} to the customer's saved card.`, confirmLabel: 'Charge', tone: 'danger' })
    if (! ok) return
    setActionLoading(id)
    try {
      const res = await chargeEditorAppointmentLateFee(id, { type })
      setAppointments(prev => prev.map(a => a.id === id ? res.appointment : a))
      toast.success('Fee charged')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't charge the fee. Try again in a moment.")
    } finally {
      setActionLoading(null)
    }
  }

  const selectedService = services.find(s => s.id === Number(form.service_id))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-cream">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Inline action bar — page title now lives in EditorShell.
            Wave D: "New appointment" is an owner-only action; staff manage
            only their existing bookings, so it's hidden for them. */}
        {! isStaff && (
          <div className="flex items-center justify-end">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
            >
              <Plus size={11} /> New appointment
            </button>
          </div>
        )}

        {/* Phase 13 — when arriving via a Customer drawer link, surface
            the active customer filter so the owner knows the list is
            scoped, with a one-click clear. The list-filter chips still
            work *within* this scope. */}
        {filterCustomerId != null && (
          <div className="flex items-center justify-between gap-3 bg-lavender px-4 py-3 border border-hairline-soft">
            <p className="text-xs font-semibold text-near-black truncate">
              Showing appointments for{' '}
              <span className="font-bold">
                {filterCustomerName ?? `customer #${filterCustomerId}`}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterCustomerId(null)
                setFilterCustomerName(null)
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href)
                  url.searchParams.delete('customer_id')
                  window.history.replaceState({}, '', url.toString())
                }
              }}
              className="text-eyebrow font-bold text-near-black underline underline-offset-2 flex-shrink-0 whitespace-nowrap"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Stats strip — each cell switches the filter below to that view.
            Today resets the day offset so we always land on actual today. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-hairline-soft divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)] overflow-hidden">
          {([
            { label: 'Today',     value: stats.today,     icon: Calendar,    filter: 'today'    as Filter },
            { label: 'Pending',   value: stats.pending,   icon: Clock,       filter: 'pending'  as Filter },
            { label: 'This Week', value: stats.thisWeek,  icon: Calendar,    filter: 'week'     as Filter },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, filter: 'all'      as Filter },
          ] as const).map(({ label, value, icon: Icon, filter: targetFilter }) => {
            const isActive = filter === targetFilter
            return (
              <button
                type="button"
                key={label}
                onClick={() => {
                  if (targetFilter === 'today') setDayOffset(0)
                  if (targetFilter === 'week')  setWeekOffset(0)
                  setFilter(targetFilter)
                }}
                className={cn(
                  'bg-white p-3 min-w-0 overflow-hidden text-left transition-colors group',
                  isActive ? 'bg-cream' : 'hover:bg-cream',
                )}
              >
                <div className="flex items-center gap-1 mb-1.5 min-w-0">
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

        {/* Pending callout */}
        {!loading && stats.pending > 0 && filter !== 'pending' && (
          <div className="flex items-center justify-between gap-3 bg-blush px-4 py-3 border border-hairline-soft">
            <p className="text-xs font-semibold text-near-black">
              {stats.pending} booking request{stats.pending !== 1 ? 's' : ''} waiting on your response.
            </p>
            <button
              onClick={() => setFilter('pending')}
              className="text-eyebrow font-bold text-near-black underline underline-offset-2 flex-shrink-0 whitespace-nowrap"
            >
              Review
            </button>
          </div>
        )}

        {/* Create / edit form */}
        {showForm && (
          <div ref={formRef} className="scroll-mt-20 bg-white border border-hairline">
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
              <h2 className="text-sm font-bold text-near-black tracking-tight">
                {editId !== null ? 'Edit appointment' : 'New appointment'}
              </h2>
              <button onClick={closeForm} className="text-muted-text hover:text-near-black transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <p className="text-xs text-danger bg-danger-bg border border-danger px-3 py-2">{formError}</p>
              )}
              <div className="space-y-3">
                <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Client</p>
                <input
                  ref={firstFieldRef}
                  type="text" placeholder="Full name *" required
                  value={form.customer_name} onChange={e => setField('customer_name', e.target.value)}
                  className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email" placeholder="Email"
                    value={form.customer_email} onChange={e => setField('customer_email', e.target.value)}
                    className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                  <input
                    type="tel" placeholder="Phone"
                    value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)}
                    className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Service</p>
                <select
                  required
                  value={form.service_id}
                  onChange={e => {
                    const newServiceId = e.target.value
                    // When the service changes, drop any add-on selections
                    // that aren't linked to the new service and any staff
                    // pick that isn't on the new service's assigned list.
                    setForm(f => {
                      const next = { ...f, service_id: newServiceId }
                      const svc = services.find(s => s.id === Number(newServiceId))
                      if (svc) {
                        const allowedAddons = new Set((svc.linked_addons ?? []).map(l => l.addon_id))
                        next.addon_ids = f.addon_ids.filter(id => allowedAddons.has(id))
                        // Auto-include required add-ons so the totals
                        // shown to the owner match what the backend will
                        // persist (resolveAddons unions them anyway).
                        for (const link of svc.linked_addons ?? []) {
                          if (link.is_required && !next.addon_ids.includes(link.addon_id)) {
                            next.addon_ids = [...next.addon_ids, link.addon_id]
                          }
                        }
                        const assigned = svc.assigned_staff_ids ?? []
                        if (assigned.length > 0 && f.staff_id && !assigned.includes(Number(f.staff_id))) {
                          next.staff_id = ''
                        }
                      }
                      return next
                    })
                  }}
                  className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black appearance-none"
                >
                  <option value="">Select a service *</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.duration_minutes} min · ${s.price.toFixed(0)}
                    </option>
                  ))}
                </select>
                {selectedService && (() => {
                  const addonLinks   = selectedService.linked_addons ?? []
                  const selectedAddons = addons.filter(a => form.addon_ids.includes(a.id))
                  const addonPrice    = selectedAddons.reduce((s, a) => s + a.extra_price, 0)
                  const addonMinutes  = selectedAddons.reduce((s, a) => s + a.extra_duration_minutes, 0)
                  const totalMinutes  = selectedService.duration_minutes + addonMinutes
                  const totalPrice    = selectedService.price + addonPrice
                  return (
                    <p className="text-xs text-muted-text">
                      Total: {totalMinutes} min · ${totalPrice.toFixed(2)}
                      {addonLinks.length > 0 && addonPrice > 0 && (
                        <span className="ml-1 opacity-75">
                          (base ${selectedService.price.toFixed(2)} + add-ons ${addonPrice.toFixed(2)})
                        </span>
                      )}
                    </p>
                  )
                })()}
              </div>

              {/* Phase 7 — Add-ons. Only shown when the chosen service has
                  linked add-ons. Required links are forced-checked and
                  disabled so owners can't accidentally drop them. */}
              {selectedService && (selectedService.linked_addons ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Add-ons</p>
                  <div className="border border-hairline bg-white divide-y divide-[rgba(18,18,18,0.06)]">
                    {(selectedService.linked_addons ?? []).map(link => {
                      const addon = addons.find(a => a.id === link.addon_id)
                      if (!addon) return null
                      const checked = form.addon_ids.includes(addon.id)
                      return (
                        <label
                          key={addon.id}
                          className={cn(
                            'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-cream transition-colors',
                            link.is_required && 'opacity-90',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={link.is_required}
                            onChange={e => {
                              setForm(f => ({
                                ...f,
                                addon_ids: e.target.checked
                                  ? [...f.addon_ids, addon.id]
                                  : f.addon_ids.filter(id => id !== addon.id),
                              }))
                            }}
                            className="mt-0.5 accent-near-black"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-near-black truncate">{addon.name}</p>
                              {link.is_required && (
                                <span className="text-eyebrow font-bold tracking-[0.08em] uppercase bg-blush text-near-black px-1.5 py-0.5">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-muted-text mt-0.5">
                              +${addon.extra_price.toFixed(2)}
                              {addon.extra_duration_minutes > 0 && ` · +${addon.extra_duration_minutes} min`}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Phase 7 — Staff picker. When the service has assigned_staff_ids,
                  filter the dropdown to those only. Otherwise show every active
                  staff member. Empty string = "any staff" (server stores null).
                  Hidden entirely on Solo plans (one staff = nothing to pick). */}
              {selectedService && ! plan.isSolo() && (() => {
                const assigned = selectedService.assigned_staff_ids ?? []
                const options  = assigned.length > 0
                  ? staff.filter(s => assigned.includes(s.id))
                  : staff
                if (options.length === 0) return null
                return (
                  <div className="space-y-2">
                    <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Staff</p>
                    <select
                      value={form.staff_id}
                      onChange={e => setField('staff_id', e.target.value)}
                      className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black appearance-none"
                    >
                      <option value="">Any staff</option>
                      {options.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.role ? ` · ${s.role}` : ''}
                        </option>
                      ))}
                    </select>
                    {assigned.length > 0 && (
                      <p className="text-eyebrow text-muted-text">
                        Filtered to staff trained on this service.
                      </p>
                    )}
                  </div>
                )
              })()}
              <div className="space-y-3">
                <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Date &amp; time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-eyebrow text-muted-text mb-1">Date *</label>
                    <input
                      type="date" required
                      value={form.appointment_date} onChange={e => setField('appointment_date', e.target.value)}
                      className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                  <div>
                    <label className="block text-eyebrow text-muted-text mb-1">Start time *</label>
                    <input
                      type="time" required
                      value={form.start_time} onChange={e => setField('start_time', e.target.value)}
                      className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                    />
                  </div>
                </div>
              </div>
              {editId !== null && (
                <div className="space-y-2">
                  <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Status</p>
                  <select
                    value={form.status} onChange={e => setField('status', e.target.value as AppointmentStatus)}
                    className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black"
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
                <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text">Notes</p>
                <textarea
                  placeholder="e.g. Bringing reference photos, wants a buzz on the sides"
                  value={form.notes} onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-hairline-strong bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-near-black text-white py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editId !== null ? 'Save changes' : 'Create appointment'}
                </button>
                <button
                  type="button" onClick={closeForm}
                  className="border border-hairline-strong bg-white px-4 py-2.5 text-xs font-semibold text-near-black hover:bg-cream transition-colors"
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
            { key: 'week',     label: 'This week' },
            { key: 'month',    label: 'This month' },
            { key: 'pending',  label: 'Pending' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all',      label: 'All' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 text-eyebrow font-semibold border transition-colors',
                filter === key
                  ? 'bg-near-black text-white border-near-black'
                  : 'bg-white text-muted-text border-hairline hover:text-near-black'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Today / Week / Month navigation. The Today view adds a date picker
            so owners can jump to an arbitrary date without scrolling chips. */}
        {(filter === 'today' || filter === 'week' || filter === 'month') && (
          <div className="flex items-center gap-2">
            <button
              onClick={navPrev}
              className="border border-hairline bg-white p-2 hover:bg-cream transition-colors flex-shrink-0"
              aria-label="Previous"
            >
              <ChevronLeft size={14} />
            </button>
            <p className="flex-1 text-center text-sm font-semibold text-near-black truncate">
              {navLabel}
            </p>
            {filter === 'today' && (
              <input
                type="date"
                value={selectedDay}
                onChange={e => {
                  if (!e.target.value) return
                  setDayOffset(offsetFromDate(e.target.value))
                }}
                className="border border-hairline bg-white px-2 py-2 text-2xs font-semibold text-near-black focus:outline-none focus:border-near-black flex-shrink-0"
                aria-label="Pick a date"
              />
            )}
            <button
              onClick={navToday}
              disabled={
                (filter === 'today' && dayOffset === 0) ||
                (filter === 'week'  && weekOffset === 0) ||
                (filter === 'month' && monthOffset === 0)
              }
              className="border border-hairline bg-white px-3 py-2 text-eyebrow font-bold text-near-black hover:bg-cream transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Today
            </button>
            <button
              onClick={navNext}
              className="border border-hairline bg-white p-2 hover:bg-cream transition-colors flex-shrink-0"
              aria-label="Next"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-hairline-soft px-5 py-12 text-center text-sm text-muted-text">
            Loading appointments…
          </div>
        ) : error ? (
          <div className="bg-white border border-hairline-soft px-5 py-8 text-center text-sm text-danger">
            {error}
          </div>
        ) : filter === 'week' ? (
          <WeekGridView
            weekDays={weekDays}
            appointments={filtered}
            today={today}
            onJumpToDay={jumpToDay}
          />
        ) : filter === 'month' ? (
          <MonthCalendarView
            monthGrid={monthGrid}
            appointments={filtered}
            today={today}
            onJumpToDay={jumpToDay}
          />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-hairline-soft px-5 py-12 text-center">
            <Calendar size={24} className="text-muted-text mx-auto mb-3" />
            <p className="text-sm font-semibold text-near-black mb-1">No appointments</p>
            <p className="text-xs text-muted-text">
              {filter === 'upcoming'
                ? isStaff
                  ? 'No upcoming appointments on your schedule.'
                  : 'No upcoming appointments. Create one to get started.'
                : filter === 'today'
                ? `Nothing scheduled for ${dayNavLabel(selectedDay).split(' · ').pop()}.`
                : `No ${filter} appointments yet.`}
            </p>
            {filter === 'upcoming' && ! isStaff && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2 text-xs font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
              >
                <Plus size={11} /> New appointment
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
  onJumpToDay,
}: {
  weekDays: string[]
  appointments: Appointment[]
  today: string
  /** Called with a YYYY-MM-DD when the owner clicks an appointment chip
   *  or the day header — switches the parent into Today view focused
   *  on that date. */
  onJumpToDay: (date: string) => void
}) {
  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden sm:grid grid-cols-7 border border-hairline-soft overflow-hidden">
        {weekDays.map((date, i) => {
          const dayAppts = appointments
            .filter(a => a.appointment_date === date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn(
                'border-r last:border-r-0 border-hairline-soft flex flex-col',
                isToday ? 'bg-cream' : 'bg-white',
              )}
            >
              {/* Day header — clickable so empty days are reachable too.
                  Whole column is a button stack so clicking the day number,
                  blank space, or any chip jumps to that day's Today view. */}
              <button
                type="button"
                onClick={() => onJumpToDay(date)}
                className={cn(
                  'py-2.5 w-full text-center border-b border-hairline-soft flex-shrink-0 transition-colors cursor-pointer',
                  isToday ? 'bg-near-black hover:opacity-90' : 'hover:bg-cream',
                )}
                aria-label={`Open ${date} in Today view`}
              >
                <p className={cn('text-eyebrow font-bold tracking-[0.10em] uppercase', isToday ? 'text-white/60' : 'text-muted-text')}>
                  {DAY_ABBR[i]}
                </p>
                <p className={cn('text-sm font-bold leading-none mt-0.5', isToday ? 'text-white' : 'text-near-black')}>
                  {new Date(date + 'T00:00:00').getDate()}
                </p>
              </button>
              {/* Appointment chips */}
              <div className="p-1 space-y-0.5 flex-1 min-h-[120px]">
                {dayAppts.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onJumpToDay(date)}
                    className="text-eyebrow text-muted-text text-center py-4 w-full h-full hover:text-near-black transition-colors cursor-pointer"
                    aria-label={`Open ${date} in Today view`}
                  >
                    Free
                  </button>
                ) : dayAppts.map(a => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => onJumpToDay(date)}
                    className={cn(
                      'w-full text-left px-1 py-1 text-eyebrow leading-tight border overflow-hidden cursor-pointer hover:brightness-105 transition',
                      apptStatusChipCls(a.status),
                    )}
                    title={`${fmt12(a.start_time)} · ${a.customer_name} · ${a.service_name}`}
                  >
                    <div className="font-bold truncate">
                      {a.start_time.slice(0, 5)} {a.customer_name.split(' ')[0]}
                    </div>
                    <div className="truncate opacity-75">{a.service_name}</div>
                  </button>
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
              className={cn('border overflow-hidden', isToday ? 'border-near-black' : 'border-hairline-soft')}
            >
              <button
                type="button"
                onClick={() => onJumpToDay(date)}
                className={cn(
                  'w-full px-4 py-3 flex items-center justify-between transition-colors',
                  isToday ? 'bg-near-black hover:opacity-90' : 'bg-white border-b border-hairline-soft hover:bg-cream',
                )}
                aria-label={`Open ${date} in Today view`}
              >
                <p className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-near-black')}>
                  {DAY_ABBR[i]} · {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {isToday && <span className="text-eyebrow text-white/60 font-bold uppercase tracking-wider">Today</span>}
                {!isToday && (
                  <span className="text-eyebrow text-muted-text">
                    {dayAppts.length === 0 ? 'Free' : `${dayAppts.length} booking${dayAppts.length > 1 ? 's' : ''}`}
                  </span>
                )}
              </button>
              {dayAppts.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onJumpToDay(date)}
                  className="w-full bg-white px-4 py-3 text-left hover:bg-cream transition-colors"
                >
                  <p className="text-2xs text-muted-text">No appointments</p>
                </button>
              ) : (
                <div className="bg-white divide-y divide-[rgba(18,18,18,0.06)]">
                  {dayAppts.map(a => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => onJumpToDay(date)}
                      className="w-full px-4 py-3 flex items-center gap-2 min-w-0 text-left hover:bg-cream transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-2xs font-bold text-near-black whitespace-nowrap">{fmt12(a.start_time)}</span>
                          <StatusBadge domain="appointment" status={a.status} />
                          <PaymentPill appt={a} />
                        </div>
                        <p className="text-xs text-muted-text truncate mt-0.5">
                          {a.customer_name} · {a.service_name}
                        </p>
                      </div>
                    </button>
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
  onJumpToDay,
}: {
  monthGrid: CalendarCell[][]
  appointments: Appointment[]
  today: string
  /** Same contract as WeekGridView — switches the parent into Today
   *  view on whichever date the owner clicked. */
  onJumpToDay: (date: string) => void
}) {
  return (
    <>
      {/* Desktop + tablet: calendar grid */}
      <div className="hidden sm:block bg-white border border-hairline-soft overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-hairline-soft">
          {DAY_ABBR.map(d => (
            <div
              key={d}
              className="text-center py-2 text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text border-r last:border-r-0 border-hairline-soft"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Calendar rows */}
        {monthGrid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-hairline-soft last:border-b-0">
            {week.map((cell, di) => {
              if (!cell) {
                return (
                  <div
                    key={di}
                    className="border-r last:border-r-0 border-hairline-soft min-h-[80px] bg-[rgba(18,18,18,0.015)]"
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
                // Whole cell is a button so clicking anywhere — number,
                // chip, blank space, or "+N more" — drills into that
                // day's Today view. Inner chips stay as plain divs since
                // they're inside the same button.
                <button
                  type="button"
                  key={date}
                  onClick={() => onJumpToDay(date)}
                  className={cn(
                    'border-r last:border-r-0 border-hairline-soft min-h-[80px] p-1.5 flex flex-col gap-0.5 text-left transition-colors',
                    isToday ? 'bg-near-black hover:opacity-90' : 'bg-white hover:bg-cream',
                  )}
                  aria-label={`Open ${date} in Today view`}
                >
                  <span className={cn('text-2xs font-bold leading-none mb-0.5', isToday ? 'text-white' : 'text-near-black')}>
                    {new Date(date + 'T00:00:00').getDate()}
                  </span>
                  {shown.map(a => (
                    <div
                      key={a.id}
                      className={cn('px-1 py-0.5 text-eyebrow leading-tight truncate border', apptStatusChipCls(a.status))}
                      title={`${fmt12(a.start_time)} · ${a.customer_name} · ${a.service_name}`}
                    >
                      {a.start_time.slice(0, 5)} {a.customer_name.split(' ')[0]}
                    </div>
                  ))}
                  {extra > 0 && (
                    <span className={cn('text-eyebrow font-bold px-0.5', isToday ? 'text-white/60' : 'text-muted-text')}>
                      +{extra} more
                    </span>
                  )}
                </button>
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
              <div className="bg-white border border-hairline-soft px-4 py-10 text-center">
                <p className="text-sm font-semibold text-near-black mb-1">No appointments this month</p>
                <p className="text-xs text-muted-text">Step forward or back to browse other months.</p>
              </div>
            )
          }

          return daysWithAppts.map(({ date, appts }) => {
            const isToday = date === today
            return (
              <div
                key={date}
                className={cn('border overflow-hidden', isToday ? 'border-near-black' : 'border-hairline-soft')}
              >
                <button
                  type="button"
                  onClick={() => onJumpToDay(date)}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-center justify-between transition-colors',
                    isToday ? 'bg-near-black hover:opacity-90' : 'bg-white border-b border-hairline-soft hover:bg-cream',
                  )}
                  aria-label={`Open ${date} in Today view`}
                >
                  <p className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-near-black')}>
                    {fmtDate(date)}
                  </p>
                  {isToday && <span className="text-eyebrow text-white/60 font-bold uppercase tracking-wider">Today</span>}
                </button>
                <div className="bg-white divide-y divide-[rgba(18,18,18,0.06)]">
                  {appts.map(a => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => onJumpToDay(date)}
                      className="w-full px-4 py-3 flex items-center gap-2 min-w-0 text-left hover:bg-cream transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-2xs font-bold text-near-black whitespace-nowrap">{fmt12(a.start_time)}</span>
                          <StatusBadge domain="appointment" status={a.status} />
                          <PaymentPill appt={a} />
                        </div>
                        <p className="text-xs text-muted-text truncate mt-0.5">
                          {a.customer_name} · {a.service_name}
                        </p>
                      </div>
                    </button>
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

  // Card-level click opens the edit dialog. Action buttons inside still
  // take precedence — we bail out of the handler if the click landed on
  // a button/link/input so the inner controls keep their own behaviour.
  function handleCardClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea, label')) return
    onEdit()
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'bg-white border transition-colors cursor-pointer hover:border-near-black',
        isToday ? 'border-near-black' : 'border-hairline-soft',
      )}
    >
      {isToday && (
        <div className="bg-near-black text-white text-eyebrow font-bold tracking-[0.12em] uppercase px-4 py-1">
          Today
        </div>
      )}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-near-black truncate">{appt.customer_name}</p>
              <StatusBadge domain="appointment" status={appt.status} />
              <PaymentPill appt={appt} />
            </div>
            {(appt.customer_email || appt.customer_phone) && (
              <p className="text-2xs text-muted-text mt-0.5 truncate">
                {appt.customer_email || appt.customer_phone}
              </p>
            )}
            <PaymentSummary appt={appt} />
          </div>
          <button
            onClick={onEdit}
            className="flex-shrink-0 border border-hairline px-2.5 py-1 text-eyebrow font-semibold text-near-black hover:bg-cream transition-colors"
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
                <p className="text-2xs text-muted-text">
                  ${appt.service_price.toFixed(0)}
                  {appt.service_duration_minutes ? ` · ${appt.service_duration_minutes} min` : ''}
                </p>
              )}
              {/* Phase 8 — quick at-a-glance add-on list so techs know
                  what's attached before opening the appointment. */}
              {appt.addons && appt.addons.length > 0 && (
                <p
                  className="text-2xs text-near-black mt-0.5 truncate"
                  title={appt.addons.map(a => a.name).join(' · ')}
                >
                  <span className="font-semibold uppercase tracking-[0.06em] text-eyebrow text-muted-text mr-1">
                    Add-ons:
                  </span>
                  {appt.addons.map(a => a.name).join(' · ')}
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
                <p className="text-2xs text-muted-text">{fmt12(appt.start_time)} – {fmt12(appt.end_time)}</p>
              </div>
            </div>
          </div>
        </div>
        {appt.notes && (
          <p className="text-2xs text-muted-text border-l-2 border-hairline pl-2.5 mb-3 italic">
            {appt.notes}
          </p>
        )}
        {appt.question_answers && appt.question_answers.length > 0 && (
          <div className="mb-3 bg-cream/60 border border-hairline-soft p-2.5 space-y-1.5">
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Form answers</p>
            {appt.question_answers.map((qa, idx) => (
              <div key={idx} className="text-2xs text-near-black leading-snug">
                <span className="font-semibold">{qa.label_snapshot}:</span>{' '}
                {(() => {
                  // Phase S5++ — defense in depth. The server-side sanitizer
                  // in PublicBookingController::sanitizeImageUrl already
                  // drops non-R2 URLs at write time. safeHref here protects
                  // any rows that pre-date that fix (or any future caller
                  // that bypasses validation) from rendering javascript:/
                  // data: schemes as a clickable link in the owner UI.
                  const href = qa.type_snapshot === 'image' ? safeHref(qa.image_url) : undefined
                  return href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-near-black hover:opacity-80">
                      View image
                    </a>
                  ) : qa.type_snapshot === 'image' ? (
                    <span className="text-muted-text">None</span>
                  ) : qa.type_snapshot === 'checkbox' ? (
                    <span>{qa.value === true ? 'Yes' : 'No'}</span>
                  ) : (
                    <span className="text-muted-text">{typeof qa.value === 'string' && qa.value.length > 0 ? qa.value : 'None'}</span>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
        {activeDispute && (
          <div className="mb-3 px-3 py-2 bg-danger-bg border border-danger flex items-start gap-2">
            <AlertTriangle size={13} className="text-danger flex-shrink-0 mt-0.5" />
            <div className="text-2xs text-danger leading-snug">
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
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-hairline-soft">
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
        'flex items-center gap-1 px-2.5 py-1.5 text-eyebrow font-semibold border transition-colors disabled:opacity-50',
        primary ? 'bg-near-black text-white border-near-black hover:opacity-90' :
        danger  ? 'bg-white text-muted-text border-hairline hover:text-near-black' :
                  'bg-white text-near-black border-hairline hover:bg-cream',
      )}
    >
      {icon} {label}
    </button>
  )
}
