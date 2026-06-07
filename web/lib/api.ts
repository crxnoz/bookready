import {
  ApiStaffMember,
  Appointment,
  AuthResponse,
  AuthUser,
  AvailabilityData,
  AvailableSlot,
  BillingCycle,
  BlockedDate,
  BlockedDatePayload,
  BusinessPolicy,
  BusinessProfile,
  CheckoutResponse,
  CheckoutSessionData,
  CreateAppointmentPayload,
  Customer,
  CustomerCreatePayload,
  CustomerDetail,
  CustomerTag,
  CustomerTagPayload,
  CustomerUpdatePayload,
  PaymentTransactionsResponse,
  StripePayoutsResponse,
  HoursEntry,
  LoginPayload,
  PublicAvailabilityResponse,
  PublicBookingPayload,
  PublicBookingResponse,
  ManageBookingView,
  ManageBookingActionResponse,
  ChargeBalanceResponse,
  ChargeLateFeePayload,
  ChargeLateFeeResponse,
  ConnectDashboardLinkResponse,
  MarkPaidPayload,
  MarkPaidResponse,
  RequestTipResponse,
  PublicSite,
  RefundPayload,
  RefundResponse,
  RegisterPayload,
  ResultsGroup,
  ResultsGroupPayload,
  ResultsItem,
  ResultsItemPayload,
  GalleryGroup,
  GalleryGroupPayload,
  GalleryItem,
  GalleryItemPayload,
  AccountProfile,
  AccountUpdatePayload,
  AdminTenantsResponse,
  PlatformAnnouncement,
  PlatformAnnouncementPayload,
  BookingSettings,
  BookingSettingsPayload,
  ChangePasswordPayload,
  NotificationSettings,
  NotificationSettingsPayload,
  EmailTemplateKey,
  SignOutEverywhereResponse,
  PaymentSettings,
  PaymentSettingsPayload,
  StripeConnectStartResponse,
  StripeConnectStatusResponse,
  Service,
  ServiceAddon,
  ServiceAddonPayload,
  BookingQuestion,
  BookingQuestionPayload,
  ServiceCategory,
  ServiceCategoryPayload,
  StaffMemberPayload,
  StaffHoursEntry,
  StaffBlockedDate,
  StaffBlockedDatePayload,
  TemplateSettings,
  TemplateSettingsResponse,
  TenantData,
  UpdateAppointmentPayload,
  WebsiteSection,
  WebsiteSectionCreatePayload,
  WebsiteSectionUpdatePayload,
} from './types'
import { mockTenant } from './mockTenant'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const init = options
  // Phase S6 — session auth now travels via the httpOnly bookready_token
  // Authenticated API calls use the httpOnly cookie only.
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    // #159 — preserve extra body fields (existing_role, redirect_url,
    // try_endpoint, code) so register/login pages can render context-
    // aware UX on conflicts instead of just a flat message string.
    const e: Error & {
      status?:        number
      code?:          string
      existing_role?: 'owner' | 'customer'
      redirect_url?:  string
      try_endpoint?:  string
    } = new Error(err?.message ?? 'Request failed')
    e.status = res.status
    if (err && typeof err.code          === 'string') e.code          = err.code
    if (err && typeof err.existing_role === 'string') e.existing_role = err.existing_role
    if (err && typeof err.redirect_url  === 'string') e.redirect_url  = err.redirect_url
    if (err && typeof err.try_endpoint  === 'string') e.try_endpoint  = err.try_endpoint
    throw e
  }
  return res.json() as Promise<T>
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Finalize a Google sign-up where the user clicked "Continue with Google"
 * before picking a business name. The OAuth callback parked the verified
 * Google identity in the server cache under `handoff`; we send back the
 * chosen business name and get a Sanctum token in return.
 */
