import {
  ApiStaffMember,
  Appointment,
  AuthResponse,
  AuthUser,
  AvailabilityData,
  AvailableSlot,
  BillingCycle,
  BusinessPolicy,
  BusinessProfile,
  CheckoutResponse,
  CheckoutSessionData,
  CreateAppointmentPayload,
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
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
  BeforeAfterItem,
  BeforeAfterItemPayload,
  GalleryItem,
  GalleryItemPayload,
  AccountProfile,
  AccountUpdatePayload,
  AdminTenantsResponse,
  BookingSettings,
  BookingSettingsPayload,
  ChangePasswordPayload,
  NotificationSettings,
  NotificationSettingsPayload,
  SignOutEverywhereResponse,
  PaymentSettings,
  PaymentSettingsPayload,
  StripeConnectStartResponse,
  StripeConnectStatusResponse,
  Service,
  StaffMemberPayload,
  TemplateSettings,
  TemplateSettingsResponse,
  TenantData,
  UpdateAppointmentPayload,
  WebsiteSection,
  WebsiteSectionCreatePayload,
  WebsiteSectionUpdatePayload,
} from './types'
import { getToken } from './auth'
import { mockTenant } from './mockTenant'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options
  const resolvedToken = token ?? getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Request failed')
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
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/google/complete-signup', {
    method: 'POST',
    body: JSON.stringify(payload),
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

export type UploadKind = 'gallery' | 'before_after' | 'header' | 'logo' | 'about'

export interface UploadResponse {
  url: string
  key: string
  bytes: number
}

export async function uploadEditorImage(file: File, kind: UploadKind): Promise<UploadResponse> {
  const token = getToken()
  const form  = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  const res = await fetch(`${API_BASE}/editor/uploads`, {
    method:  'POST',
    body:    form,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Upload failed')
  }
  return res.json() as Promise<UploadResponse>
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

// ── Password reset (public — no auth) ───────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/password/forgot', {
    method: 'POST',
    body:   JSON.stringify({ email }),
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

export async function getPublicSite(slug: string): Promise<PublicSite> {
  // cache: 'no-store' so SSR always sees the latest template_settings + sections
  // (the public/site route is force-dynamic but Next's fetch-level cache must
  // also be disabled to actually re-fetch from the API on every request).
  return request<PublicSite>(`/public/sites/${slug}`, { cache: 'no-store' })
}

export async function getPublicAvailability(
  slug: string,
  serviceId: number,
  date: string,
): Promise<PublicAvailabilityResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const qs   = new URLSearchParams({ service_id: String(serviceId), date }).toString()
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
  const res = await fetch(`${base}/public/sites/${slug}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
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

export async function createCheckoutSession(
  billingCycle: BillingCycle,
  templateSlug: string,
): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ billing_cycle: billingCycle, template_slug: templateSlug }),
  })
}

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionData> {
  return request<CheckoutSessionData>(`/billing/checkout-session/${sessionId}`)
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
 * Build a download URL for a Danger Zone CSV export. The endpoint requires
 * an Authorization header, so we can't just window.open it — we need to
 * fetch with the token and trigger a blob download on the client.
 */
export async function downloadEditorExport(
  type: 'appointments' | 'customers',
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken()
  if (! token) throw new Error('Not authenticated.')
  const res = await fetch(`${API_BASE}/editor/danger/export/${type}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
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

// ── Website / Template ────────────────────────────────────────────────────────

export async function getEditorTemplateSettings(): Promise<TemplateSettingsResponse> {
  return request<TemplateSettingsResponse>('/editor/website/template')
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

// ── Before & After items ─────────────────────────────────────────────────────

export async function getEditorBeforeAfter(params?: { active?: boolean; category?: string }): Promise<BeforeAfterItem[]> {
  const qs = new URLSearchParams()
  if (params?.active)   qs.set('active', '1')
  if (params?.category) qs.set('category', params.category)
  const suffix = qs.toString() ? `?${qs}` : ''
  return request<BeforeAfterItem[]>(`/editor/before-after${suffix}`)
}

export async function createEditorBeforeAfterItem(payload: BeforeAfterItemPayload): Promise<BeforeAfterItem> {
  return request<BeforeAfterItem>('/editor/before-after', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEditorBeforeAfterItem(id: number, payload: Partial<BeforeAfterItemPayload>): Promise<BeforeAfterItem> {
  return request<BeforeAfterItem>(`/editor/before-after/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEditorBeforeAfterItem(id: number): Promise<{ deleted?: boolean }> {
  return request(`/editor/before-after/${id}`, { method: 'DELETE' })
}
