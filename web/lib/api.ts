import {
  Appointment,
  AuthResponse,
  AuthUser,
  AvailabilityData,
  BillingCycle,
  BusinessPolicy,
  BusinessProfile,
  CheckoutResponse,
  CheckoutSessionData,
  CreateAppointmentPayload,
  Customer,
  HoursEntry,
  LoginPayload,
  PublicBookingPayload,
  PublicBookingResponse,
  PublicSite,
  RegisterPayload,
  Service,
  TenantData,
  UpdateAppointmentPayload,
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

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function getPublicSite(slug: string): Promise<PublicSite> {
  return request<PublicSite>(`/public/sites/${slug}`)
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

export async function getEditorCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/editor/customers')
}