export async function completeGoogleSignup(payload: {
  handoff: string
  business_name: string
  /**
   * Pre-launch (#117): same ToS gate as the email-signup endpoint —
   * the deferred-name Google flow can land here without going through
   * /register, so consent is collected on /register/complete.
   */
  terms_accepted: boolean
  /** Template chosen on /register/complete; overrides the cached pick. */
  template?: string
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/google/complete-signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * #159 — Swap to the sibling role on the same identity. Revokes the
 * current session + mints a new one + sets the matching httpOnly
 * cookie. Returns the dashboard URL to navigate to.
 */
export async function switchRole(to: 'owner' | 'customer'): Promise<{
  current_role: 'owner' | 'customer'
  redirect_url: string
  user?: AuthUser
}> {
  return request('/auth/switch-role', {
    method: 'POST',
    body: JSON.stringify({ to }),
  })
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

// ── Image uploads ────────────────────────────────────────────────────────────

export type UploadKind = 'gallery' | 'results' | 'header' | 'logo' | 'about' | 'staff' | 'service' | 'category' | 'addon' | 'booking_answer'

export interface UploadResponse {
  url: string
  key: string
  bytes: number
}

export async function uploadEditorImage(file: File, kind: UploadKind): Promise<UploadResponse> {
  // Phase S6 — credentials: 'include' for the cookie path; the
  const form  = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  const res = await fetch(`${API_BASE}/editor/uploads`, {
    method:      'POST',
    body:        form,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Upload failed')
  }
  return res.json() as Promise<UploadResponse>
}

// Phase S6 part 2 — ask the backend to re-send the verify-email link
// for the signed-in user. Throttled at the route level (3/hour/IP).
export async function resendVerificationEmail(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/verify-email/resend', { method: 'POST' })
}

// A6 — primary verification mechanic: submit the 6-digit code from the
// email. Throttled at 5/min server-side. On success the user record's
// email_verified_at flips, so the caller should immediately re-check
// /auth/me + advance to the next step (or read the response's
// verified: true and advance directly).
export async function verifyEmailCode(code: string): Promise<{ verified: boolean }> {
  return request<{ verified: boolean }>('/auth/verify-email/code', {
    method: 'POST',
    body:   JSON.stringify({ code }),
  })
}

// A7 — signup-form availability check. Public + throttled (60/min/IP);
// safe to call as the owner types. Returns the normalized slug + an
// availability flag and, when taken, a suggested free alternative.
export interface SubdomainCheckResponse {
  slug:      string
  available: boolean
  suggested: string | null
  reason?:   'taken' | 'reserved' | 'invalid'
}
export async function checkSubdomain(rawSlug: string): Promise<SubdomainCheckResponse> {
  const qs = `?slug=${encodeURIComponent(rawSlug)}`
  return request<SubdomainCheckResponse>(`/public/check-subdomain${qs}`)
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

// ── Password reset (public — no auth) ───────────────────────────────────────

/**
 * #161: turnstileToken comes from the <TurnstileWidget> on the forgot
 * password form. Backend 422s the request without a valid token.
 */
export async function requestPasswordReset(email: string, turnstileToken: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/password/forgot', {
    method: 'POST',
    body:   JSON.stringify({ email, turnstile_token: turnstileToken }),
  })
}

export async function resetPassword(payload: {
  email:                 string
  token:                 string
  password:              string
  password_confirmation: string
}): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/password/reset', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function getPublicSite(slug: string, unlockToken?: string | null): Promise<PublicSite> {
  // cache: 'no-store' so SSR always sees the latest template_settings + sections
  // (the public/site route is force-dynamic but Next's fetch-level cache must
  // also be disabled to actually re-fetch from the API on every request).
  const qs = unlockToken ? `?unlock=${encodeURIComponent(unlockToken)}` : ''
  return request<PublicSite>(`/public/sites/${slug}${qs}`, { cache: 'no-store', credentials: 'omit' })
}

/**
 * Phase S1 — try a password against a private site. Returns a short-lived
 * unlock token on success. The frontend then re-fetches the site with
 * ?unlock=<token> appended.
 */
export async function unlockPublicSite(slug: string, password: string): Promise<{ token?: string; error?: string }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${base}/public/sites/${slug}/unlock`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({ password }),
  })
  return res.json().catch(() => ({ error: 'network' }))
}

/**
 * Phase S1 — read the unlock token from the current URL so private-site
 * subsequent calls (availability + booking POST) carry it through.
 * Browser-only; returns null in SSR.
 */
function currentUnlockToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('unlock')
  } catch {
    return null
  }
}

export async function getPublicAvailability(
  slug: string,
  serviceId: number,
  date: string,
  staffId?: number | null,
): Promise<PublicAvailabilityResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  // Phase 7 — when staffId is set, conflicts + per-staff blocked dates
  // get filtered to that staff member's calendar on the server.
  const params: Record<string, string> = { service_id: String(serviceId), date }
  if (staffId != null) params.staff_id = String(staffId)
  const unlock = currentUnlockToken()
  if (unlock) params.unlock = unlock
  const qs   = new URLSearchParams(params).toString()
  const res  = await fetch(`${base}/public/sites/${slug}/availability?${qs}`, {
    headers: { Accept: 'application/json' },
    cache:   'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Failed to load availability')
  }
  return res.json() as Promise<PublicAvailabilityResponse>
}

export async function createPublicAppointment(
  slug: string,
  data: PublicBookingPayload,
): Promise<PublicBookingResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  // Phase S1 — thread the unlock token through for private sites.
  const unlock = currentUnlockToken()
  const body   = unlock ? { ...data, unlock } : data
  const res = await fetch(`${base}/public/sites/${slug}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    // credentials:'include' so an authed customer's bookready_customer_token
    // cookie is sent. The booking route is auth-OPTIONAL — anonymous bookers
    // still work because the cookie is just absent. When present, the
    // backend stamps clients.customer_user_id + the pivot row so the
    // booking shows up in /account. Without this line, even a signed-in
    // visitor would book "anonymously" from the backend's perspective.
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Booking failed')
  }
  return res.json() as Promise<PublicBookingResponse>
}

// ── Public manage-booking (token-gated, no auth) ────────────────────────────

export async function getManageBooking(slug: string, token: string): Promise<ManageBookingView> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${base}/public/sites/${slug}/manage/${token}`, {
    cache:   'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Booking not found')
  }
  return res.json() as Promise<ManageBookingView>
}

export async function cancelManageBooking(slug: string, token: string): Promise<ManageBookingActionResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${base}/public/sites/${slug}/manage/${token}/cancel`, {
    method:  'POST',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Cancellation failed')
  }
  return res.json() as Promise<ManageBookingActionResponse>
}

