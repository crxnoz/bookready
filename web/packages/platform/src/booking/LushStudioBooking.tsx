'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight,
  Clock, Heart, CalendarCheck, Image as ImageIcon, Loader2, X,
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { getPublicAvailability, createPublicAppointment, createAppointmentHostedFallback, previewPublicCoupon, uploadBookingAnswerImage, joinPublicWaitlist, submitPublicSqueezeIn } from '@/lib/api'
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
  | { status: 'loaded'; slots: AvailableSlot[]; message: string | null; squeezeIn?: { available: boolean; fee: number } | null }
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
  // Av2.0 P7 — waitlist modal state. Triggered from the empty-slots branch
  // when a customer's chosen day has nothing available. We surface a CTA
  // to join the waitlist for that window; if a spot opens, they get an
  // email with a claim link.
  const [waitlistOpen,     setWaitlistOpen]     = useState(false)
  const [waitlistBusy,     setWaitlistBusy]     = useState(false)
  const [waitlistMessage,  setWaitlistMessage]  = useState<string | null>(null)
  const [waitlistError,    setWaitlistError]    = useState<string | null>(null)
  const [waitlistEarliest, setWaitlistEarliest] = useState('')
  const [waitlistLatest,   setWaitlistLatest]   = useState('')
  const [waitlistNotes,    setWaitlistNotes]    = useState('')
  // Av2.0 P5 — availability request modal (active "fit me in" ask, distinct
  // from the passive waitlist). preferred_date defaults to the chosen day.
  const [requestOpen,    setRequestOpen]    = useState(false)
  const [requestBusy,    setRequestBusy]    = useState(false)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const [requestError,   setRequestError]   = useState<string | null>(null)
  const [requestDate,    setRequestDate]    = useState('')
  const [requestTime,    setRequestTime]    = useState('')
  const [requestNotes,   setRequestNotes]   = useState('')
  // Av2.0 P6 — the request modal serves squeeze-ins (standard requests retired).
  const [requestFee,       setRequestFee]       = useState(0)
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

  // Coupon code state. The widget is collapsed by default ("Have a code?")
  // — clean for the 95% of bookings without one. On Apply, we hit the
  // public preview endpoint server-side (no client-side discount calc)
  // and pass the validated code through on the booking POST, where the
  // backend re-validates before redeeming. Cleared whenever the service
  // or payment choice changes since both affect eligibility / amount.
  const [couponOpen,    setCouponOpen]    = useState(false)
  const [couponInput,   setCouponInput]   = useState('')
  const [couponBusy,    setCouponBusy]    = useState(false)
  const [couponApplied, setCouponApplied] = useState<{
    code:            string
    discount_amount: number
  } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  // Reset the applied coupon whenever the inputs that affect eligibility
  // / amount change. Avoids silently sending a stale discount the server
  // would then 422 us back on. Uses serviceId (not selectedService.id)
  // because selectedService is derived from services + serviceId later in
  // the function body — referencing it in this hook's deps would TDZ.
  useEffect(() => {
    setCouponApplied(null)
    setCouponError(null)
  }, [serviceId, paymentChoice, addonIds])

  // Embedded Stripe Checkout. When the booking POST returns a client
  // secret (payment required), we mount Stripe's Checkout component
  // on-page instead of redirecting to a hosted page. The publishable
  // key is returned alongside so the embedded form always matches the
  // backend's Stripe mode (test/live). loadStripe is memoized per key
  // so a re-render doesn't re-initialize the SDK.
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null)
  const [checkoutPubKey, setCheckoutPubKey] = useState<string | null>(null)
  const [checkoutApptId, setCheckoutApptId] = useState<number | null>(null)
  // True while the hosted fallback is in flight — unmounts the embedded
  // form (closing a slow-load race where it could submit on the old,
  // about-to-be-repointed session) and shows a "Connecting…" spinner
  // instead of a blank box during the brief redirect.
  const [checkoutFallingBack, setCheckoutFallingBack] = useState(false)
  // Last-resort error: only shown if BOTH the on-page Stripe form fails to
  // load AND the hosted-checkout fallback fails too (Stripe fully
  // unreachable). The common load-failure case auto-redirects to the
  // hosted page below, so a customer effectively never sees this.
  const [checkoutError, setCheckoutError] = useState(false)
  const stripePromise = useMemo(
    () => (checkoutPubKey ? loadStripe(checkoutPubKey) : null),
    [checkoutPubKey],
  )
  // Watch Stripe.js. If it can't load (ad/script blocker, firewall, offline)
  // or stalls, don't strand the customer on a blank box — mint a HOSTED
  // Checkout for the same appointment and redirect there. Only a total
  // failure (hosted fallback also errors) surfaces checkoutError.
  useEffect(() => {
    if (! stripePromise || ! checkoutSecret) return
    let settled = false

    async function goHostedFallback() {
      if (settled) return
      settled = true
      // Unmount the embedded form immediately so it can't capture on the
      // old session while we mint + repoint to the hosted one.
      setCheckoutFallingBack(true)
      if (! checkoutApptId) { setCheckoutError(true); return }
      try {
        const r = await createAppointmentHostedFallback(slug, checkoutApptId, checkoutSecret!)
        if (r.already_paid)  { setCheckoutSecret(null); setSuccess(true); return }
        if (r.checkout_url)  { window.location.href = r.checkout_url; return }
        setCheckoutError(true)
      } catch {
        setCheckoutError(true)
      }
    }

    // Generous stall timeout for silent-drop firewalls; hard blocks reject
    // near-instantly via the script error event.
    const timer = setTimeout(goHostedFallback, 12000)
    stripePromise
      .then(s => {
        if (settled) return
        clearTimeout(timer)
        if (! s) goHostedFallback()    // resolved null = failed to init
        else     settled = true        // loaded OK — embedded mounts normally
      })
      .catch(() => { clearTimeout(timer); goHostedFallback() })

    return () => { clearTimeout(timer); settled = true }
  }, [stripePromise, checkoutSecret, checkoutApptId, slug])

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

    // Av2.0 P4 — pass the logged-in customer's email so after-hours slots
    // gated to existing / VIP customers unlock for them.
    getPublicAvailability(slug, serviceId, date, effectiveStaffId, authedUser?.email ?? null)
      .then(res => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'loaded', slots: res.slots, message: res.message, squeezeIn: res.squeeze_in })
      })
      .catch(err => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load times.' })
      })
  }, [serviceId, date, slug, effectiveStaffId, authedUser?.email])

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

  /** Validate a coupon against the live booking inputs and capture the
   *  discount the backend will apply. Server is the source of truth —
   *  this client-side state is just for the "$X off" preview line. */
  async function applyCoupon() {
    if (! serviceId)        { setCouponError('Pick a service first.'); return }
    if (! couponInput.trim()) { setCouponError('Enter a code.'); return }
    setCouponBusy(true); setCouponError(null)
    try {
      const r = await previewPublicCoupon(slug, {
        code:           couponInput.trim(),
        service_id:     serviceId,
        payment_choice: effectiveChoice,
        addon_ids:      addonIds,
      })
      if (r.valid && r.code) {
        setCouponApplied({ code: r.code, discount_amount: r.discount_amount })
        setCouponInput(r.code)
      } else {
        setCouponApplied(null)
        setCouponError(r.reason ?? 'Coupon not valid.')
      }
    } catch (e) {
      setCouponApplied(null)
      setCouponError(e instanceof Error ? e.message : 'Could not check coupon.')
    } finally {
      setCouponBusy(false)
    }
  }

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
      // Applied coupon (server re-validates + redeems atomically). We
      // send the canonical uppercased code returned by the preview, so
      // a stray lowercase keystroke between Apply and Submit can't fail.
      if (couponApplied?.code) {
        payload.coupon_code = couponApplied.code
      }
      const res = await createPublicAppointment(slug, payload).catch(err => {
        // Surface coupon-specific failures in the coupon widget itself
        // instead of as a generic submit error.
        if (err instanceof Error && /coupon/i.test(err.message)) {
          setCouponError(err.message)
          setCouponApplied(null)
        }
        throw err
      })
      if (res.customer_account_created) {
        setCustomerAccountCreated(true)
      }
      if (res.checkout_client_secret && res.stripe_publishable_key) {
        // Embedded Checkout — mount Stripe's payment component on-page.
        // The webhook (checkout.session.completed) finalizes the booking;
        // on completion Stripe redirects to return_url (the &booking=success
        // banner, including &account=new when an account was also created).
        setCheckoutError(false)
        setCheckoutFallingBack(false)
        setCheckoutApptId(res.appointment?.id ?? null)
        setCheckoutPubKey(res.stripe_publishable_key)
        setCheckoutSecret(res.checkout_client_secret)
        return
      }
      if (res.checkout_url) {
        // Legacy hosted-redirect fallback — hand control off to Stripe.
        window.location.href = res.checkout_url
        return
      }
      if (res.payment_required) {
        // Payment was required but the backend returned no way to collect it.
        // NEVER show the "you're booked" screen for an unpaid appointment —
        // surface a recoverable error instead.
        setSubmitError('We couldn’t start payment. Please try again, or contact the business.')
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

  // ── Embedded payment ────────────────────────────────────────────────────────
  // Shown after a payment-required booking POST. Stripe's Checkout iframe
  // collects the deposit/full payment inline; on success Stripe redirects
  // to return_url and the webhook finalizes the appointment. Cancelling
  // just unmounts — the held slot frees when the session expires.
  if (checkoutSecret && stripePromise) {
    return (
      <div className="brk-booking-checkout">
        <div className="brk-booking-checkout-head">
          <p className="brk-booking-eyebrow">Secure payment</p>
          <h3>Complete your {effectiveChoice === 'full' ? 'payment' : 'deposit'}</h3>
          <p className="brk-booking-checkout-sub">
            Your time is held while you pay. Payments are processed securely by Stripe.
          </p>
        </div>
        <div className="brk-booking-checkout-frame">
          {checkoutError ? (
            <p className="brk-booking-checkout-errmsg">
              We couldn’t start payment right now. Please try again in a moment,
              or contact the business to finish your booking.
            </p>
          ) : checkoutFallingBack ? (
            <p className="brk-booking-checkout-loading">
              <Loader2 size={16} className="brk-booking-spin" /> Connecting to secure payment…
            </p>
          ) : (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkoutSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
        {! checkoutFallingBack && (
          <button
            type="button"
            className="brk-booking-checkout-cancel"
            onClick={() => { setCheckoutSecret(null); setCheckoutPubKey(null); setCheckoutApptId(null); setCheckoutError(false); setCheckoutFallingBack(false) }}
          >
            Cancel and go back
          </button>
        )}
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="brk-booking-success">
        <div className="brk-booking-success-icon" aria-hidden="true">
          <Heart size={48} fill="currentColor" />
        </div>
        <p className="brk-booking-eyebrow">Booking request sent</p>
        <h3>You&apos;re on the books</h3>
        <p className="brk-booking-success-copy">
          Your request was sent to <strong>{displayName}</strong>.
          They will confirm your appointment shortly.
        </p>
        {selectedService && date && selectedSlot && (
          <div className="brk-booking-success-summary">
            <span>{selectedService.name}</span>
            <span className="brk-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmtDateDisplay(date)}</span>
            <span className="brk-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmt12(selectedSlot)}</span>
          </div>
        )}
        <p className="brk-booking-success-note">
          No payment required — payment is handled at the appointment.
        </p>

        {/* New-account follow-up. Reassures the visitor that the
            booking itself is locked in, then asks them to verify so
            their account is fully active. Same copy as the Stripe-
            return banner so the messaging is consistent regardless of
            whether the tenant takes payment. */}
        {customerAccountCreated && (
          <div className="brk-booking-account-followup brk-booking-account-followup--success">
            <div className="brk-booking-account-followup-icon" aria-hidden="true">
              <Mail size={18} />
            </div>
            <div className="brk-booking-account-followup-body">
              <p className="brk-booking-account-followup-eyebrow">Your BookReady account</p>
              <p className="brk-booking-account-followup-title">
                Check your inbox to verify your email.
              </p>
              <p className="brk-booking-account-followup-sub">
                Your appointment is confirmed regardless. Verifying lets you
                manage and reschedule from any device.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="brk-booking-account-followup-cta"
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
          <div className="brk-booking-account-followup brk-booking-account-followup--success">
            <div className="brk-booking-account-followup-icon" aria-hidden="true">
              <BookmarkCheck size={18} />
            </div>
            <div className="brk-booking-account-followup-body">
              <p className="brk-booking-account-followup-eyebrow">Your BookReady account</p>
              <p className="brk-booking-account-followup-title">
                Manage from your dashboard.
              </p>
              <p className="brk-booking-account-followup-sub">
                Reschedule, cancel, or see every booking across BookReady businesses in one place.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="brk-booking-account-followup-cta"
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
    if (step === n) return 'brk-booking-step is-active'
    if (step > n)  return 'brk-booking-step is-done'
    return 'brk-booking-step'
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
    <section className="brk-booking-section" ref={sectionRef}>

      {/* ── Progress header ── */}
      <div className="brk-booking-head">
        <span className="brk-booking-eyebrow">Book Online</span>
        <h2>Reserve Your Appointment</h2>

        {/* Persistent thin sign-in indicator — visible from every step.
            Deliberately subtle (no card, no border) so it doesn't
            compete with the form. The action is the same as the modal
            elsewhere: open the in-page LushAuthModal. When the visitor
            is already signed in we surface their name + a sign-out
            link in the same slot so they can switch identities mid-
            flow if they need to. */}
        {authChecked && ! authedUser && (
          <p className="brk-booking-auth-thin">
            Have a BookReady account?{' '}
            <button type="button" onClick={() => openAuth('signin')}>
              Sign in
            </button>
          </p>
        )}
        {authChecked && authedUser && (
          <p className="brk-booking-auth-thin">
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
          <div className="brk-booking-account-followup">
            <div className="brk-booking-account-followup-icon" aria-hidden="true">
              <Mail size={18} />
            </div>
            <div className="brk-booking-account-followup-body">
              <p className="brk-booking-account-followup-eyebrow">Almost done</p>
              <p className="brk-booking-account-followup-title">
                Check your inbox to verify your BookReady account.
              </p>
              <p className="brk-booking-account-followup-sub">
                Your appointment and payment are confirmed regardless. Verifying
                your email lets you manage and reschedule from any device.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="brk-booking-account-followup-cta"
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
          <div className="brk-booking-account-followup">
            <div className="brk-booking-account-followup-icon" aria-hidden="true">
              <BookmarkCheck size={18} />
            </div>
            <div className="brk-booking-account-followup-body">
              <p className="brk-booking-account-followup-eyebrow">All set</p>
              <p className="brk-booking-account-followup-title">
                Your booking is confirmed.
              </p>
              <p className="brk-booking-account-followup-sub">
                Manage, reschedule, or cancel from your BookReady dashboard.
              </p>
              <a
                href="https://app.bkrdy.me/account"
                target="_blank"
                rel="noopener noreferrer"
                className="brk-booking-account-followup-cta"
              >
                Go to dashboard <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        )}

        {/* Phase 8 — compact dot timeline. Labels are sr-only on the
            individual buttons; the caption below the track shows the
            currently-active step's name so we don't lose context. */}
        <div className="brk-booking-progress" role="tablist">
          <div className="brk-booking-progress-track">
            {STEPS.map(([n, label]) => (
              <button
                key={n}
                role="tab"
                aria-selected={step === n}
                aria-label={`Step ${n}: ${label}`}
                className={stepClass(n)}
                onClick={() => { if (n < step) setStep(n) }}
              >
                <span className="brk-booking-step-num">
                  {step > n ? <Check size={12} strokeWidth={3} /> : n}
                </span>
                <span className="brk-booking-step-label">{label}</span>
              </button>
            ))}
          </div>
          <p className="brk-booking-progress-caption">
            Step {step} of {STEPS.length}
            <strong>{STEPS.find(([n]) => n === step)?.[1]}</strong>
          </p>
        </div>
      </div>

      <div className="brk-booking-slides">

        {/* ── Step 1: Service ── */}
        <div className={`brk-booking-slide${step === 1 ? ' is-active' : ''}`}>
          {services.length === 0 ? (
            <p style={{ color: 'var(--lush-muted)', fontSize: 14 }}>No services available yet.</p>
          ) : showCategoryPicker && categoryKey === null ? (
            /* Phase 8 — Category sub-screen. Renders when 2+ categories
               are in active use; user picks one before seeing services.
               Tiles reuse the .brk-booking-service-card visual so the
               look matches the rest of the booking flow. */
            <>
              <p
                className="brk-booking-block-label"
                style={{ marginBottom: 10 }}
              >
                Choose a category
              </p>
              <div className="brk-booking-services">
                {categoryTiles.map(tile => (
                  <button
                    key={String(tile.key)}
                    type="button"
                    className="brk-booking-service-card"
                    onClick={() => setCategoryKey(tile.key)}
                    style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                  >
                    {/* Optional top-banner image — categories make excellent
                        use of lifestyle photography ("hair color services"
                        with a real model). Hidden cleanly when image_url
                        isn't set. */}
                    {tile.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tile.image_url}
                        alt=""
                        className="brk-booking-service-image"
                        loading="lazy"
                      />
                    )}
                    <div className="brk-booking-service-top">
                      <h3>{tile.name}</h3>
                      <span className="brk-booking-price" style={{ fontSize: 11, opacity: 0.75 }}>
                        {tile.count} service{tile.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {tile.description && (
                      <p className="brk-booking-desc">{tile.description}</p>
                    )}
                    <span className="brk-booking-pick" style={{ pointerEvents: 'none' }}>
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
                  className="brk-booking-back"
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
              <div className="brk-booking-services">
                {visibleServices.map(s => {
                  const isSelected = serviceId === s.id
                  const hasAddons  = (s.linked_addons ?? []).length > 0
                  return (
                    <div
                      key={s.id}
                      className={`brk-booking-service-card${isSelected ? ' is-selected' : ''}`}
                    >
                      {/* Top-banner image when an upload exists. Same class
                          as category tiles so a single CSS rule controls
                          ratio + bleed across both. */}
                      {s.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.image_url}
                          alt=""
                          className="brk-booking-service-image"
                          loading="lazy"
                        />
                      )}
                      <div className="brk-booking-service-top">
                        <h3>{s.name}</h3>
                        <span className="brk-booking-price">${Number(s.price).toFixed(2)}</span>
                      </div>
                      {s.description && <p className="brk-booking-desc">{s.description}</p>}
                      <p className="brk-booking-meta">
                        <Clock size={12} /> {s.duration_minutes} min
                        {hasAddons && <span style={{ opacity: 0.7, marginLeft: 6 }}>· add-ons available</span>}
                      </p>
                      <button
                        className="brk-booking-pick"
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

              <div className="brk-booking-nav" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="brk-booking-next"
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
        <div className={`brk-booking-slide${step === 2 ? ' is-active' : ''}`}>
          {selectedService && hasAddonsForService ? (
            <>
              <div className="brk-booking-block">
                <span className="brk-booking-block-label">Add-ons (optional)</span>
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
                        {/* Optional addon thumbnail (~48px square). Slots
                            between the checkbox and the text body. Hidden
                            when image_url isn't set. */}
                        {addon.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={addon.image_url}
                            alt=""
                            className="lush-addon-thumb"
                            loading="lazy"
                          />
                        )}
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
          <div className="brk-booking-nav" style={{ marginTop: 16 }}>
            <button className="brk-booking-back" onClick={() => setStep(1)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="brk-booking-next"
              disabled={!canStep3}
              onClick={() => setStep(3)}
            >
              Continue <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 3: Date & Time ── */}
        <div className={`brk-booking-slide${step === 3 ? ' is-active' : ''}`}>
          <div className="brk-booking-datetime">

            {/* Phase 7 — Staff picker. Only shown when 2+ staff can do
                this service. A single assigned staff is locked-in
                implicitly so we don't waste a UI step on a non-choice.
                Changing this re-fetches slots (effectiveStaffId is in
                the availability useEffect's dep list). */}
            {showStaffPicker && (
              <div className="brk-booking-block">
                <span className="brk-booking-block-label">Choose Your Staff</span>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStaffId(null)}
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      border: '1.5px solid ' + (staffId == null ? 'var(--lush-pink)' : 'rgba(14,17,17,0.12)'),
                      background: staffId == null ? 'rgba(var(--lush-pink-rgb), 0.10)' : '#FFFFFF',
                      color: '#0E1111',
                      cursor: 'pointer',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Any available staff</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                      We&apos;ll match you with whoever&apos;s free at your chosen time.
                    </div>
                  </button>
                  {availableStaff.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffId(s.id)}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        border: '1.5px solid ' + (staffId === s.id ? 'var(--lush-pink)' : 'rgba(14,17,17,0.12)'),
                        background: staffId === s.id ? 'rgba(var(--lush-pink-rgb), 0.10)' : '#FFFFFF',
                        color: '#0E1111',
                        cursor: 'pointer',
                        borderRadius: 12,
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

            <div className="brk-booking-block">
              <span className="brk-booking-block-label">Pick a Day</span>

              {/* Calendar */}
              <div className="brk-booking-calendar">
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

            <div className="brk-booking-block">
              <span className="brk-booking-block-label">Available Times</span>
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
                <div>
                  <p className="lush-slot-msg">{slotState.message ?? 'No times available. Try another day.'}</p>
                  {selectedService && date && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          // Default a 14-day window starting from the chosen day —
                          // the customer can tighten before submitting.
                          const startIso = date
                          const endDate = new Date(date + 'T00:00:00')
                          endDate.setDate(endDate.getDate() + 14)
                          const endIso = dateKey(endDate)
                          setWaitlistEarliest(startIso)
                          setWaitlistLatest(endIso)
                          setWaitlistMessage(null)
                          setWaitlistError(null)
                          setWaitlistOpen(true)
                        }}
                        className="brk-booking-next"
                      >
                        Join the waitlist <Heart size={12} />
                      </button>
                      {slotState.status === 'loaded' && slotState.squeezeIn?.available && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequestDate(date)
                            setRequestTime('')
                            setRequestNotes('')
                            setRequestFee(slotState.squeezeIn?.fee ?? 0)
                            setRequestMessage(null)
                            setRequestError(null)
                            setRequestOpen(true)
                          }}
                          className="brk-booking-next"
                        >
                          Request a squeeze-in{slotState.squeezeIn.fee ? ` +$${slotState.squeezeIn.fee}` : ''} <Heart size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {slotState.status === 'loaded' && slotState.slots.length > 0 && (
                <div className="brk-booking-times">
                  {slotState.slots.map(slot => {
                    const isAfterHours = slot.tier === 'after_hours'
                    return (
                      <button
                        key={slot.start_time}
                        className={`brk-booking-time${selectedSlot === slot.start_time ? ' is-selected' : ''}${isAfterHours ? ' is-after-hours' : ''}`}
                        onClick={() => setSelectedSlot(slot.start_time)}
                        title={isAfterHours ? 'After-hours slot — a premium fee applies' : undefined}
                      >
                        {slot.label}
                        {isAfterHours && slot.price_delta ? (
                          <span className="brk-booking-time-fee">+${slot.price_delta}</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="brk-booking-nav">
              <button className="brk-booking-back" onClick={goBackFromDateTime}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="brk-booking-next"
                disabled={!canStep4}
                onClick={() => setStep(4)}
              >
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 4: Details ── */}
        <div className={`brk-booking-slide${step === 4 ? ' is-active' : ''}`}>
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
              className="brk-booking-account-cta"
            >
              <span className="brk-booking-account-cta-icon" aria-hidden="true">
                <BookmarkCheck size={18} />
              </span>
              <span className="brk-booking-account-cta-body">
                <span className="brk-booking-account-cta-eyebrow">Your BookReady account</span>
                <span className="brk-booking-account-cta-title">View your bookings</span>
                <span className="brk-booking-account-cta-sub">
                  See and manage every booking across BookReady.
                </span>
              </span>
              <span className="brk-booking-account-cta-arrow" aria-hidden="true">
                <ExternalLink size={14} />
              </span>
            </a>
          )}
          <div className="brk-booking-fields">
            {/* The four standard identity inputs use .brk-booking-field so
                styling can be tweaked (e.g. flex-direction:row) without
                bleeding into the nested account-creation block below. */}
            <label className="brk-booking-field">
              <span>Full Name *</span>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="brk-booking-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="brk-booking-field">
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
                Unchecked by default. Required for compliance: outbound
                appointment SMS only goes to customers who have explicitly
                opted in PER booking. The label names the end business
                (the salon/barber/studio the client is actually booking
                with) so recipients understand who they're consenting to
                hear from, and discloses BookReady as the platform sender
                of record. This wording must match the quote in the
                Privacy Policy (/privacy) and the consent description in
                the Twilio TFV submission verbatim, so reviewers can
                verify the deployed UI matches the claim on file.
                Consent is never a condition of completing the booking. */}
            {phone.trim() !== '' && (
              <label className="brk-booking-sms-consent">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={e => setSmsConsent(e.target.checked)}
                />
                <span>
                  I agree to receive appointment confirmations, reminders,
                  and updates from <strong>{displayName}</strong> about my
                  booking. Sent via BookReady. Msg &amp; data rates may
                  apply. Msg frequency varies. Reply STOP to opt out, HELP
                  for help. View our{' '}
                  <a
                    href="https://app.bkrdy.me/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Privacy Policy</a>.
                </span>
              </label>
            )}
            <label className="brk-booking-field">
              <span>Notes</span>
              <textarea
                placeholder="Any special requests or notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="brk-booking-textarea"
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
              <div className="brk-booking-create-account">
                <label className="brk-booking-create-account-row">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={e => setCreateAccount(e.target.checked)}
                  />
                  <strong>Create a BookReady account</strong>
                </label>
                <p className="brk-booking-create-account-blurb">
                  Save your details, view this booking from any device, and
                  manage every booking you make across BookReady businesses
                  from one dashboard.
                </p>
                {createAccount && (
                  <label className="brk-booking-create-account-pw">
                    <span>Choose a password</span>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="At least 8 characters"
                    />
                    <span className="brk-booking-create-account-fineprint">
                      We&rsquo;ll email a verification link. Your appointment is
                      confirmed either way — verifying is just for your account.
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Phase 16 — custom owner-defined questions */}
            {applicableQuestions.length > 0 && (
              <div className="brk-booking-questions">
                {applicableQuestions.map(q => {
                  const a = questionAnswers[q.id] ?? {}
                  return (
                    <div key={q.id} className="brk-booking-question">
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
                            className="brk-booking-textarea"
                            value={(a.value as string) ?? ''}
                            onChange={e => patchAnswer(q.id, { value: e.target.value })}
                          />
                        )}

                        {q.type === 'checkbox' && (
                          <span className="brk-booking-checkbox-row">
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
                          <span className="brk-booking-image-upload">
                            {a.image_url ? (
                              <span className="brk-booking-image-preview">
                                <img src={a.image_url} alt={q.label} />
                                <button
                                  type="button"
                                  className="brk-booking-image-remove"
                                  onClick={() => patchAnswer(q.id, { image_url: null })}
                                  aria-label="Remove image"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ) : (
                              <label className="brk-booking-image-pick">
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
                              <span className="brk-booking-image-err">Upload failed. Try a smaller file.</span>
                            )}
                          </span>
                        )}
                      </label>
                      {q.help_text && q.type !== 'checkbox' && (
                        <p className="brk-booking-question-hint">{q.help_text}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="brk-booking-nav" style={{ marginTop: 20 }}>
            <button className="brk-booking-back" onClick={() => setStep(3)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="brk-booking-next"
              disabled={!name.trim() || !questionsValid}
              onClick={() => setStep(5)}
            >
              Review <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 5: Confirm ── */}
        <div className={`brk-booking-slide${step === 5 ? ' is-active' : ''}`}>
          <div className="brk-booking-confirm">

            <div className="brk-booking-summary">
              <span className="brk-booking-block-label">Your Appointment</span>
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
                  <div className="brk-booking-total">
                    <dt>Total</dt>
                    <dd>${totalPrice.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="brk-booking-summary" style={{ marginTop: 12 }}>
              <span className="brk-booking-block-label">Your Info</span>
              <dl>
                <div><dt>Name</dt><dd>{name}</dd></div>
                {email && <div><dt>Email</dt><dd>{email}</dd></div>}
                {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
                {notes && <div><dt>Notes</dt><dd>{notes}</dd></div>}
              </dl>
            </div>

            {paymentRequired && (
              <div className="brk-booking-summary" style={{ marginTop: 12 }}>
                <span className="brk-booking-block-label">
                  {showChoice ? 'Payment Options' : (effectiveChoice === 'full' ? 'Payment Required' : 'Deposit Required')}
                </span>

                {showChoice && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0 12px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('deposit')}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        border: '1.5px solid ' + (paymentChoice === 'deposit' ? 'var(--lush-pink)' : 'rgba(14,17,17,0.12)'),
                        background: paymentChoice === 'deposit' ? 'rgba(var(--lush-pink-rgb), 0.10)' : '#FFFFFF',
                        color: '#0E1111',
                        cursor: 'pointer',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Pay Deposit
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${depositPreview!.toFixed(2)}</div>
                      {selectedService && selectedService.price > depositPreview! && (
                        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                          ${(selectedService.price - depositPreview!).toFixed(2)} balance later
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('full')}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        border: '1.5px solid ' + (paymentChoice === 'full' ? 'var(--lush-pink)' : 'rgba(14,17,17,0.12)'),
                        background: paymentChoice === 'full' ? 'rgba(var(--lush-pink-rgb), 0.10)' : '#FFFFFF',
                        color: '#0E1111',
                        cursor: 'pointer',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Pay In Full
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${fullPreview!.toFixed(2)}</div>
                      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                        Nothing owed at appointment
                      </div>
                    </button>
                  </div>
                )}

                <dl>
                  <div className="brk-booking-total">
                    <dt>{effectiveChoice === 'full' ? 'Due now (paid in full)' : 'Deposit due now'}</dt>
                    <dd>${chargePreview!.toFixed(2)}</dd>
                  </div>
                  {couponApplied && (
                    <div className="brk-booking-coupon-line">
                      <dt>Coupon {couponApplied.code}</dt>
                      <dd>− ${couponApplied.discount_amount.toFixed(2)}</dd>
                    </div>
                  )}
                  {couponApplied && (
                    <div className="brk-booking-total brk-booking-coupon-total">
                      <dt>Total {effectiveChoice === 'full' ? 'due now' : 'deposit'}</dt>
                      <dd>${Math.max(0, chargePreview! - couponApplied.discount_amount).toFixed(2)}</dd>
                    </div>
                  )}
                  {effectiveChoice === 'deposit' && remainingBalance! > 0 && (
                    <div>
                      <dt>Balance at appointment</dt>
                      <dd>${remainingBalance!.toFixed(2)}</dd>
                    </div>
                  )}
                </dl>

                {/* Coupon widget. Hidden link by default — clean for the
                    majority of bookings without a code. Expands inline on
                    click; applied coupons show a pill with a Remove. */}
                <div className="brk-booking-coupon">
                  {couponApplied ? (
                    <div className="brk-booking-coupon-applied">
                      <span className="brk-booking-coupon-tag">
                        ✓ {couponApplied.code} applied
                      </span>
                      <button
                        type="button"
                        className="brk-booking-coupon-remove"
                        onClick={() => { setCouponApplied(null); setCouponInput(''); setCouponError(null); setCouponOpen(false) }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : couponOpen ? (
                    <div className="brk-booking-coupon-form">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                        placeholder="Enter code"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={64}
                        className="brk-booking-coupon-input"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void applyCoupon() } }}
                      />
                      <button
                        type="button"
                        className="brk-booking-coupon-apply"
                        onClick={() => void applyCoupon()}
                        disabled={couponBusy || ! couponInput.trim()}
                      >
                        {couponBusy ? 'Checking…' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="brk-booking-coupon-toggle"
                      onClick={() => setCouponOpen(true)}
                    >
                      Have a coupon code?
                    </button>
                  )}
                  {couponError && (
                    <p className="brk-booking-coupon-err">{couponError}</p>
                  )}
                </div>
                <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  You&apos;ll pay
                  {effectiveChoice === 'full' ? ' in full' : ' your deposit'} securely
                  with Stripe on the next step. Your booking is reserved once the
                  payment clears.
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
              <div className="brk-booking-error">{submitError}</div>
            )}

            <div className="brk-booking-nav">
              <button className="brk-booking-back" onClick={() => setStep(4)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="brk-booking-confirm-btn"
                disabled={submitting || !canSubmit}
                onClick={handleSubmit}
              >
                {submitting
                  ? (paymentRequired ? 'Starting secure payment…' : 'Sending…')
                  : paymentRequired
                    ? (effectiveChoice === 'full'
                        ? <>Pay Full & Book <Check size={14} strokeWidth={3} /></>
                        : <>Pay Deposit & Book <Check size={14} strokeWidth={3} /></>)
                    : <>Confirm Booking <Check size={14} strokeWidth={3} /></>
                }
              </button>
            </div>

            <p className="brk-booking-disclaimer">
              <CalendarCheck size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
              {paymentRequired
                ? (effectiveChoice === 'full'
                    ? 'Payment is required to reserve your appointment.'
                    : 'A deposit is required to reserve your appointment.')
                : 'No payment required — the business will confirm your appointment.'}
            </p>
          </div>
        </div>

        {/* Av2.0 P7 — Join Waitlist modal. Surfaced when the selected day
            has zero slots; closes on success, X, or backdrop click. The
            customer's name/email are reused from the booking form so they
            don't have to retype. */}
        {waitlistOpen && selectedService && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => !waitlistBusy && setWaitlistOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(20,20,20,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--lush-cream, #faf6f1)',
                color: 'var(--lush-ink, #1a1a1a)',
                borderRadius: 20,
                padding: '22px 22px 20px',
                maxWidth: 440,
                width: '100%',
                boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setWaitlistOpen(false)}
                disabled={waitlistBusy}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  border: 0, background: 'transparent', cursor: 'pointer',
                  padding: 6, borderRadius: 999, color: 'currentColor',
                }}
              >
                <X size={18} />
              </button>

              {waitlistMessage ? (
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <Check size={20} />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>You&rsquo;re on the list</h3>
                  </div>
                  <p style={{ margin: '4px 0 16px', fontSize: 14, lineHeight: 1.5 }}>{waitlistMessage}</p>
                  <button
                    type="button"
                    className="brk-booking-next"
                    onClick={() => setWaitlistOpen(false)}
                    style={{ width: '100%' }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <Heart size={20} />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Join the waitlist</h3>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                    We&rsquo;ll email you if a {selectedService.name} spot opens between these dates.
                  </p>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <label className="brk-booking-field">
                      <span>Your Name *</span>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                    <label className="brk-booking-field">
                      <span>Email *</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="brk-booking-field">
                      <span>Phone (optional)</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(555) 555-5555"
                      />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="brk-booking-field">
                        <span>Earliest *</span>
                        <input
                          type="date"
                          value={waitlistEarliest}
                          onChange={e => setWaitlistEarliest(e.target.value)}
                        />
                      </label>
                      <label className="brk-booking-field">
                        <span>Latest *</span>
                        <input
                          type="date"
                          value={waitlistLatest}
                          onChange={e => setWaitlistLatest(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="brk-booking-field">
                      <span>Notes (optional)</span>
                      <textarea
                        value={waitlistNotes}
                        onChange={e => setWaitlistNotes(e.target.value)}
                        placeholder="Anything you'd like us to know?"
                        rows={2}
                      />
                    </label>
                  </div>

                  {waitlistError && (
                    <p style={{
                      marginTop: 10, fontSize: 13, color: '#a4252b',
                      background: 'rgba(164,37,43,0.08)', padding: '8px 10px', borderRadius: 10,
                    }}>{waitlistError}</p>
                  )}

                  <button
                    type="button"
                    className="brk-booking-next"
                    style={{ width: '100%', marginTop: 14 }}
                    disabled={waitlistBusy || !name.trim() || !email.trim() || !waitlistEarliest || !waitlistLatest}
                    onClick={async () => {
                      setWaitlistBusy(true)
                      setWaitlistError(null)
                      try {
                        const res = await joinPublicWaitlist(slug, {
                          customer_name:  name.trim(),
                          customer_email: email.trim(),
                          customer_phone: phone.trim() || undefined,
                          service_id:     selectedService.id,
                          staff_id:       effectiveStaffId ?? undefined,
                          preferred_date: date || undefined,
                          earliest_date:  waitlistEarliest,
                          latest_date:    waitlistLatest,
                          notes:          waitlistNotes.trim() || undefined,
                        })
                        setWaitlistMessage(res.message)
                      } catch (e) {
                        setWaitlistError(e instanceof Error ? e.message : 'Could not join the waitlist.')
                      } finally {
                        setWaitlistBusy(false)
                      }
                    }}
                  >
                    {waitlistBusy ? <><Loader2 size={14} className="lush-spin" /> Joining…</> : <>Join waitlist <Check size={14} strokeWidth={3} /></>}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Av2.0 P6 — Squeeze-in request modal. Active "fit me in" ask on a
            full day; the owner reviews and approves / suggests / declines. */}
        {requestOpen && selectedService && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => !requestBusy && setRequestOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(20,20,20,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--lush-cream, #faf6f1)',
                color: 'var(--lush-ink, #1a1a1a)',
                borderRadius: 20,
                padding: '22px 22px 20px',
                maxWidth: 440,
                width: '100%',
                boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setRequestOpen(false)}
                disabled={requestBusy}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  border: 0, background: 'transparent', cursor: 'pointer',
                  padding: 6, borderRadius: 999, color: 'currentColor',
                }}
              >
                <X size={18} />
              </button>

              {requestMessage ? (
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <Check size={20} />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Request sent</h3>
                  </div>
                  <p style={{ margin: '4px 0 16px', fontSize: 14, lineHeight: 1.5 }}>{requestMessage}</p>
                  <button type="button" className="brk-booking-next" onClick={() => setRequestOpen(false)} style={{ width: '100%' }}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <CalendarCheck size={20} />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                      Request a squeeze-in
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                    This day is full, but ask {displayName} to squeeze you in for {selectedService.name}{requestFee ? <> — a <strong>${requestFee}</strong> fee applies if approved</> : ''}. They&rsquo;ll email you to confirm.
                  </p>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <label className="brk-booking-field">
                      <span>Your Name *</span>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                    </label>
                    <label className="brk-booking-field">
                      <span>Email *</span>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                    </label>
                    <label className="brk-booking-field">
                      <span>Phone (optional)</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="brk-booking-field">
                        <span>Preferred date *</span>
                        <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} />
                      </label>
                      <label className="brk-booking-field">
                        <span>Preferred time</span>
                        <input type="time" value={requestTime} onChange={e => setRequestTime(e.target.value)} />
                      </label>
                    </div>
                    <label className="brk-booking-field">
                      <span>Notes (optional)</span>
                      <textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} placeholder="Anything that helps us fit you in?" rows={2} />
                    </label>
                  </div>

                  {requestError && (
                    <p style={{ marginTop: 10, fontSize: 13, color: '#a4252b', background: 'rgba(164,37,43,0.08)', padding: '8px 10px', borderRadius: 10 }}>{requestError}</p>
                  )}

                  <button
                    type="button"
                    className="brk-booking-next"
                    style={{ width: '100%', marginTop: 14 }}
                    disabled={requestBusy || !name.trim() || !email.trim() || !requestDate}
                    onClick={async () => {
                      setRequestBusy(true)
                      setRequestError(null)
                      try {
                        const payload = {
                          customer_name:  name.trim(),
                          customer_email: email.trim(),
                          customer_phone: phone.trim() || undefined,
                          service_id:     selectedService.id,
                          staff_id:       effectiveStaffId ?? undefined,
                          preferred_date: requestDate,
                          preferred_time: requestTime || undefined,
                          notes:          requestNotes.trim() || undefined,
                        }
                        const res = await submitPublicSqueezeIn(slug, payload)
                        setRequestMessage(res.message)
                      } catch (e) {
                        setRequestError(e instanceof Error ? e.message : 'Could not send your request.')
                      } finally {
                        setRequestBusy(false)
                      }
                    }}
                  >
                    {requestBusy ? <><Loader2 size={14} className="lush-spin" /> Sending…</> : <>Send request <Check size={14} strokeWidth={3} /></>}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
