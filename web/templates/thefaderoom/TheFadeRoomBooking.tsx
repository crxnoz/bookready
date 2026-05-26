'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight,
  Clock, Heart, CalendarCheck,
} from 'lucide-react'
import { getPublicAvailability, createPublicAppointment } from '@/lib/api'
import type {
  AvailableSlot, PaymentChoice, PublicBookingPayload, Service,
  AvailabilityData, PublicPaymentSettings,
  ServiceAddon, PublicStaffMember, ServiceCategory,
} from '@/lib/types'

// Sentinel used as the "category id" for the auto-generated bucket that
// collects services without a category assignment. Real category ids are
// always positive integers, so this string can't collide.
const UNCATEGORIZED = '__other__'
type CategoryKey = number | typeof UNCATEGORIZED

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDateDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; slots: AvailableSlot[]; message: string | null }
  | { status: 'error'; message: string }

const STEPS: [Step, string][] = [[1, 'Service'], [2, 'Date & Time'], [3, 'Details'], [4, 'Confirm']]

// ── Component ─────────────────────────────────────────────────────────────────

export default function TheFadeRoomBooking({
  slug,
  services,
  displayName,
  availability,
  paymentSettings,
  requirePolicyAgreement = false,
  serviceAddons = [],
  staffMembers = [],
  serviceCategories = [],
}: {
  slug: string
  services: Service[]
  displayName: string
  availability: AvailabilityData | null
  paymentSettings: PublicPaymentSettings | null
  requirePolicyAgreement?: boolean
  /** Phase 7: tenant's full add-on catalog. Per-service links live on
   *  `service.linked_addons`; we look up the rich row here. */
  serviceAddons?: ServiceAddon[]
  /** Phase 7: tenant's active staff. Filtered to assigned ones per service. */
  staffMembers?: PublicStaffMember[]
  /** Phase 8: tenant's service categories. When 2+ categories are in
   *  active use, Step 1 shows a category tile picker first; otherwise
   *  it falls through to the flat service grid so single-category shops
   *  don't get a dead-end click. */
  serviceCategories?: ServiceCategory[]
}) {
  const [step,         setStep]         = useState<Step>(1)
  const [serviceId,    setServiceId]    = useState<number | null>(null)
  const [date,         setDate]         = useState('')
  const [slotState,    setSlotState]    = useState<SlotState>({ status: 'idle' })
  const [selectedSlot, setSelectedSlot] = useState('')
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('deposit')
  const [policyAgreed, setPolicyAgreed] = useState(false)
  // Phase 7 — staff + add-on selection. Empty staffId = any staff (server
  // stores null). addonIds get whitelisted server-side against the service's
  // links; required ones are auto-included even if missing here.
  const [staffId,  setStaffId]  = useState<number | null>(null)
  const [addonIds, setAddonIds] = useState<number[]>([])
  // Phase 8 — pre-Service category pick. null means "not picked yet" (which
  // shows the category tiles); UNCATEGORIZED is the "Other" bucket for
  // services that have no category_id assigned.
  const [categoryKey, setCategoryKey] = useState<CategoryKey | null>(null)
  const fetchRef = useRef(0)

  const selectedService = services.find(s => s.id === serviceId) ?? null

  // ── Category derivations ────────────────────────────────────────────────
  // We only show the picker for categories that have at least one service
  // assigned. The public payload already filters out inactive ones server-
  // side (and drops `is_active` from the shape), so any category that
  // reaches us here is fair game — we just need it to actually contain
  // services so we don't render dead-end tiles.
  const activeCategories = serviceCategories.filter(c => c.is_active !== false)
  const hasUncategorized = services.some(
    s => s.category_id == null || ! activeCategories.some(c => c.id === s.category_id),
  )
  const categoriesInUse = activeCategories.filter(
    c => services.some(s => s.category_id === c.id),
  )
  const categoryTiles: { key: CategoryKey; name: string; description: string | null; image_url: string | null; count: number }[] = [
    ...categoriesInUse.map(c => ({
      key:         c.id as CategoryKey,
      name:        c.name,
      description: c.description,
      image_url:   c.image_url,
      count:       services.filter(s => s.category_id === c.id).length,
    })),
    ...(hasUncategorized ? [{
      key:         UNCATEGORIZED as CategoryKey,
      name:        'Other services',
      description: null,
      image_url:   null,
      count:       services.filter(
        s => s.category_id == null || ! activeCategories.some(c => c.id === s.category_id),
      ).length,
    }] : []),
  ]
  // 0 or 1 effective category → skip the picker entirely.
  const showCategoryPicker = categoryTiles.length >= 2

  // Services visible in the grid. When the picker is in play and a
  // category is picked, filter to that bucket; otherwise show all.
  const visibleServices: Service[] = (() => {
    if (! showCategoryPicker)  return services
    if (categoryKey === null)  return []  // picker is open, no services yet
    if (categoryKey === UNCATEGORIZED) {
      return services.filter(
        s => s.category_id == null || ! activeCategories.some(c => c.id === s.category_id),
      )
    }
    return services.filter(s => s.category_id === categoryKey)
  })()

  const activeCategoryName = (() => {
    if (! showCategoryPicker || categoryKey === null) return null
    if (categoryKey === UNCATEGORIZED) return 'Other services'
    return categoriesInUse.find(c => c.id === categoryKey)?.name ?? null
  })()

  // Phase 7 — picked add-on rows + running totals. Totals show on the
  // service card, Step 2 staff label, and the Confirm step summary.
  const pickedAddons = (() => {
    if (!selectedService) return []
    const links = selectedService.linked_addons ?? []
    const allowed = new Set(links.map(l => l.addon_id))
    return serviceAddons.filter(a => allowed.has(a.id) && addonIds.includes(a.id))
  })()
  const addonExtraPrice   = pickedAddons.reduce((sum, a) => sum + a.extra_price, 0)
  const addonExtraMinutes = pickedAddons.reduce((sum, a) => sum + a.extra_duration_minutes, 0)
  const totalPrice = (selectedService?.price ?? 0) + addonExtraPrice
  const totalMinutes = (selectedService?.duration_minutes ?? 0) + addonExtraMinutes

  // Staff options filtered to the assigned list (empty assignment = anyone).
  const availableStaff: PublicStaffMember[] = (() => {
    if (!selectedService) return []
    const assigned = selectedService.assigned_staff_ids ?? []
    if (assigned.length === 0) return staffMembers
    return staffMembers.filter(s => assigned.includes(s.id))
  })()
  const showStaffPicker = availableStaff.length >= 2
  // When only one option exists, lock to it implicitly without an extra UI step.
  const effectiveStaffId: number | null = showStaffPicker
    ? staffId
    : (availableStaff.length === 1 ? availableStaff[0].id : null)
  const effectiveStaffName: string | null = effectiveStaffId != null
    ? (availableStaff.find(s => s.id === effectiveStaffId)?.name ?? null)
    : null

  // ── Calendar state ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Availability helpers — day_of_week: 0=Sunday matches JS Date.getDay()
  const openByDow: Record<number, boolean> = (() => {
    const map: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    if (availability?.hours && availability.hours.length > 0) {
      // Default to false when we have hours data, then mark open days
      for (let i = 0; i < 7; i++) map[i] = false
      for (const h of availability.hours) {
        if (h.is_open) map[h.day_of_week] = true
      }
    }
    return map
  })()

  const maxDaysAhead = availability?.settings?.max_days_ahead ?? null
  const maxDate = maxDaysAhead != null
    ? (() => { const d = new Date(today); d.setDate(d.getDate() + maxDaysAhead); return d })()
    : null

  function isDateBlocked(d: Date): boolean {
    if (d < today) return true
    if (!openByDow[d.getDay()]) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  // Same stale-fetch protection pattern as before. Phase 7 adds staff
  // filtering: a different staff means a different conflict + blocked-date
  // set, so the slots list refreshes when the picker changes.
  useEffect(() => {
    if (!serviceId || !date) {
      setSlotState({ status: 'idle' })
      setSelectedSlot('')
      return
    }
    const id = ++fetchRef.current
    setSlotState({ status: 'loading' })
    setSelectedSlot('')

    getPublicAvailability(slug, serviceId, date, effectiveStaffId)
      .then(res => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'loaded', slots: res.slots, message: res.message })
      })
      .catch(err => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load times.' })
      })
  }, [serviceId, date, slug, effectiveStaffId])

  // Reset add-on + staff picks whenever the chosen service changes — the
  // available set depends on the service's links/assignment list and we
  // don't want stale selections to leak across services. Required add-ons
  // get auto-included so the totals shown match what the server will save.
  useEffect(() => {
    if (!selectedService) {
      setAddonIds([])
      setStaffId(null)
      return
    }
    const links = selectedService.linked_addons ?? []
    const allowed = new Set(links.map(l => l.addon_id))
    setAddonIds(prev => {
      const kept = prev.filter(id => allowed.has(id))
      for (const link of links) {
        if (link.is_required && !kept.includes(link.addon_id)) kept.push(link.addon_id)
      }
      return kept
    })
    const assigned = selectedService.assigned_staff_ids ?? []
    if (assigned.length > 0) {
      setStaffId(curr => (curr != null && assigned.includes(curr) ? curr : null))
    } else {
      setStaffId(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  // Compute payment previews. Authoritative calc still runs on the server —
  // these are friendly heads-up amounts for the Confirm step.
  const depositPreview: number | null = (() => {
    if (!paymentSettings) return null
    if (!paymentSettings.payments_enabled) return null
    if (!paymentSettings.deposits_enabled) return null
    const amount = paymentSettings.deposit_amount
    if (amount == null || amount <= 0) return null
    if (paymentSettings.deposit_type === 'flat') {
      return Math.round(amount * 100) / 100
    }
    if (paymentSettings.deposit_type === 'percent') {
      // Phase 7 — percent deposit applies to service + selected add-ons,
      // matching the server's AppointmentPaymentService logic.
      const price = selectedService ? totalPrice : null
      if (price == null || price <= 0) return null
      const pct = Math.max(0, Math.min(100, amount))
      const dep = Math.min(price, (price * pct) / 100)
      return Math.round(dep * 100) / 100
    }
    return null
  })()

  const fullPreview: number | null = (() => {
    if (!paymentSettings) return null
    if (!paymentSettings.payments_enabled) return null
    if (!paymentSettings.allow_full_payment) return null
    // Phase 7 — full payment covers the service + add-ons total.
    const price = selectedService ? totalPrice : null
    if (price == null || price <= 0) return null
    return Math.round(price * 100) / 100
  })()

  const depositAllowed = depositPreview != null
  const fullAllowed    = fullPreview != null
  const paymentRequired = depositAllowed || fullAllowed
  const showChoice = depositAllowed && fullAllowed

  // Effective choice: when only one option exists, lock to it.
  const effectiveChoice: PaymentChoice = showChoice
    ? paymentChoice
    : (depositAllowed ? 'deposit' : 'full')

  const chargePreview: number | null = effectiveChoice === 'full' ? fullPreview : depositPreview
  const remainingBalance: number | null =
    effectiveChoice === 'deposit' && selectedService && depositPreview != null
      ? Math.max(0, Math.round((totalPrice - depositPreview) * 100) / 100)
      : 0

  // Back-compat alias for the rest of the component
  const depositRequired = paymentRequired

  async function handleSubmit() {
    if (!serviceId || !date || !selectedSlot || !name.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: PublicBookingPayload = {
        service_id:       serviceId,
        appointment_date: date,
        start_time:       selectedSlot,
        customer_name:    name.trim(),
        customer_email:   email.trim()  || undefined,
        customer_phone:   phone.trim()  || undefined,
        notes:            notes.trim()  || undefined,
      }
      if (paymentRequired) {
        payload.payment_choice = effectiveChoice
      }
      if (requirePolicyAgreement) {
        payload.policy_agreed = true // backend rejects if false/missing
      }
      // Phase 7 — addon_ids gets whitelisted server-side; required ones
      // auto-included even if missing here. staff_id null = any staff.
      if (addonIds.length > 0) {
        payload.addon_ids = addonIds
      }
      if (effectiveStaffId != null) {
        payload.staff_id = effectiveStaffId
      }
      const res = await createPublicAppointment(slug, payload)
      if (res.checkout_url) {
        // Hand control off to Stripe — webhook will finalize the booking
        // once payment completes.
        window.location.href = res.checkout_url
        return
      }
      setSuccess(true)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const isConflict = /no longer available|not available|slot|conflict|422/i.test(raw)
      setSubmitError(
        isConflict
          ? 'This time is no longer available. Please go back and choose another slot.'
          : raw
      )
    } finally {
      setSubmitting(false)
    }
  }

  function gotoPrevMonth() {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11 }
      return m - 1
    })
  }
  function gotoNextMonth() {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0 }
      return m + 1
    })
  }

  const isPrevMonthDisabled = (() => {
    const lastOfPrev = new Date(viewYear, viewMonth, 0)
    return lastOfPrev < today
  })()
  const isNextMonthDisabled = (() => {
    if (!maxDate) return false
    const firstOfNext = new Date(viewYear, viewMonth + 1, 1)
    return firstOfNext > maxDate
  })()

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="tfr-booking-success">
        <div className="tfr-booking-success-icon" aria-hidden="true">
          <Heart size={48} fill="currentColor" />
        </div>
        <p className="tfr-booking-eyebrow">Booking request sent</p>
        <h3>You&apos;re on the books</h3>
        <p className="tfr-booking-success-copy">
          Your request was sent to <strong>{displayName}</strong>.
          They will confirm your appointment shortly.
        </p>
        {selectedService && date && selectedSlot && (
          <div className="tfr-booking-success-summary">
            <span>{selectedService.name}</span>
            <span className="tfr-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmtDateDisplay(date)}</span>
            <span className="tfr-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmt12(selectedSlot)}</span>
          </div>
        )}
        <p className="tfr-booking-success-note">
          No payment required — payment is handled at the appointment.
        </p>
      </div>
    )
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  const canStep2 = serviceId !== null
  const canStep3 = canStep2 && !!date && !!selectedSlot
  const canStep4 = canStep3
                   && name.trim().length > 0
                   && (! requirePolicyAgreement || policyAgreed)

  function stepClass(n: Step) {
    if (step === n) return 'tfr-booking-step is-active'
    if (step > n)  return 'tfr-booking-step is-done'
    return 'tfr-booking-step'
  }

  // ── Calendar grid build ──
  const firstDay   = startOfMonth(viewYear, viewMonth)
  const startWeekday = firstDay.getDay() // 0=Sun
  const daysCount  = daysInMonth(viewYear, viewMonth)
  const cells: ({ d: Date } | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysCount; day++) cells.push({ d: new Date(viewYear, viewMonth, day) })
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <section className="tfr-booking-section">

      {/* ── Progress header ── */}
      <div className="tfr-booking-head">
        <span className="tfr-booking-eyebrow">Book Online</span>
        <h2>Reserve Your Appointment</h2>
        <div className="tfr-booking-progress" role="tablist">
          {STEPS.map(([n, label]) => (
            <button
              key={n}
              role="tab"
              aria-selected={step === n}
              className={stepClass(n)}
              onClick={() => { if (n < step) setStep(n) }}
            >
              <span className="tfr-booking-step-num">
                {step > n ? <Check size={12} strokeWidth={3} /> : n}
              </span>
              <span className="tfr-booking-step-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tfr-booking-slides">

        {/* ── Step 1: Service ── */}
        <div className={`tfr-booking-slide${step === 1 ? ' is-active' : ''}`}>
          {services.length === 0 ? (
            <p style={{ color: 'var(--tfr-muted)', fontSize: 14 }}>No services available yet.</p>
          ) : showCategoryPicker && categoryKey === null ? (
            /* Phase 8 — Category sub-screen. Renders when 2+ categories
               are in active use; user picks one before seeing services.
               Tiles reuse the .tfr-booking-service-card visual so the
               look matches the rest of the booking flow. */
            <>
              <p
                className="tfr-booking-block-label"
                style={{ marginBottom: 10 }}
              >
                Choose a category
              </p>
              <div className="tfr-booking-services">
                {categoryTiles.map(tile => (
                  <button
                    key={String(tile.key)}
                    type="button"
                    className="tfr-booking-service-card"
                    onClick={() => setCategoryKey(tile.key)}
                    style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                  >
                    <div className="tfr-booking-service-top">
                      <h3>{tile.name}</h3>
                      <span className="tfr-booking-price" style={{ fontSize: 11, opacity: 0.75 }}>
                        {tile.count} service{tile.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {tile.description && (
                      <p className="tfr-booking-desc">{tile.description}</p>
                    )}
                    <span className="tfr-booking-pick" style={{ pointerEvents: 'none' }}>
                      Browse <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Back link to category picker (only when the picker is in play). */}
              {showCategoryPicker && (
                <button
                  type="button"
                  className="tfr-booking-back"
                  onClick={() => {
                    // Reset the chain — service / addons / staff all
                    // bound to the previous category get cleared.
                    setCategoryKey(null)
                    setServiceId(null)
                    setAddonIds([])
                    setStaffId(null)
                  }}
                  style={{ marginBottom: 12 }}
                >
                  <ArrowLeft size={12} /> All categories
                  {activeCategoryName && (
                    <span style={{ opacity: 0.6, marginLeft: 6 }}>· {activeCategoryName}</span>
                  )}
                </button>
              )}
              <div className="tfr-booking-services">
                {visibleServices.map(s => {
                  const isSelected = serviceId === s.id
                  const hasAddons  = (s.linked_addons ?? []).length > 0
                  return (
                    <div
                      key={s.id}
                      className={`tfr-booking-service-card${isSelected ? ' is-selected' : ''}`}
                    >
                      <div className="tfr-booking-service-top">
                        <h3>{s.name}</h3>
                        <span className="tfr-booking-price">${Number(s.price).toFixed(2)}</span>
                      </div>
                      {s.description && <p className="tfr-booking-desc">{s.description}</p>}
                      <p className="tfr-booking-meta">
                        <Clock size={12} /> {s.duration_minutes} min
                        {hasAddons && <span style={{ opacity: 0.7, marginLeft: 6 }}>· add-ons available</span>}
                      </p>
                      <button
                        className="tfr-booking-pick"
                        onClick={() => {
                          // Phase 7 — don't auto-advance when the service
                          // has add-ons; the customer needs to tick any
                          // optional extras before continuing. If there
                          // are no add-ons, jump straight to date/time
                          // like the old flow did.
                          setServiceId(s.id)
                          if (!hasAddons) setStep(2)
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'} <ArrowRight size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Phase 7 — Add-ons for the chosen service. Required links
                  are pre-checked and disabled so the customer can't drop
                  them; optional ones toggle freely. Running total shown
                  underneath so the price/duration impact is obvious. */}
              {selectedService && (selectedService.linked_addons ?? []).length > 0 && (
                <div className="tfr-booking-block" style={{ marginTop: 24 }}>
                  <span className="tfr-booking-block-label">Add-ons (optional)</span>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {(selectedService.linked_addons ?? []).map(link => {
                      const addon = serviceAddons.find(a => a.id === link.addon_id)
                      if (!addon) return null
                      const checked = addonIds.includes(addon.id)
                      return (
                        <label
                          key={addon.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 12px',
                            border: '1px solid ' + (checked ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'),
                            background: checked ? 'rgba(255,255,255,0.06)' : 'transparent',
                            cursor: link.is_required ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={link.is_required}
                            onChange={e => {
                              setAddonIds(prev => e.target.checked
                                ? [...prev, addon.id]
                                : prev.filter(id => id !== addon.id))
                            }}
                            style={{ marginTop: 3, accentColor: '#fff', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{addon.name}</span>
                              {link.is_required && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                                  textTransform: 'uppercase', padding: '2px 6px',
                                  background: 'rgba(255,255,255,0.12)',
                                }}>
                                  Required
                                </span>
                              )}
                            </span>
                            {addon.description && (
                              <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                                {addon.description}
                              </span>
                            )}
                            <span style={{ display: 'block', fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                              +${addon.extra_price.toFixed(2)}
                              {addon.extra_duration_minutes > 0 && ` · +${addon.extra_duration_minutes} min`}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {addonExtraPrice > 0 && (
                    <p style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                      Running total: <strong>${totalPrice.toFixed(2)}</strong> · {totalMinutes} min
                    </p>
                  )}
                </div>
              )}

              <div className="tfr-booking-nav" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="tfr-booking-next"
                  disabled={!canStep2}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Step 2: Date & Time ── */}
        <div className={`tfr-booking-slide${step === 2 ? ' is-active' : ''}`}>
          <div className="tfr-booking-datetime">

            {/* Phase 7 — Staff picker. Only shown when 2+ staff can do
                this service. A single assigned staff is locked-in
                implicitly so we don't waste a UI step on a non-choice.
                Changing this re-fetches slots (effectiveStaffId is in
                the availability useEffect's dep list). */}
            {showStaffPicker && (
              <div className="tfr-booking-block">
                <span className="tfr-booking-block-label">Choose Your Staff</span>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStaffId(null)}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: '1px solid ' + (staffId == null ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'),
                      background: staffId == null ? 'rgba(255,255,255,0.06)' : 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Any available staff</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                      We&apos;ll match you with whoever&apos;s free at your chosen time.
                    </div>
                  </button>
                  {availableStaff.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffId(s.id)}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: '1px solid ' + (staffId === s.id ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'),
                        background: staffId === s.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        borderRadius: 0,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      {s.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.photo_url}
                          alt=""
                          width={40}
                          height={40}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                        {s.role && (
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.role}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* When only one staff is eligible, surface a soft note so
                the customer knows who they're booking with. */}
            {!showStaffPicker && availableStaff.length === 1 && (
              <p style={{ fontSize: 12, opacity: 0.8 }}>
                You&apos;ll be booking with <strong>{availableStaff[0].name}</strong>.
              </p>
            )}

            <div className="tfr-booking-block">
              <span className="tfr-booking-block-label">Pick a Day</span>

              {/* Calendar */}
              <div className="tfr-booking-calendar">
                <div className="tfr-calendar-head">
                  <button
                    type="button"
                    className="tfr-calendar-nav"
                    onClick={gotoPrevMonth}
                    disabled={isPrevMonthDisabled}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="tfr-calendar-title">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    className="tfr-calendar-nav"
                    onClick={gotoNextMonth}
                    disabled={isNextMonthDisabled}
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="tfr-calendar-dow">
                  {DAY_SHORT.map(d => <span key={d}>{d}</span>)}
                </div>

                <div className="tfr-calendar-grid" role="grid">
                  {cells.map((c, i) => {
                    if (!c) return <span key={i} className="tfr-calendar-day tfr-calendar-day--empty" aria-hidden="true" />
                    const blocked  = isDateBlocked(c.d)
                    const isToday  = isSameDay(c.d, today)
                    const key      = dateKey(c.d)
                    const selected = date === key
                    return (
                      <button
                        key={i}
                        type="button"
                        role="gridcell"
                        className={
                          'tfr-calendar-day'
                          + (blocked  ? ' tfr-calendar-day--blocked'  : '')
                          + (isToday  ? ' tfr-calendar-day--today'    : '')
                          + (selected ? ' tfr-calendar-day--selected' : '')
                        }
                        disabled={blocked}
                        aria-label={c.d.toDateString() + (blocked ? ' (closed)' : '')}
                        onClick={() => { if (!blocked) setDate(key) }}
                      >
                        {c.d.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="tfr-booking-block">
              <span className="tfr-booking-block-label">Available Times</span>
              {!date && (
                <p className="tfr-slot-msg">Select a day above to see available times.</p>
              )}
              {slotState.status === 'loading' && (
                <p className="tfr-slot-msg">Loading times…</p>
              )}
              {slotState.status === 'error' && (
                <p className="tfr-slot-msg tfr-slot-error">{slotState.message}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length === 0 && (
                <p className="tfr-slot-msg">{slotState.message ?? 'No times available. Try another day.'}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length > 0 && (
                <div className="tfr-booking-times">
                  {slotState.slots.map(slot => (
                    <button
                      key={slot.start_time}
                      className={`tfr-booking-time${selectedSlot === slot.start_time ? ' is-selected' : ''}`}
                      onClick={() => setSelectedSlot(slot.start_time)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="tfr-booking-nav">
              <button className="tfr-booking-back" onClick={() => setStep(1)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="tfr-booking-next"
                disabled={!canStep3}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 3: Details ── */}
        <div className={`tfr-booking-slide${step === 3 ? ' is-active' : ''}`}>
          <div className="tfr-booking-fields">
            <label>
              <span>Full Name *</span>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                type="tel"
                placeholder="(000) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                placeholder="Any special requests or notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="tfr-booking-textarea"
              />
            </label>
          </div>
          <div className="tfr-booking-nav" style={{ marginTop: 20 }}>
            <button className="tfr-booking-back" onClick={() => setStep(2)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="tfr-booking-next"
              disabled={!name.trim()}
              onClick={() => setStep(4)}
            >
              Review <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 4: Confirm ── */}
        <div className={`tfr-booking-slide${step === 4 ? ' is-active' : ''}`}>
          <div className="tfr-booking-confirm">

            <div className="tfr-booking-summary">
              <span className="tfr-booking-block-label">Your Appointment</span>
              <dl>
                {selectedService && (
                  <div><dt>Service</dt><dd>{selectedService.name}</dd></div>
                )}
                {/* Phase 7 — one row per picked add-on so the customer
                    sees exactly what they're paying for. */}
                {pickedAddons.map(a => (
                  <div key={a.id}>
                    <dt>+ {a.name}</dt>
                    <dd>
                      +${a.extra_price.toFixed(2)}
                      {a.extra_duration_minutes > 0 && ` · +${a.extra_duration_minutes} min`}
                    </dd>
                  </div>
                ))}
                {effectiveStaffName && (
                  <div><dt>Staff</dt><dd>{effectiveStaffName}</dd></div>
                )}
                <div><dt>Date</dt><dd>{date ? fmtDateDisplay(date) : '—'}</dd></div>
                <div><dt>Time</dt><dd>{selectedSlot ? fmt12(selectedSlot) : '—'}</dd></div>
                {selectedService && (
                  <div><dt>Duration</dt><dd>{totalMinutes} min</dd></div>
                )}
                {selectedService && (
                  <div className="tfr-booking-total">
                    <dt>Total</dt>
                    <dd>${totalPrice.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="tfr-booking-summary" style={{ marginTop: 12 }}>
              <span className="tfr-booking-block-label">Your Info</span>
              <dl>
                <div><dt>Name</dt><dd>{name}</dd></div>
                {email && <div><dt>Email</dt><dd>{email}</dd></div>}
                {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
                {notes && <div><dt>Notes</dt><dd>{notes}</dd></div>}
              </dl>
            </div>

            {paymentRequired && (
              <div className="tfr-booking-summary" style={{ marginTop: 12 }}>
                <span className="tfr-booking-block-label">
                  {showChoice ? 'Payment Options' : (effectiveChoice === 'full' ? 'Payment Required' : 'Deposit Required')}
                </span>

                {showChoice && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0 12px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('deposit')}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: '1px solid ' + (paymentChoice === 'deposit' ? '#fff' : 'rgba(255,255,255,0.15)'),
                        background: paymentChoice === 'deposit' ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: 0,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                        Pay Deposit
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${depositPreview!.toFixed(2)}</div>
                      {selectedService && selectedService.price > depositPreview! && (
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                          ${(selectedService.price - depositPreview!).toFixed(2)} balance later
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('full')}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: '1px solid ' + (paymentChoice === 'full' ? '#fff' : 'rgba(255,255,255,0.15)'),
                        background: paymentChoice === 'full' ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: 0,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                        Pay In Full
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${fullPreview!.toFixed(2)}</div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                        Nothing owed at appointment
                      </div>
                    </button>
                  </div>
                )}

                <dl>
                  <div className="tfr-booking-total">
                    <dt>{effectiveChoice === 'full' ? 'Due now (paid in full)' : 'Deposit due now'}</dt>
                    <dd>${chargePreview!.toFixed(2)}</dd>
                  </div>
                  {effectiveChoice === 'deposit' && remainingBalance! > 0 && (
                    <div>
                      <dt>Balance at appointment</dt>
                      <dd>${remainingBalance!.toFixed(2)}</dd>
                    </div>
                  )}
                </dl>
                <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  You&apos;ll be sent to a secure Stripe page to pay
                  {effectiveChoice === 'full' ? ' in full' : ' your deposit'}.
                  Your booking is reserved once the payment clears.
                </p>
              </div>
            )}

            {requirePolicyAgreement && (
              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px', marginTop: 12,
                  background: '#F8F6F2', border: '1px solid rgba(18,18,18,0.10)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={policyAgreed}
                  onChange={e => setPolicyAgreed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: '#121212', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, lineHeight: 1.5, color: '#3A3A3A' }}>
                  I&apos;ve read and agree to the booking policies (cancellation,
                  late arrival, no-show, deposit, and reschedule rules).
                </span>
              </label>
            )}

            {submitError && (
              <div className="tfr-booking-error">{submitError}</div>
            )}

            <div className="tfr-booking-nav">
              <button className="tfr-booking-back" onClick={() => setStep(3)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="tfr-booking-confirm-btn"
                disabled={submitting || !canStep4}
                onClick={handleSubmit}
              >
                {submitting
                  ? (paymentRequired ? 'Redirecting to payment…' : 'Sending…')
                  : paymentRequired
                    ? (effectiveChoice === 'full'
                        ? <>Pay Full & Book <Check size={14} strokeWidth={3} /></>
                        : <>Pay Deposit & Book <Check size={14} strokeWidth={3} /></>)
                    : <>Confirm Booking <Check size={14} strokeWidth={3} /></>
                }
              </button>
            </div>

            <p className="tfr-booking-disclaimer">
              <CalendarCheck size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
              {paymentRequired
                ? (effectiveChoice === 'full'
                    ? 'Payment is required to reserve your appointment.'
                    : 'A deposit is required to reserve your appointment.')
                : 'No payment required — the business will confirm your appointment.'}
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