export async function rescheduleManageBooking(
  slug:  string,
  token: string,
  data:  { appointment_date: string; start_time: string },
): Promise<ManageBookingActionResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${base}/public/sites/${slug}/manage/${token}/reschedule`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Reschedule failed')
  }
  return res.json() as Promise<ManageBookingActionResponse>
}

// ── Billing ───────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session. Accepts the new 18-SKU model
 * (plan + sms_mult + billing_cycle); legacy callers without plan
 * still work via the env-var fallback on the backend.
 */
export async function createCheckoutSession(
  billingCycle: BillingCycle,
  templateSlug: string,
  opts?: { plan?: 'solo' | 'studio' | 'salon'; smsMult?: 1 | 2 | 3 },
): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({
      billing_cycle: billingCycle,
      template_slug: templateSlug,
      plan:          opts?.plan,
      sms_mult:      opts?.smsMult,
    }),
  })
}

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionData> {
  return request<CheckoutSessionData>(`/billing/checkout-session/${sessionId}`)
}

/**
 * #155 — Start a 14-day free trial. Stripe Checkout collects a card
 * via SetupIntent + creates a subscription in `trialing` status. No
 * charge until day 14. Tenant flipped to subscription_state='trialing'
 * optimistically (webhook overwrites later if anything diverges).
 *
 * Returns the Stripe Checkout URL to redirect into.
 */
export async function startTrial(
  billingCycle: BillingCycle,
  templateSlug: string,
  opts?: { plan?: 'solo' | 'studio' | 'salon'; smsMult?: 1 | 2 | 3 },
): Promise<{ checkout_url: string; trial_ends_at: string }> {
  return request<{ checkout_url: string; trial_ends_at: string }>('/billing/start-trial', {
    method: 'POST',
    body: JSON.stringify({
      billing_cycle: billingCycle,
      template_slug: templateSlug,
      plan:          opts?.plan,
      sms_mult:      opts?.smsMult,
    }),
  })
}

// A5 refinement — "Skip for now" on /checkout/trial. Sets
// trial_acknowledged_at on the tenant so the post-login redirect lets
// the user through to /editor without requiring a card. Trial countdown
// still starts so the existing 14-day gate kicks in eventually.
export async function skipTrialSetup(): Promise<{ message: string; trial_ends_at: string | null }> {
  return request<{ message: string; trial_ends_at: string | null }>('/billing/skip-trial', {
    method: 'POST',
  })
}

/**
 * Plan catalog — drives the editor billing UI + the upgrade dialog.
 * Same shape as config/plans.php on the backend.
 */
export interface BillingPlan {
  label:                string
  description:          string
  sms_base:             number
  staff_seats:          number
  allow_custom_domain:  boolean
  monthly_base_cents:   number
  annual_base_cents:    number
  featured?:            boolean
  waitlist?:            boolean
}

export interface BillingPlansResponse {
  plans:                  Record<'solo' | 'studio' | 'salon', BillingPlan>
  sms_multipliers:        Record<'1' | '2' | '3', { label: string; sms_factor: number }>
  cycles:                 Record<'monthly' | 'annual', { interval: string; interval_count: number; label: string }>
  sms_overage_cents:      number
  /**
   * Per-SMS uplift dollars for the bundle upgrade. Same single source of
   * truth as config/plans.php (currently $0.0075 = ~47% margin at $0.004
   * carrier cost). Frontend computes uplift = sms_delta × per_sms_uplift
   * × 100 cents.
   */
  per_sms_uplift_dollars: number
}

export async function getBillingPlans(): Promise<BillingPlansResponse> {
  return request<BillingPlansResponse>('/billing/plans')
}

export interface BillingSubscription {
  subscribed:     boolean
  on_trial:       boolean
  trial_ends:     string | null
  subscription:   { id: string; stripe_id: string; stripe_status: string; ends_at: string | null } | null
  plan:           'solo' | 'studio' | 'salon' | null
  sms_mult:       1 | 2 | 3 | null
  sms_included:   number
  billing_cycle:  'monthly' | 'annual' | null
}

export async function getBillingSubscription(): Promise<BillingSubscription> {
  return request<BillingSubscription>('/billing/subscription')
}

export async function getBillingPortalUrl(): Promise<{ url: string }> {
  return request<{ url: string }>('/billing/portal')
}

// ── Editor ────────────────────────────────────────────────────────────────────

export async function getEditorData(): Promise<TenantData> {
  // TODO: return request<TenantData>('/editor/site')
  console.log('[api] getEditorData stub')
  return Promise.resolve(mockTenant)
}

export async function saveBusiness(data: TenantData['business']): Promise<void> {
  // TODO: return request('/editor/business', { method: 'PATCH', body: JSON.stringify(data) })
  console.log('[api] saveBusiness stub', data)
}

export async function getEditorBusiness(): Promise<BusinessProfile> {
  return request<BusinessProfile>('/editor/business')
}

export async function updateEditorBusiness(data: Partial<BusinessProfile>): Promise<BusinessProfile> {
  return request<BusinessProfile>('/editor/business', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * #130 — mark the onboarding wizard complete (or skipped). Idempotent
 * on the backend. Returns the stamped timestamp.
 */
export async function completeOnboarding(): Promise<{ onboarding_completed_at: string }> {
  return request<{ onboarding_completed_at: string }>('/editor/onboarding/complete', {
    method: 'POST',
  })
}

export async function getEditorServices(): Promise<Service[]> {
  return request<Service[]>('/editor/services')
}

export async function createEditorService(data: Omit<Service, 'id'>): Promise<Service> {
  return request<Service>('/editor/services', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateEditorService(id: number, data: Partial<Omit<Service, 'id'>>): Promise<Service> {
  return request<Service>(`/editor/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteEditorService(id: number): Promise<void> {
  await request(`/editor/services/${id}`, { method: 'DELETE' })
}

// ── Service categories (Phase 3) ─────────────────────────────────────────────

export async function getEditorServiceCategories(): Promise<ServiceCategory[]> {
  return request<ServiceCategory[]>('/editor/services/categories')
}

