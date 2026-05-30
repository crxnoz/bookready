'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight,
  Clock, Heart, CalendarCheck, Image as ImageIcon, Loader2, X,
} from 'lucide-react'
import { getPublicAvailability, createPublicAppointment, uploadBookingAnswerImage } from '@/lib/api'
import type {
  AvailableSlot, PaymentChoice, PublicBookingPayload, Service,
  AvailabilityData, PublicPaymentSettings,
  ServiceAddon, PublicStaffMember, ServiceCategory,
  BookingQuestion, BookingQuestionAnswerInput,
} from '@/lib/types'
import { UserCircle, BookmarkCheck, LogOut, Mail, ExternalLink } from 'lucide-react'
import { useLushCustomerAuth } from './LushCustomerAuth'

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

type Step = 1 | 2 | 3 | 4 | 5

type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; slots: AvailableSlot[]; message: string | null }
  | { status: 'error'; message: string }

// Phase 8 — Add-ons is its own step now. When the chosen service has no
// linked add-ons the helpers below short-circuit it so the customer
// jumps 1 → 3 without a dead-end click.
const STEPS: [Step, string][] = [
  [1, 'Service'],
  [2, 'Add-ons'],
  [3, 'Date & Time'],
  [4, 'Details'],
  [5, 'Confirm'],
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function LushStudioBooking({
  slug,
  services,
  displayName,
  availability,
  paymentSettings,
  requirePolicyAgreement = false,
  serviceAddons = [],
  staffMembers = [],
  serviceCategories = [],
  bookingQuestions = [],
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
  /** Phase 16: custom owner-defined questions, scoped per-service or
   *  to-all. Rendered inline at the bottom of the Details step so the
   *  flow stays 5 steps. */
  bookingQuestions?: BookingQuestion[]
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
  // Phase 16 — custom question answers, keyed by question id. Cleared
  // when service changes so a service-scoped question doesn't leak its
  // answer into a different service's submit.
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, { value?: string | boolean; image_url?: string }>>({})
  const [uploadingFor,    setUploadingFor]    = useState<number | null>(null)
  const [uploadErrFor,    setUploadErrFor]    = useState<number | null>(null)
  // Customer-account awareness. Shared with the header widget via the
  // LushCustomerAuthProvider mounted at the template root — one /auth/me
  // probe per page load, not one per consumer. When the visitor signs
  // in via the in-page modal, `authedUser` flips and the effect below
  // auto-fills name/email/phone.
  //
  // The backend (PublicBookingController) force-overrides these to the
  // authed user's values on submit anyway, so manual edits here are
  // harmless either way — autofill is purely a UX nicety.
  const { user: authedUser, authChecked, open: openAuth, signOut: signOutAuth } = useLushCustomerAuth()
  useEffect(() => {
    if (! authedUser) return
    // Force-fill identity from the authed user whenever the identity
    // changes (initial probe completing OR a fresh sign-in via modal).
    // Previously this used `prev || authedUser.x` to protect a fast
    // typer from being clobbered on initial load — but that meant a
    // visitor who typed random@gmail.com and THEN signed in as
    // carreno@gmail.com still saw random@gmail.com in the field.
    // Deliberate sign-in should overwrite. The backend overrides
    // identity to the authed user's stored values on submit anyway,
    // so syncing the form keeps the visible state honest.
    setName(authedUser.name)
    setEmail(authedUser.email)
    setPhone(authedUser.phone ?? '')
  }, [authedUser])

  // Opt-in account-creation state for Step 4. Visible only when NOT
  // authed. The password field reveals when the checkbox is checked.
  // Default unchecked so we never imply consent — the checkbox is a
  // conversion nudge, not a default.
  const [createAccount,   setCreateAccount]   = useState(false)
  const [accountPassword, setAccountPassword] = useState('')

  // TCR-compliant SMS consent state for Step 4. Default unchecked —
  // TCR requires explicit consent, never an implied one. The
  // checkbox is hidden when the phone field is empty since there's
  // nothing to consent to (no SMS can go out without a number).
  const [smsConsent, setSmsConsent] = useState(false)

  // Flips true when the backend confirms it minted a new customer_users
  // row for this booking — drives the post-success verify-email card
  // and the "go to dashboard" CTA.
  const [customerAccountCreated, setCustomerAccountCreated] = useState(false)

  // Stripe-redirect-return banner. Two flavors:
  //   - "account=new" — booking ALSO created a customer account; show
  //     the verify-email + dashboard prompt.
  //   - Authed return (no account=new) — they were already signed in;
  //     surface a "booking confirmed → go to dashboard" banner so the
  //     visitor has a path to manage what they just paid for.
  const [showStripeAccountBanner,  setShowStripeAccountBanner]  = useState(false)
  const [showStripeConfirmedBanner, setShowStripeConfirmedBanner] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('booking') === 'success' && params.get('account') === 'new') {
      setShowStripeAccountBanner(true)
    } else if (params.get('booking') === 'success') {
      setShowStripeConfirmedBanner(true)
    }
  }, [])

  async function handleSignOutThin() {
    try { await signOutAuth() } catch { /* fail open */ }
    // Wipe the auto-filled identity fields so the form doesn't keep
    // showing the signed-out person's info.
    setName(''); setEmail(''); setPhone('')
    setCreateAccount(false); setAccountPassword('')
  }
  // Phase 8 — pre-Service category pick. null means "not picked yet" (which
  // shows the category tiles); UNCATEGORIZED is the "Other" bucket for
  // services that have no category_id assigned.
  const [categoryKey, setCategoryKey] = useState<CategoryKey | null>(null)
  const fetchRef = useRef(0)
  // Phase 8 — anchor for scroll-on-step-change. Some steps (Date & Time
  // especially) push the next step far below the fold; without this the
  // user clicks Continue and lands mid-form.
  const sectionRef = useRef<HTMLElement | null>(null)
  const didMountRef = useRef(false)
  useEffect(() => {
    // Skip the very first render so we don't yank the page on initial load.
    if (! didMountRef.current) { didMountRef.current = true; return }
    const el = sectionRef.current
    if (! el) return
    // Use rAF so the slide transition can settle before we measure.
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [step])

  const selectedService = services.find(s => s.id === serviceId) ?? null

  // Phase 16: which questions apply to the chosen service?
  // - scope='all' → always shown
  // - scope='services' → only when service id is in its service_ids list
  const applicableQuestions: BookingQuestion[] = (bookingQuestions ?? [])
    // Public payload pre-filters to active-only and drops the field, so
    // treat missing/undefined as truthy. Only reject explicit `false`.
    .filter(q => q.is_active !== false)
    .filter(q => q.scope === 'all'
      || (serviceId !== null && q.service_ids?.includes(serviceId)))
    .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))

  function patchAnswer(qid: number, patch: { value?: string | boolean; image_url?: string | null }) {
    setQuestionAnswers(prev => {
      const cur = prev[qid] ?? {}
      const next: { value?: string | boolean; image_url?: string } = { ...cur }
      if ('value' in patch && patch.value !== undefined) next.value = patch.value
      if ('image_url' in patch) {
        if (patch.image_url) next.image_url = patch.image_url
        else delete next.image_url
      }
      return { ...prev, [qid]: next }
    })
  }

  function isAnswered(q: BookingQuestion): boolean {
    const a = questionAnswers[q.id]
    if (q.type === 'image')    return !! a?.image_url
    if (q.type === 'checkbox') return a?.value === true
    const v = a?.value
    return typeof v === 'string' && v.trim().length > 0
  }

  const questionsValid = applicableQuestions.every(q => ! q.required || isAnswered(q))

  async function handleQuestionImageUpload(qid: number, file: File) {
    setUploadingFor(qid); setUploadErrFor(null)
    try {
      const res = await uploadBookingAnswerImage(slug, file)
      patchAnswer(qid, { image_url: res.url })
    } catch {
      setUploadErrFor(qid)
    } finally {
      setUploadingFor(null)
    }
  }

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
      // Phase 16: serialize answers for the applicable questions only.
      if (applicableQuestions.length > 0) {
        const answers: BookingQuestionAnswerInput[] = applicableQuestions.map(q => {
          const a = questionAnswers[q.id] ?? {}
          if (q.type === 'image') {
            return { question_id: q.id, image_url: a.image_url ?? null }
          }
          if (q.type === 'checkbox') {
            return { question_id: q.id, value: a.value === true }
          }
          const v = typeof a.value === 'string' ? a.value.trim() : ''
          return { question_id: q.id, value: v === '' ? null : v }
        })
        payload.question_answers = answers
      }
      // Opt-in account creation, surfaced via the Step 4 checkbox. Only
      // sent when the visitor explicitly ticked the box AND filled in
      // both an email and an >=8 char password. Backend re-validates +
      // falls through to anonymous booking on any mismatch (e.g. email
      // already taken) so a checkbox glitch never blocks the booking.
      if (! authedUser && createAccount && email.trim() && accountPassword.length >= 8) {
        payload.create_account   = true
        payload.account_password = accountPassword
      }

      // SMS consent — backend ignores the field when phone is empty,
      // but we only set it client-side to match (avoids a "consented
      // but no phone given" log row that's irrelevant for compliance).
      if (smsConsent && phone.trim() !== '') {
        payload.sms_consent = true
      }
      const res = await createPublicAppointment(slug, payload)
      if (res.customer_account_created) {
        setCustomerAccountCreated(true)
      }
      if (res.checkout_url) {
        // Hand control off to Stripe — webhook will finalize the booking
        // once payment completes. The success_url includes &account=new
        // when the booking also created an account, so the post-redirect
        // banner picks up from there.
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
      <div className="lush-booking-success">
        <div className="lush-booking-success-icon" aria-hidden="true">
          <Heart size={48} fill="currentColor" />
        </div>
        <p className="lush-booking-eyebrow">Booking request sent</p>
        <h3>You&apos;re on the books</h3>
        <p className="lush-booking-success-copy">
          Your request was sent to <strong>{displayName}</strong>.
          They will confirm your appointment shortly.
        </p>
        {selectedService && date && selectedSlot && (
          <div className="lush-booking-success-summary">
            <span>{selectedService.name}</span>
            <span className="lush-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmtDateDisplay(date)}</span>
            <span className="lush-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmt12(selectedSlot)}</span>
          </div>
        )}
        <p className="lush-booking-success-note">
          No payment required — payment is handled at the appointment.
        </p>

        {/* New-account follow-up. Reassures the visitor that the
            booking itself is locked in, then asks them to verify so
            their account is fully active. Same copy as the Stripe-
            return banner so the messaging is consistent regardless of
            whether the tenant takes payment. */}
        {customerAccountCreated && (
          <div className="lush-booking-account-followup lush-booking-account-followup--success">
            <div className="lush-booking-account-followup-icon" aria-hidden="true">
              <Mail size={18} />
            </div>
            <div className="lush-booking-account-followup-body">
              <p className="lush-booking-account-followup-eyebrow">Your BookReady account</p>
              <p className="lush-booking-account-followup-title">
                Check your inbox to verify your email.
              </p>
              <p className="lush-booking-account-followup-sub">
                Your appointment is confirmed regardless. Verifying lets you
                manage and reschedule from any device.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="lush-booking-account-followup-cta"
              >
                Go to dashboard <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        )}

        {/* Already-authed in-page success (no new account, no payment
            redirect): point them at /account so they can manage what
            they just booked. */}
        {! customerAccountCreated && authedUser && (
          <div className="lush-booking-account-followup lush-booking-account-followup--success">
            <div className="lush-booking-account-followup-icon" aria-hidden="true">
              <BookmarkCheck size={18} />
            </div>
            <div className="lush-booking-account-followup-body">
              <p className="lush-booking-account-followup-eyebrow">Your BookReady account</p>
              <p className="lush-booking-account-followup-title">
                Manage from your dashboard.
              </p>
              <p className="lush-booking-account-followup-sub">
                Reschedule, cancel, or see every booking across BookReady businesses in one place.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="lush-booking-account-followup-cta"
              >
                Go to dashboard <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  // Each gate says "may the customer reach THIS step?"; the step bar
  // uses them to enable/disable jumping back. canStep2/canStep3 are
  // identical (both unlock after a service is picked) — Add-ons is
  // optional, so the only thing date-time really cares about is "is
  // there a service". canSubmit (was canStep4) gates the final submit.
  const canStep2  = serviceId !== null       // Add-ons (optional)
  const canStep3  = serviceId !== null       // Date & Time
  const canStep4  = canStep3 && !!date && !!selectedSlot  // Details
  const canSubmit = canStep4
                   && name.trim().length > 0
                   && (! requirePolicyAgreement || policyAgreed)
                   && questionsValid

  // Add-ons step is only meaningful if the chosen service has at least
  // one linked add-on. When it doesn't, Continue/Back skip past Step 2
  // and the step pill still shows so the bar stays a consistent 5-pill
  // visual across tenants.
  const hasAddonsForService = (selectedService?.linked_addons ?? []).length > 0
  const goAfterService = () => setStep(hasAddonsForService ? 2 : 3)
  const goBackFromDateTime = () => setStep(hasAddonsForService ? 2 : 1)

  function stepClass(n: Step) {
    if (step === n) return 'lush-booking-step is-active'
    if (step > n)  return 'lush-booking-step is-done'
    return 'lush-booking-step'
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
    <section className="lush-booking-section" ref={sectionRef}>

      {/* ── Progress header ── */}
      <div className="lush-booking-head">
        <span className="lush-booking-eyebrow">Book Online</span>
        <h2>Reserve Your Appointment</h2>

        {/* Persistent thin sign-in indicator — visible from every step.
            Deliberately subtle (no card, no border) so it doesn't
            compete with the form. The action is the same as the modal
            elsewhere: open the in-page LushAuthModal. When the visitor
            is already signed in we surface their name + a sign-out
            link in the same slot so they can switch identities mid-
            flow if they need to. */}
        {authChecked && ! authedUser && (
          <p className="lush-booking-auth-thin">
            Have a BookReady account?{' '}
            <button type="button" onClick={() => openAuth('signin')}>
              Sign in
            </button>
          </p>
        )}
        {authChecked && authedUser && (
          <p className="lush-booking-auth-thin">
            Signed in as <strong>{authedUser.name}</strong>
            {' · '}
            <button type="button" onClick={handleSignOutThin}>
              Sign out
            </button>
          </p>
        )}

        {/* Stripe-return banner: shown when the user came back from
            hosted checkout AND the original booking POST also created
            their account. The welcome+verify email has already gone
            out — we just need to point them at their inbox. */}
        {showStripeAccountBanner && (
          <div className="lush-booking-account-followup">
            <div className="lush-booking-account-followup-icon" aria-hidden="true">
              <Mail size={18} />
            </div>
            <div className="lush-booking-account-followup-body">
              <p className="lush-booking-account-followup-eyebrow">Almost done</p>
              <p className="lush-booking-account-followup-title">
                Check your inbox to verify your BookReady account.
              </p>
              <p className="lush-booking-account-followup-sub">
                Your appointment and payment are confirmed regardless. Verifying
                your email lets you manage and reschedule from any device.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="lush-booking-account-followup-cta"
              >
                Go to dashboard <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        )}

        {/* Same shape but for visitors who were ALREADY signed in when
            they paid — they don't need verify-email copy, just a
            confirmation + a path back to /account so they can manage
            what they just booked. */}
        {showStripeConfirmedBanner && (
          <div className="lush-booking-account-followup">
            <div className="lush-booking-account-followup-icon" aria-hidden="true">
              <BookmarkCheck size={18} />
            </div>
            <div className="lush-booking-account-followup-body">
              <p className="lush-booking-account-followup-eyebrow">All set</p>
              <p className="lush-booking-account-followup-title">
                Your booking is confirmed.
              </p>
              <p className="lush-booking-account-followup-sub">
                Manage, reschedule, or cancel from your BookReady dashboard.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="lush-booking-account-followup-cta"
              >
                Go to dashboard <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        )}

        {/* Phase 8 — compact dot timeline. Labels are sr-only on the
            individual buttons; the caption below the track shows the
            currently-active step's name so we don't lose context. */}
        <div className="lush-booking-progress" role="tablist">
          <div className="lush-booking-progress-track">
            {STEPS.map(([n, label]) => (
              <button
                key={n}
                role="tab"
                aria-selected={step === n}
                aria-label={`Step ${n}: ${label}`}
                className={stepClass(n)}
                onClick={() => { if (n < step) setStep(n) }}
              >
                <span className="lush-booking-step-num">
                  {step > n ? <Check size={12} strokeWidth={3} /> : n}
                </span>
                <span className="lush-booking-step-label">{label}</span>
              </button>
            ))}
          </div>
          <p className="lush-booking-progress-caption">
            Step {step} of {STEPS.length}
            <strong>{STEPS.find(([n]) => n === step)?.[1]}</strong>
          </p>
        </div>
      </div>

      <div className="lush-booking-slides">

        {/* ── Step 1: Service ── */}
        <div className={`lush-booking-slide${step === 1 ? ' is-active' : ''}`}>
          {services.length === 0 ? (
            <p style={{ color: 'var(--lush-muted)', fontSize: 14 }}>No services available yet.</p>
          ) : showCategoryPicker && categoryKey === null ? (
            /* Phase 8 — Category sub-screen. Renders when 2+ categories
               are in active use; user picks one before seeing services.
               Tiles reuse the .lush-booking-service-card visual so the
               look matches the rest of the booking flow. */
            <>
              <p
                className="lush-booking-block-label"
                style={{ marginBottom: 10 }}
              >
                Choose a category
              </p>
              <div className="lush-booking-services">
                {categoryTiles.map(tile => (
                  <button
                    key={String(tile.key)}
                    type="button"
                    className="lush-booking-service-card"
                    onClick={() => setCategoryKey(tile.key)}
                    style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                  >
                    <div className="lush-booking-service-top">
                      <h3>{tile.name}</h3>
                      <span className="lush-booking-price" style={{ fontSize: 11, opacity: 0.75 }}>
                        {tile.count} service{tile.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {tile.description && (
                      <p className="lush-booking-desc">{tile.description}</p>
                    )}
                    <span className="lush-booking-pick" style={{ pointerEvents: 'none' }}>
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
                  className="lush-booking-back"
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
              <div className="lush-booking-services">
                {visibleServices.map(s => {
                  const isSelected = serviceId === s.id
                  const hasAddons  = (s.linked_addons ?? []).length > 0
                  return (
                    <div
                      key={s.id}
                      className={`lush-booking-service-card${isSelected ? ' is-selected' : ''}`}
                    >
                      <div className="lush-booking-service-top">
                        <h3>{s.name}</h3>
                        <span className="lush-booking-price">${Number(s.price).toFixed(2)}</span>
                      </div>
                      {s.description && <p className="lush-booking-desc">{s.description}</p>}
                      <p className="lush-booking-meta">
                        <Clock size={12} /> {s.duration_minutes} min
                        {hasAddons && <span style={{ opacity: 0.7, marginLeft: 6 }}>· add-ons available</span>}
                      </p>
                      <button
                        className="lush-booking-pick"
                        onClick={() => {
                          // Phase 8 — auto-advance to whichever step is
                          // next: Add-ons (step 2) if this service has
                          // any linked add-ons, else straight to Date &
                          // Time (step 3). The service-change useEffect
                          // is what populates required add-ons + clears
                          // stale staff picks; we just push state and
                          // jump on the next tick.
                          setServiceId(s.id)
                          // Use `s.linked_addons` directly — selectedService
                          // hasn't updated yet in this render pass.
                          setStep((s.linked_addons ?? []).length > 0 ? 2 : 3)
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'} <ArrowRight size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="lush-booking-nav" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="lush-booking-next"
                  disabled={!canStep2}
                  onClick={goAfterService}
                >
                  Continue <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Step 2: Add-ons ─────────────────────────────────────────────
            Phase 8 — promoted from a sub-screen inside Step 1 to its own
            step. We render the slide for everyone (so the step bar's
            visual stays consistent), but the per-card Select button
            auto-jumps 1 → 3 when the chosen service has zero add-ons,
            so this slide is only actually seen when there's something
            to pick. Required links are pre-checked + disabled so they
            can't be dropped; optional ones toggle freely. */}
        <div className={`lush-booking-slide${step === 2 ? ' is-active' : ''}`}>
          {selectedService && hasAddonsForService ? (
            <>
              <div className="lush-booking-block">
                <span className="lush-booking-block-label">Add-ons (optional)</span>
                <p style={{ fontSize: 12, opacity: 0.75, margin: '6px 0 12px' }}>
                  Customize your <strong>{selectedService.name}</strong> with any of these extras.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(selectedService.linked_addons ?? []).map(link => {
                    const addon = serviceAddons.find(a => a.id === link.addon_id)
                    if (!addon) return null
                    const checked = addonIds.includes(addon.id)
                    const cls = 'lush-addon-card'
                      + (checked ? ' is-checked' : '')
                      + (link.is_required ? ' is-locked' : '')
                    return (
                      <label key={addon.id} className={cls}>
                        <input
                          type="checkbox"
                          className="lush-addon-input"
                          checked={checked}
                          disabled={link.is_required}
                          onChange={e => {
                            setAddonIds(prev => e.target.checked
                              ? [...prev, addon.id]
                              : prev.filter(id => id !== addon.id))
                          }}
                        />
                        <span className="lush-addon-indicator" aria-hidden="true">
                          {checked && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="lush-addon-body">
                          <span className="lush-addon-head">
                            <span className="lush-addon-name">{addon.name}</span>
                            {link.is_required && (
                              <span className="lush-addon-required">Required</span>
                            )}
                          </span>
                          {addon.description && (
                            <span className="lush-addon-desc">{addon.description}</span>
                          )}
                          <span className="lush-addon-meta">
                            +${addon.extra_price.toFixed(2)}
                            {addon.extra_duration_minutes > 0 && (
                              <>
                                <span className="lush-addon-meta-dot">·</span>
                                +{addon.extra_duration_minutes} min
                              </>
                            )}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                {addonExtraPrice > 0 && (
                  <p style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
                    Running total: <strong>${totalPrice.toFixed(2)}</strong> · {totalMinutes} min
                  </p>
                )}
              </div>
            </>
          ) : (
            // Safety net: someone jumped here despite no add-ons being
            // available (e.g. clicked the step pill manually). Give them
            // a clear "nothing to do here" message + a way forward.
            <p style={{ fontSize: 14, opacity: 0.8 }}>
              No add-ons for this service — continue to choose a time.
            </p>
          )}
          <div className="lush-booking-nav" style={{ marginTop: 16 }}>
            <button className="lush-booking-back" onClick={() => setStep(1)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="lush-booking-next"
              disabled={!canStep3}
              onClick={() => setStep(3)}
            >
              Continue <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 3: Date & Time ── */}
        <div className={`lush-booking-slide${step === 3 ? ' is-active' : ''}`}>
          <div className="lush-booking-datetime">

            {/* Phase 7 — Staff picker. Only shown when 2+ staff can do
                this service. A single assigned staff is locked-in
                implicitly so we don't waste a UI step on a non-choice.
                Changing this re-fetches slots (effectiveStaffId is in
                the availability useEffect's dep list). */}
            {showStaffPicker && (
              <div className="lush-booking-block">
                <span className="lush-booking-block-label">Choose Your Staff</span>
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

            <div className="lush-booking-block">
              <span className="lush-booking-block-label">Pick a Day</span>

              {/* Calendar */}
              <div className="lush-booking-calendar">
                <div className="lush-calendar-head">
                  <button
                    type="button"
                    className="lush-calendar-nav"
                    onClick={gotoPrevMonth}
                    disabled={isPrevMonthDisabled}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="lush-calendar-title">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    className="lush-calendar-nav"
                    onClick={gotoNextMonth}
                    disabled={isNextMonthDisabled}
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="lush-calendar-dow">
                  {DAY_SHORT.map(d => <span key={d}>{d}</span>)}
                </div>

                <div className="lush-calendar-grid" role="grid">
                  {cells.map((c, i) => {
                    if (!c) return <span key={i} className="lush-calendar-day lush-calendar-day--empty" aria-hidden="true" />
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
                          'lush-calendar-day'
                          + (blocked  ? ' lush-calendar-day--blocked'  : '')
                          + (isToday  ? ' lush-calendar-day--today'    : '')
                          + (selected ? ' lush-calendar-day--selected' : '')
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

            <div className="lush-booking-block">
              <span className="lush-booking-block-label">Available Times</span>
              {!date && (
                <p className="lush-slot-msg">Select a day above to see available times.</p>
              )}
              {slotState.status === 'loading' && (
                <p className="lush-slot-msg">Loading times…</p>
              )}
              {slotState.status === 'error' && (
                <p className="lush-slot-msg lush-slot-error">{slotState.message}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length === 0 && (
                <p className="lush-slot-msg">{slotState.message ?? 'No times available. Try another day.'}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length > 0 && (
                <div className="lush-booking-times">
                  {slotState.slots.map(slot => (
                    <button
                      key={slot.start_time}
                      className={`lush-booking-time${selectedSlot === slot.start_time ? ' is-selected' : ''}`}
                      onClick={() => setSelectedSlot(slot.start_time)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lush-booking-nav">
              <button className="lush-booking-back" onClick={goBackFromDateTime}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="lush-booking-next"
                disabled={!canStep4}
                onClick={() => setStep(4)}
              >
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 4: Details ── */}
        <div className={`lush-booking-slide${step === 4 ? ' is-active' : ''}`}>
          {/* Already-authed: a prominent "View your bookings" card right
              above the form. Repeat customers care about jumping to
              their dashboard; we lean into that affordance instead of
              the previous subtle inline link. The persistent thin row
              above the progress already handles sign-out. */}
          {authChecked && authedUser && (
            <a
              href="https://app.bkrdy.me/account"
              target="_blank"
              rel="noopener noreferrer"
              className="lush-booking-account-cta"
            >
              <span className="lush-booking-account-cta-icon" aria-hidden="true">
                <BookmarkCheck size={18} />
              </span>
              <span className="lush-booking-account-cta-body">
                <span className="lush-booking-account-cta-eyebrow">Your BookReady account</span>
                <span className="lush-booking-account-cta-title">View your bookings</span>
                <span className="lush-booking-account-cta-sub">
                  See and manage every booking across BookReady.
                </span>
              </span>
              <span className="lush-booking-account-cta-arrow" aria-hidden="true">
                <ExternalLink size={14} />
              </span>
            </a>
          )}
          <div className="lush-booking-fields">
            {/* The four standard identity inputs use .lush-booking-field so
                styling can be tweaked (e.g. flex-direction:row) without
                bleeding into the nested account-creation block below. */}
            <label className="lush-booking-field">
              <span>Full Name *</span>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="lush-booking-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="lush-booking-field">
              <span>Phone</span>
              <input
                type="tel"
                placeholder="(000) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>

            {/* SMS consent — only shown when a phone is provided.
                Unchecked by default. Required for TCR compliance:
                outbound appointment SMS only goes to customers who
                have explicitly opted in PER booking. Consent is
                never a condition of completing the booking. */}
            {phone.trim() !== '' && (
              <label className="lush-booking-sms-consent">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={e => setSmsConsent(e.target.checked)}
                />
                <span>
                  Send me SMS reminders about my appointment. Msg &amp; data
                  rates may apply. Reply STOP to unsubscribe.
                </span>
              </label>
            )}
            <label className="lush-booking-field">
              <span>Notes</span>
              <textarea
                placeholder="Any special requests or notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="lush-booking-textarea"
              />
            </label>

            {/* Opt-in account creation — shown only when the visitor
                isn't already signed in. Checkbox + bold title sit on
                a single row; the benefits paragraph spans full width
                below so it doesn't fight the checkbox alignment.
                Password field reveals on check. Unchecked by default
                so the booking still works as a one-shot anonymous
                purchase. */}
            {authChecked && ! authedUser && (
              <div className="lush-booking-create-account">
                <label className="lush-booking-create-account-row">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={e => setCreateAccount(e.target.checked)}
                  />
                  <strong>Create a BookReady account</strong>
                </label>
                <p className="lush-booking-create-account-blurb">
                  Save your details, view this booking from any device, and
                  manage every booking you make across BookReady businesses
                  from one dashboard.
                </p>
                {createAccount && (
                  <label className="lush-booking-create-account-pw">
                    <span>Choose a password</span>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="At least 8 characters"
                    />
                    <span className="lush-booking-create-account-fineprint">
                      We&rsquo;ll email a verification link. Your appointment is
                      confirmed either way — verifying is just for your account.
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Phase 16 — custom owner-defined questions */}
            {applicableQuestions.length > 0 && (
              <div className="lush-booking-questions">
                {applicableQuestions.map(q => {
                  const a = questionAnswers[q.id] ?? {}
                  return (
                    <div key={q.id} className="lush-booking-question">
                      <label>
                        <span>
                          {q.label}
                          {q.required && <span style={{ color: '#b42828', marginLeft: 4 }}>*</span>}
                        </span>

                        {q.type === 'text' && (
                          <input
                            type="text"
                            value={(a.value as string) ?? ''}
                            onChange={e => patchAnswer(q.id, { value: e.target.value })}
                          />
                        )}

                        {q.type === 'textarea' && (
                          <textarea
                            rows={3}
                            className="lush-booking-textarea"
                            value={(a.value as string) ?? ''}
                            onChange={e => patchAnswer(q.id, { value: e.target.value })}
                          />
                        )}

                        {q.type === 'checkbox' && (
                          <span className="lush-booking-checkbox-row">
                            <input
                              type="checkbox"
                              checked={a.value === true}
                              onChange={e => patchAnswer(q.id, { value: e.target.checked })}
                            />
                            <span>{q.help_text ?? 'Yes'}</span>
                          </span>
                        )}

                        {q.type === 'dropdown' && (
                          <select
                            value={(a.value as string) ?? ''}
                            onChange={e => patchAnswer(q.id, { value: e.target.value })}
                          >
                            <option value="">Pick one…</option>
                            {(q.options ?? []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {q.type === 'image' && (
                          <span className="lush-booking-image-upload">
                            {a.image_url ? (
                              <span className="lush-booking-image-preview">
                                <img src={a.image_url} alt={q.label} />
                                <button
                                  type="button"
                                  className="lush-booking-image-remove"
                                  onClick={() => patchAnswer(q.id, { image_url: null })}
                                  aria-label="Remove image"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ) : (
                              <label className="lush-booking-image-pick">
                                {uploadingFor === q.id
                                  ? <><Loader2 size={14} className="lush-spin" /> Uploading…</>
                                  : <><ImageIcon size={14} /> Choose image</>}
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  disabled={uploadingFor === q.id}
                                  onChange={async e => {
                                    const f = e.target.files?.[0]
                                    if (f) await handleQuestionImageUpload(q.id, f)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                            )}
                            {uploadErrFor === q.id && (
                              <span className="lush-booking-image-err">Upload failed. Try a smaller file.</span>
                            )}
                          </span>
                        )}
                      </label>
                      {q.help_text && q.type !== 'checkbox' && (
                        <p className="lush-booking-question-hint">{q.help_text}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="lush-booking-nav" style={{ marginTop: 20 }}>
            <button className="lush-booking-back" onClick={() => setStep(3)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="lush-booking-next"
              disabled={!name.trim() || !questionsValid}
              onClick={() => setStep(5)}
            >
              Review <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 5: Confirm ── */}
        <div className={`lush-booking-slide${step === 5 ? ' is-active' : ''}`}>
          <div className="lush-booking-confirm">

            <div className="lush-booking-summary">
              <span className="lush-booking-block-label">Your Appointment</span>
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
                  <div className="lush-booking-total">
                    <dt>Total</dt>
                    <dd>${totalPrice.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="lush-booking-summary" style={{ marginTop: 12 }}>
              <span className="lush-booking-block-label">Your Info</span>
              <dl>
                <div><dt>Name</dt><dd>{name}</dd></div>
                {email && <div><dt>Email</dt><dd>{email}</dd></div>}
                {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
                {notes && <div><dt>Notes</dt><dd>{notes}</dd></div>}
              </dl>
            </div>

            {paymentRequired && (
              <div className="lush-booking-summary" style={{ marginTop: 12 }}>
                <span className="lush-booking-block-label">
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
                  <div className="lush-booking-total">
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
              <div className="lush-booking-error">{submitError}</div>
            )}

            <div className="lush-booking-nav">
              <button className="lush-booking-back" onClick={() => setStep(4)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="lush-booking-confirm-btn"
                disabled={submitting || !canSubmit}
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

            <p className="lush-booking-disclaimer">
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