export async function createEditorServiceCategory(
  payload: ServiceCategoryPayload,
): Promise<ServiceCategory> {
  return request<ServiceCategory>('/editor/services/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorServiceCategory(
  id: number,
  payload: Partial<ServiceCategoryPayload>,
): Promise<ServiceCategory> {
  return request<ServiceCategory>(`/editor/services/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorServiceCategory(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/services/categories/${id}`, { method: 'DELETE' })
}

// ── Service add-ons (Phase 5) ────────────────────────────────────────────────

export async function getEditorServiceAddons(): Promise<ServiceAddon[]> {
  return request<ServiceAddon[]>('/editor/services/addons')
}

export async function createEditorServiceAddon(
  payload: ServiceAddonPayload,
): Promise<ServiceAddon> {
  return request<ServiceAddon>('/editor/services/addons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorServiceAddon(
  id: number,
  payload: Partial<ServiceAddonPayload>,
): Promise<ServiceAddon> {
  return request<ServiceAddon>(`/editor/services/addons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorServiceAddon(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/services/addons/${id}`, { method: 'DELETE' })
}

// ── Booking Questions (Phase 16) ─────────────────────────────────────────────

export async function getEditorBookingQuestions(): Promise<BookingQuestion[]> {
  return request<BookingQuestion[]>('/editor/booking-questions')
}

export async function createEditorBookingQuestion(
  payload: BookingQuestionPayload,
): Promise<BookingQuestion> {
  return request<BookingQuestion>('/editor/booking-questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorBookingQuestion(
  id: number,
  payload: BookingQuestionPayload,
): Promise<BookingQuestion> {
  return request<BookingQuestion>(`/editor/booking-questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorBookingQuestion(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/booking-questions/${id}`, { method: 'DELETE' })
}

/**
 * Public-facing image upload for booking-answer questions. Doesn't require
 * Sanctum auth — the endpoint resolves the tenant from the slug.
 */
export async function uploadBookingAnswerImage(
  slug: string,
  file: File,
): Promise<{ url: string; key: string; bytes: number }> {
  const fd = new FormData()
  fd.append('file', file)

  const url = `${API_BASE}/public/sites/${slug}/booking-answer-upload`
  // Phase S5++ — forward the site-unlock token (from ?unlock= on the
  // public site URL) so private/coming-soon sites can accept uploads
  // from a visitor who already unlocked the site. The backend honors
  // X-Site-Unlock alongside ?unlock= query param.
  const unlock = currentUnlockToken()
  const headers: Record<string, string> = {}
  if (unlock) headers['X-Site-Unlock'] = unlock

  const res = await fetch(url, { method: 'POST', body: fd, headers })
  if (! res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Upload failed (${res.status})`)
  }
  return res.json()
}

export async function getEditorHours(): Promise<HoursEntry[]> {
  return request<HoursEntry[]>('/editor/hours')
}

export async function updateEditorHours(hours: HoursEntry[]): Promise<HoursEntry[]> {
  return request<HoursEntry[]>('/editor/hours', {
    method: 'PATCH',
    body: JSON.stringify({ hours }),
  })
}

export async function getEditorAvailability(): Promise<AvailabilityData> {
  return request<AvailabilityData>('/editor/availability')
}

export async function updateEditorAvailability(data: AvailabilityData): Promise<AvailabilityData> {
  return request<AvailabilityData>('/editor/availability', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Blocked dates (Phase 6) ──────────────────────────────────────────────────

export async function getEditorBlockedDates(): Promise<BlockedDate[]> {
  return request<BlockedDate[]>('/editor/blocked-dates')
}

export async function createEditorBlockedDate(payload: BlockedDatePayload): Promise<BlockedDate> {
  return request<BlockedDate>('/editor/blocked-dates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorBlockedDate(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/blocked-dates/${id}`, { method: 'DELETE' })
}

export async function getEditorPolicies(): Promise<BusinessPolicy> {
  return request<BusinessPolicy>('/editor/policies')
}

export async function updateEditorPolicies(data: Partial<BusinessPolicy>): Promise<BusinessPolicy> {
  return request<BusinessPolicy>('/editor/policies', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Account ─────────────────────────────────────────────────────────────────

export async function getEditorAccount(): Promise<AccountProfile> {
  return request<AccountProfile>('/editor/account')
}

export async function updateEditorAccount(payload: AccountUpdatePayload): Promise<AccountProfile> {
  return request<AccountProfile>('/editor/account', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  })
}

export async function changeEditorPassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/editor/account/password', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

export async function signOutEverywhere(): Promise<SignOutEverywhereResponse> {
  return request<SignOutEverywhereResponse>('/editor/account/sign-out-everywhere', {
    method: 'POST',
    body:   JSON.stringify({}),
  })
}

// ── Platform admin ──────────────────────────────────────────────────────────

export async function getAdminTenants(): Promise<AdminTenantsResponse> {
  return request<AdminTenantsResponse>('/admin/tenants')
}

export async function deleteAdminTenant(id: string, confirmSlug: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/tenants/${id}`, {
    method: 'DELETE',
    body:   JSON.stringify({ confirm_slug: confirmSlug }),
  })
}

export interface AdminStats {
  tenants_count:      number
  new_tenants_7d:     number
  active_tenants_7d:  number
  customers_count:    number
  verified_customers: number
  bookings_total:     number
  bookings_7d:        number
  computed_at:        string
}

export async function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats')
}

// ── Platform admin dashboard (Phase 1) ──────────────────────────────────────

export interface AdminDashboardSummary {
  kpis: {
    active_tenants:      number
    active_delta_7d:     number
    trial_tenants:       number
    trial_delta_7d:      number
    mrr_cents:           number
    mrr_delta_cents:     number
    new_signups_7d:      number
    new_signups_prev_7d: number
  }
  /** 12 weekly buckets; cents per plan. */
  mrr_series: { week: string; solo: number; studio: number; salon: number }[]
  /** 13 weekly buckets (~90d); exact from created_at. */
  growth_series: { week: string; signups: number; cumulative: number }[]
  activity: {
    ts:     string
    type:   string
    tenant: string
    plan:   string | null
    state:  string | null
  }[]
  plan_catalog: Record<string, { label: string; monthly_cents: number }>
  computed_at: string
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  return request<AdminDashboardSummary>('/admin/dashboard/summary')
}

// ── Platform admin dashboard (Phase 2 — cross-tenant trends) ────────────────

export type ActivityTier = 'alive' | 'slowing' | 'dormant'

export interface AdminTenantTrendRow {
  id:              string
  plan:            string | null
  state:           string | null
  created_at:      string | null
  owner_name:      string | null
  owner_email:     string | null
  mrr_cents:       number
  bookings_total:  number
  bookings_30d:    number
  bookings_7d:     number
  last_booking_at: string | null
  tier:            ActivityTier
}

export interface AdminDashboardTrends {
  /** ISO date of the snapshot the data came from; null if none yet. */
  snapshot_date: string | null
  /** True when the latest snapshot predates yesterday (job missed a run). */
  stale: boolean
  platform: {
    bookings_total:      number
    bookings_30d:        number
    bookings_7d:         number
    active_tenant_count: number
    tenants_scanned:     number
    tenants_failed:      number
  } | null
  daily_bookings: { date: string; count: number }[]
  top_tenants:    { id: string; bookings_30d: number }[]
  heatmap:        { id: string; tier: ActivityTier; bookings_30d: number; last_booking_at: string | null }[]
  tenants:        AdminTenantTrendRow[]
  computed_at:    string
}

export async function getAdminDashboardTrends(): Promise<AdminDashboardTrends> {
  return request<AdminDashboardTrends>('/admin/dashboard/trends')
}

// ── Platform admin dashboard (Phase 3 — insights, health, detail) ───────────

export type InsightSeverity = 'good' | 'info' | 'warn'

export interface AdminInsight {
  id:       string
  severity: InsightSeverity
  title:    string
  detail:   string
  tenants:  string[]
}

export interface AdminDashboardInsights {
  insights:      AdminInsight[]
  snapshot_date: string | null
  computed_at:   string
}

export async function getAdminDashboardInsights(): Promise<AdminDashboardInsights> {
  return request<AdminDashboardInsights>('/admin/dashboard/insights')
}

export type HealthStatus = 'ok' | 'warn' | 'bad' | 'unknown'

/** Common envelope every probe returns from /admin/dashboard/health. */
export interface HealthProbe {
  status:   HealthStatus
  value:    string
  note:     string
  runbook?: string
  meta?:    Record<string, unknown>
}

export type HealthSectionKey = 'reliability' | 'background' | 'reachability' | 'deploy'

export interface AdminDashboardHealth {
  sections: Record<HealthSectionKey, Record<string, HealthProbe>>
  computed_at: string
}

export async function getAdminDashboardHealth(fresh = false): Promise<AdminDashboardHealth> {
  return request<AdminDashboardHealth>(`/admin/dashboard/health${fresh ? '?fresh=1' : ''}`)
}

export type AdminQuickAction = 'reprobe' | 'snapshot' | 'clear-cache'

export interface QuickActionResult { ok: boolean; note: string }

export async function runAdminAction(name: AdminQuickAction): Promise<QuickActionResult> {
  return request<QuickActionResult>(`/admin/dashboard/actions/${name}`, { method: 'POST' })
}

// ── System Health drill-downs ─────────────────────────────────────────────────

export interface ErrorGroup {
  level:        string
  class:        string
  message:      string
  count:        number
  latest_at:    string
  sample_trace: string
}

export interface AdminErrorReport {
  groups:      ErrorGroup[]
  histogram:   { hour: string; count: number }[]
  total:       number
  computed_at: string
}

export async function getAdminDashboardErrors(): Promise<AdminErrorReport> {
  return request<AdminErrorReport>('/admin/dashboard/errors')
}

export interface PendingJob {
  display_name: string
  attempts:     number
  pushed_at:    string | null
}

export interface FailedJob {
  uuid:         string
  connection:   string
  queue:        string
  display_name: string
  failed_at:    string
  exception:    string
  trace_head:   string
}

export interface AdminQueueReport {
  connection:          string
  depth:               number
  pending:             PendingJob[]
  failed:              FailedJob[]
  failed_table_exists: boolean
  computed_at:         string
}

export async function getAdminDashboardQueue(): Promise<AdminQueueReport> {
  return request<AdminQueueReport>('/admin/dashboard/queue')
}

export interface DeployEntry {
  commit:      string | null
  message:     string | null
  deployed_at: string | null
}

export interface AdminDeployReport {
  deploys:     DeployEntry[]
  note?:       string
  computed_at: string
}

export async function getAdminDashboardDeploys(): Promise<AdminDeployReport> {
  return request<AdminDeployReport>('/admin/dashboard/deploys')
}

export interface SparklinePoint {
  at:     string
  status: HealthStatus
  value:  number | null
}

export interface AdminHealthSparklines {
  probes:      Record<string, SparklinePoint[]>
  since:       string
  computed_at: string
}

export async function getAdminHealthSparklines(): Promise<AdminHealthSparklines> {
  return request<AdminHealthSparklines>('/admin/dashboard/health/sparklines')
}

export interface AdminTenantDetail {
  id:              string
  plan:            string | null
  state:           string | null
  created_at:      string | null
  trial_ends_at:   string | null
  domain:          string | null
  owner_name:      string | null
  owner_email:     string | null
  mrr_cents:       number
  bookings_total:  number
  bookings_30d:    number
  bookings_7d:     number
  last_booking_at: string | null
  daily_bookings:  { date: string; count: number }[]
  recent: {
    service_name:     string | null
    customer_name:    string | null
    status:           string | null
    payment_status:   string | null
    appointment_date: string | null
    created_at:       string | null
  }[]
  scan_ok:     boolean
  computed_at: string
}

export async function getAdminTenantDetail(slug: string): Promise<AdminTenantDetail> {
  return request<AdminTenantDetail>(`/admin/tenants/${slug}`)
}

// ── Platform announcements ──────────────────────────────────────────────────

/** Public-ish — any authed user can fetch active announcements for the
 *  dashboard. */
export async function getPlatformAnnouncements(): Promise<PlatformAnnouncement[]> {
  return request<PlatformAnnouncement[]>('/platform/announcements')
}

export async function getAdminAnnouncements(): Promise<PlatformAnnouncement[]> {
  return request<PlatformAnnouncement[]>('/admin/announcements')
}

export async function createAdminAnnouncement(
  payload: PlatformAnnouncementPayload,
): Promise<PlatformAnnouncement> {
  return request<PlatformAnnouncement>('/admin/announcements', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

export async function updateAdminAnnouncement(
  id: number,
  payload: PlatformAnnouncementPayload,
): Promise<PlatformAnnouncement> {
  return request<PlatformAnnouncement>(`/admin/announcements/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  })
}

export async function deleteAdminAnnouncement(id: number): Promise<{ deleted?: boolean }> {
  return request(`/admin/announcements/${id}`, { method: 'DELETE' })
}

// ── Settings: Notifications ─────────────────────────────────────────────────

export async function getEditorNotificationSettings(): Promise<NotificationSettings> {
  return request<NotificationSettings>('/editor/settings/notifications')
}

export async function updateEditorNotificationSettings(
  payload: NotificationSettingsPayload,
): Promise<NotificationSettings> {
  return request<NotificationSettings>('/editor/settings/notifications', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  })
}

/** Phase 17 — send a test email of the chosen template.
 *
 *  Defaults to the owner's account email when `to` is omitted; pass
 *  `to` (an arbitrary address) to preview how the email lands in a
 *  real client's inbox. Backend validates as a real email. */
export async function sendNotificationTestEmail(
  template: EmailTemplateKey,
  to?: string,
): Promise<{ message: string; sent_to: string }> {
  const payload: { template: EmailTemplateKey; to?: string } = { template }
  if (to && to.trim() !== '') payload.to = to.trim()
  return request<{ message: string; sent_to: string }>('/editor/settings/notifications/test-send', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// ── Settings: Bookings ──────────────────────────────────────────────────────

export async function getEditorBookingSettings(): Promise<BookingSettings> {
  return request<BookingSettings>('/editor/settings/bookings')
}

export async function updateEditorBookingSettings(
  payload: BookingSettingsPayload,
): Promise<BookingSettings> {
  return request<BookingSettings>('/editor/settings/bookings', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  })
}

// ── Settings: Payments ───────────────────────────────────────────────────────

export async function getEditorPaymentSettings(): Promise<PaymentSettings> {
  return request<PaymentSettings>('/editor/settings/payments')
}

export async function updateEditorPaymentSettings(
  payload: PaymentSettingsPayload,
): Promise<PaymentSettings> {
  return request<PaymentSettings>('/editor/settings/payments', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ── Settings: Stripe Connect (customer payments only) ──────────────────────

export async function startStripeConnect(): Promise<StripeConnectStartResponse> {
  return request<StripeConnectStartResponse>('/editor/settings/payments/connect/start', {
    method: 'POST',
    body:   JSON.stringify({}),
  })
}

export async function getStripeConnectStatus(): Promise<StripeConnectStatusResponse> {
  return request<StripeConnectStatusResponse>('/editor/settings/payments/connect/status')
}

export async function refreshStripeConnectOnboarding(): Promise<{ onboarding_url: string }> {
  return request<{ onboarding_url: string }>('/editor/settings/payments/connect/refresh', {
    method: 'POST',
    body:   JSON.stringify({}),
  })
}

export async function saveServices(data: TenantData['services']): Promise<void> {
  // TODO: real API call
  console.log('[api] saveServices stub', data)
}

export async function saveHours(data: TenantData['hours']): Promise<void> {
  // TODO: real API call
  console.log('[api] saveHours stub', data)
}

export async function saveStaff(data: TenantData['staff']): Promise<void> {
  // TODO: real API call
  console.log('[api] saveStaff stub', data)
}

export async function savePolicies(data: TenantData['policies']): Promise<void> {
  // TODO: real API call
  console.log('[api] savePolicies stub', data)
}

export async function saveGallery(data: TenantData['gallery']): Promise<void> {
  // TODO: real API call
  console.log('[api] saveGallery stub', data)
}

export async function getEditorAppointments(params?: {
  status?: string
  date_from?: string
  date_to?: string
  limit?: number
}): Promise<Appointment[]> {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  ).toString() : ''
  return request<Appointment[]>(`/editor/appointments${qs}`)
}

export async function createEditorAppointment(data: CreateAppointmentPayload): Promise<Appointment> {
  return request<Appointment>('/editor/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateEditorAppointment(id: number, data: UpdateAppointmentPayload): Promise<Appointment> {
  return request<Appointment>(`/editor/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteEditorAppointment(id: number): Promise<void> {
  await request(`/editor/appointments/${id}`, { method: 'DELETE' })
}

/**
 * Issue a refund on a paid appointment. `amount` omitted = refund the
 * full remaining refundable balance. Reason maps to Stripe's enum.
 */
export async function refundEditorAppointment(
  id: number,
  payload: RefundPayload = {},
): Promise<RefundResponse> {
  return request<RefundResponse>(`/editor/appointments/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Owner records a manual (cash / Venmo / Zelle / other) payment.
 * Rejects if the appointment already has a Stripe payment.
 */
export async function markEditorAppointmentPaid(
  id: number,
  payload: MarkPaidPayload,
): Promise<MarkPaidResponse> {
  return request<MarkPaidResponse>(`/editor/appointments/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Mints a one-shot Stripe Express dashboard URL. Open it in a new tab
 * immediately — the URL is single-use and expires in seconds.
 */
export async function getConnectDashboardLink(): Promise<ConnectDashboardLinkResponse> {
  return request<ConnectDashboardLinkResponse>('/editor/settings/payments/connect/dashboard-link')
}

/**
 * Download a Danger Zone CSV export. The endpoint uses
 * a cookie-authenticated fetch so the browser can save the CSV blob.
 */
export async function downloadEditorExport(
  type: 'appointments' | 'customers',
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}/editor/danger/export/${type}`, {
    credentials: 'include',
    headers: {
      Accept: 'text/csv',
    },
  })
  if (! res.ok) {
    const err = await res.json().catch(() => ({ message: 'Export failed' }))
    throw new Error(err.message ?? 'Export failed')
  }
  const disp = res.headers.get('Content-Disposition') ?? ''
  const match = disp.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `${type}.csv`
  const blob = await res.blob()
  return { blob, filename }
}

/**
 * Permanently delete the owner's tenant. Caller is responsible for
 * clearing local auth state + redirecting after a 200 response.
 */
export async function deleteEditorAccount(payload: {
  password: string
  confirm_slug: string
}): Promise<{ message: string }> {
  return request<{ message: string }>('/editor/danger/delete-account', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Sends the customer a Stripe Checkout link for the remaining balance
 * on this appointment, and returns the link itself so the owner can
 * also copy it manually. Each call mints a fresh Stripe session.
 */
export async function chargeEditorAppointmentBalance(
  id: number,
): Promise<ChargeBalanceResponse> {
  return request<ChargeBalanceResponse>(`/editor/appointments/${id}/charge-balance`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/**
 * Send the customer an email asking them to tip via the public tip page.
 */
export async function requestEditorAppointmentTip(
  id: number,
): Promise<RequestTipResponse> {
  return request<RequestTipResponse>(`/editor/appointments/${id}/request-tip`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/**
 * Charge the customer's saved card off_session for a no-show or
 * late-cancellation fee. Amount defaults to the per-tenant configured fee.
 */
export async function chargeEditorAppointmentLateFee(
  id: number,
  payload: ChargeLateFeePayload,
): Promise<ChargeLateFeeResponse> {
  return request<ChargeLateFeeResponse>(`/editor/appointments/${id}/charge-late-fee`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getEditorCustomers(params?: {
  search?: string
  limit?: number
}): Promise<Customer[]> {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : ''
  return request<Customer[]>(`/editor/customers${qs}`)
}

export async function createEditorCustomer(data: CustomerCreatePayload): Promise<Customer> {
  return request<Customer>('/editor/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateEditorCustomer(id: number, data: CustomerUpdatePayload): Promise<Customer> {
  return request<Customer>(`/editor/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Phase 13 — Customers CRM.
export async function getEditorCustomer(id: number): Promise<CustomerDetail> {
  return request<CustomerDetail>(`/editor/customers/${id}`)
}

/**
 * Phase 13 — flip a customer's VIP flag. Omitting `is_vip` toggles
 * the current value; passing it explicitly forces a state (useful when
 * the UI wants idempotent "set" behavior). Server re-derives status
 * after the write, so the returned Customer is ready to splice into
 * local state.
 */
export async function toggleEditorCustomerVip(
  id: number,
  isVip?: boolean,
): Promise<Customer> {
  return request<Customer>(`/editor/customers/${id}/toggle-vip`, {
    method: 'POST',
    body: JSON.stringify(isVip === undefined ? {} : { is_vip: isVip }),
  })
}

// Phase 15 — Payments ledger + Stripe payouts.
export async function getEditorPaymentsTransactions(params?: {
  search?: string
  filter?: 'all' | 'deposits' | 'paid' | 'refunded' | 'disputed' | 'failed'
  limit?:  number
}): Promise<PaymentTransactionsResponse> {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : ''
  return request<PaymentTransactionsResponse>(`/editor/payments/transactions${qs}`)
}

export async function getEditorPaymentsPayouts(limit = 25): Promise<StripePayoutsResponse> {
  return request<StripePayoutsResponse>(`/editor/payments/payouts?limit=${limit}`)
}

// Phase 14 — customer tag CRUD. Assignment lives on the customers
// PATCH (`tag_ids: number[]`) — these are the master-list operations.
export async function getEditorCustomerTags(): Promise<CustomerTag[]> {
  return request<CustomerTag[]>('/editor/customer-tags')
}
export async function createEditorCustomerTag(data: CustomerTagPayload): Promise<CustomerTag> {
  return request<CustomerTag>('/editor/customer-tags', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}
export async function updateEditorCustomerTag(
  id: number,
  data: Partial<CustomerTagPayload>,
): Promise<CustomerTag> {
  return request<CustomerTag>(`/editor/customer-tags/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  })
}
export async function deleteEditorCustomerTag(id: number): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/editor/customer-tags/${id}`, {
    method: 'DELETE',
  })
}

export async function getEditorStaff(params?: { active?: boolean }): Promise<ApiStaffMember[]> {
  const qs = params?.active ? '?active=1' : ''
  return request<ApiStaffMember[]>(`/editor/staff${qs}`)
}

export async function createEditorStaff(data: StaffMemberPayload): Promise<ApiStaffMember> {
  return request<ApiStaffMember>('/editor/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateEditorStaff(id: number, data: Partial<StaffMemberPayload>): Promise<ApiStaffMember> {
  return request<ApiStaffMember>(`/editor/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function archiveEditorStaff(id: number): Promise<ApiStaffMember> {
  return request<ApiStaffMember>(`/editor/staff/${id}`, { method: 'DELETE' })
}

// ── Staff hours (Phase 2) ────────────────────────────────────────────────────

export async function getEditorStaffHours(staffId: number): Promise<StaffHoursEntry[]> {
  return request<StaffHoursEntry[]>(`/editor/staff/${staffId}/hours`)
}

export async function updateEditorStaffHours(
  staffId: number,
  hours: StaffHoursEntry[],
): Promise<StaffHoursEntry[]> {
  return request<StaffHoursEntry[]>(`/editor/staff/${staffId}/hours`, {
    method: 'PATCH',
    body: JSON.stringify({ hours }),
  })
}

// ── Staff blocked dates (Phase 2) ────────────────────────────────────────────

export async function getEditorStaffBlockedDates(staffId: number): Promise<StaffBlockedDate[]> {
  return request<StaffBlockedDate[]>(`/editor/staff/${staffId}/blocked-dates`)
}

export async function createEditorStaffBlockedDate(
  staffId: number,
  payload: StaffBlockedDatePayload,
): Promise<StaffBlockedDate> {
  return request<StaffBlockedDate>(`/editor/staff/${staffId}/blocked-dates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorStaffBlockedDate(
  staffId: number,
  id: number,
): Promise<{ deleted?: boolean }> {
  return request(`/editor/staff/${staffId}/blocked-dates/${id}`, { method: 'DELETE' })
}

// ── Website / Template ────────────────────────────────────────────────────────

export async function getEditorTemplateSettings(): Promise<TemplateSettingsResponse> {
  return request<TemplateSettingsResponse>('/editor/website/template')
}

/**
 * Switch the tenant's ACTIVE template (the one that drives the public site).
 * Used by the post-signup checkout picker so the chosen template actually
 * sticks — provisioning seeds a default and the Stripe webhook only records
 * the pick in the central subscriptions table, so this PUT is what makes the
 * selection take effect on the tenant's site.
 */
export async function selectActiveTemplate(templateSlug: string): Promise<{ template_slug: string }> {
  return request<{ template_slug: string }>('/editor/website/template/active', {
    method: 'PUT',
    body: JSON.stringify({ template_slug: templateSlug }),
  })
}

export async function updateEditorTemplateSettings(
  settings: Partial<TemplateSettings>,
): Promise<TemplateSettingsResponse> {
  return request<TemplateSettingsResponse>('/editor/website/template', {
    method: 'PATCH',
    body: JSON.stringify({ settings }),
  })
}

export async function getEditorWebsiteSections(): Promise<WebsiteSection[]> {
  return request<WebsiteSection[]>('/editor/website/sections')
}

export async function createEditorWebsiteSection(
  payload: WebsiteSectionCreatePayload,
): Promise<WebsiteSection> {
  return request<WebsiteSection>('/editor/website/sections', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorWebsiteSection(
  id: number,
  payload: WebsiteSectionUpdatePayload,
): Promise<WebsiteSection> {
  return request<WebsiteSection>(`/editor/website/sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorWebsiteSection(id: number): Promise<{ deleted?: boolean } | WebsiteSection> {
  return request(`/editor/website/sections/${id}`, { method: 'DELETE' })
}

// ── Gallery items ────────────────────────────────────────────────────────────

export async function getEditorGallery(params?: { active?: boolean; category?: string }): Promise<GalleryItem[]> {
  const qs = new URLSearchParams()
  if (params?.active)   qs.set('active', '1')
  if (params?.category) qs.set('category', params.category)
  const suffix = qs.toString() ? `?${qs}` : ''
  return request<GalleryItem[]>(`/editor/gallery${suffix}`)
}

export async function createEditorGalleryItem(payload: GalleryItemPayload): Promise<GalleryItem> {
  return request<GalleryItem>('/editor/gallery', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorGalleryItem(id: number, payload: Partial<GalleryItemPayload>): Promise<GalleryItem> {
  return request<GalleryItem>(`/editor/gallery/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorGalleryItem(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/gallery/${id}`, { method: 'DELETE' })
}

// ── Gallery groups ───────────────────────────────────────────────────────────

export async function getEditorGalleryGroups(): Promise<GalleryGroup[]> {
  return request<GalleryGroup[]>('/editor/gallery/groups')
}

export async function createEditorGalleryGroup(payload: GalleryGroupPayload): Promise<GalleryGroup> {
  return request<GalleryGroup>('/editor/gallery/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorGalleryGroup(id: number, payload: Partial<GalleryGroupPayload>): Promise<GalleryGroup> {
  return request<GalleryGroup>(`/editor/gallery/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorGalleryGroup(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/gallery/groups/${id}`, { method: 'DELETE' })
}

// ── Before & After items ─────────────────────────────────────────────────────

export async function getEditorResults(params?: { active?: boolean; category?: string }): Promise<ResultsItem[]> {
  const qs = new URLSearchParams()
  if (params?.active)   qs.set('active', '1')
  if (params?.category) qs.set('category', params.category)
  const suffix = qs.toString() ? `?${qs}` : ''
  return request<ResultsItem[]>(`/editor/results${suffix}`)
}

export async function createEditorResultsItem(payload: ResultsItemPayload): Promise<ResultsItem> {
  return request<ResultsItem>('/editor/results', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorResultsItem(id: number, payload: Partial<ResultsItemPayload>): Promise<ResultsItem> {
  return request<ResultsItem>(`/editor/results/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorResultsItem(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/results/${id}`, { method: 'DELETE' })
}

// ── Before & After groups ────────────────────────────────────────────────────

export async function getEditorResultsGroups(): Promise<ResultsGroup[]> {
  return request<ResultsGroup[]>('/editor/results/groups')
}

export async function createEditorResultsGroup(payload: ResultsGroupPayload): Promise<ResultsGroup> {
  return request<ResultsGroup>('/editor/results/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorResultsGroup(id: number, payload: Partial<ResultsGroupPayload>): Promise<ResultsGroup> {
  return request<ResultsGroup>(`/editor/results/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorResultsGroup(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/results/groups/${id}`, { method: 'DELETE' })
}
