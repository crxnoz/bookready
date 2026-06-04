// Phase 4 of the customer-accounts feature — typed wrappers for the
// /api/v1/customer/* surface.
//
// Same request() shape as web/lib/api.ts (owner side) but rooted under
// /customer. Always credentials: 'include' so the browser sends the
// bookready_customer_token cookie cross-origin from app.bkrdy.me to
// api.bkrdy.me, and so Set-Cookie responses are honored. (Same lesson
// we learned the hard way with GoogleCompletePage in commit 1b9c924.)

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/customer${path}`, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const e: Error & { status?: number; code?: string } = new Error(
      (err && err.message) || 'Request failed',
    )
    e.status = res.status
    if (err && typeof err.code === 'string') e.code = err.code
    throw e
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id:                number
  name:              string
  email:             string
  phone:             string | null
  email_verified_at: string | null
  created_at?:       string
  updated_at?:       string
}

export interface CustomerBookingRow {
  tenant_id:                string
  business_name:            string
  id:                       number
  service_name:             string
  service_duration_minutes: number | null
  service_price:            number | null
  appointment_date:         string
  start_time:               string
  end_time:                 string
  status:                   string
  created_at:               string
}

export interface CustomerBookingDetail extends CustomerBookingRow {
  customer_name:              string
  customer_email:             string | null
  customer_phone:             string | null
  notes:                      string | null
  is_terminal:                boolean
  hours_until_appointment:    number
  can_cancel:                 boolean
  can_reschedule:             boolean
  cancellation_window_hours:  number
  reschedule_window_hours:    number
}

export interface ClaimPreview {
  email:           string
  already_account: boolean
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function customerLogin(payload: { email: string; password: string }): Promise<{ user: CustomerProfile }> {
  return request<{ user: CustomerProfile }>('/auth/login', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

export async function customerRegister(payload: {
  name: string
  email: string
  password: string
  password_confirmation: string
  phone?: string
  /**
   * #161: Cloudflare Turnstile token. Optional in TS because the
   * in-booking auth modals (LushCustomerAuth, TfrCustomerAuth) don't
   * render the widget — adding CAPTCHA mid-booking tanks conversions.
   * Standalone /account/register DOES pass it; backend middleware
   * is currently NOT enforcing it on this endpoint (see api.php
   * comment on /customer/auth/register). When the in-booking modal
   * is rebuilt (#159/#160) we'll either add the widget there or
   * accept the gap.
   */
  turnstile_token?: string
}): Promise<{ user: CustomerProfile }> {
  return request<{ user: CustomerProfile }>('/auth/register', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

export async function customerLogout(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' })
}

export async function customerMe(): Promise<CustomerProfile> {
  return request<CustomerProfile>('/auth/me')
}

/** #161: turnstileToken from the widget on /account/forgot-password. */
export async function customerForgotPassword(email: string, turnstileToken: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/password/forgot', {
    method: 'POST',
    body:   JSON.stringify({ email, turnstile_token: turnstileToken }),
  })
}

export async function customerResetPassword(payload: {
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

export async function customerResendVerification(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/verify-email/resend', { method: 'POST' })
}

// ── Claim ────────────────────────────────────────────────────────────────────

export async function claimPreview(token: string): Promise<ClaimPreview> {
  return request<ClaimPreview>(`/claim/preview/${encodeURIComponent(token)}`)
}

export async function claimBooking(payload: {
  token:                 string
  password:              string
  password_confirmation: string
  name?:                 string
}): Promise<{ user: CustomerProfile; linked_count: number }> {
  return request<{ user: CustomerProfile; linked_count: number }>('/claim', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export async function listCustomerBookings(): Promise<CustomerBookingRow[]> {
  return request<CustomerBookingRow[]>('/bookings')
}

export async function getCustomerBooking(tenantSlug: string, id: number): Promise<CustomerBookingDetail> {
  return request<CustomerBookingDetail>(`/bookings/${tenantSlug}/${id}`)
}

export async function cancelCustomerBooking(tenantSlug: string, id: number): Promise<{ message: string; status: string }> {
  return request<{ message: string; status: string }>(`/bookings/${tenantSlug}/${id}/cancel`, {
    method: 'POST',
  })
}

export async function rescheduleCustomerBooking(
  tenantSlug: string,
  id:         number,
  date:       string,
  startTime:  string,
): Promise<{ message: string; appointment_date: string; start_time: string; end_time: string }> {
  return request('/bookings/' + tenantSlug + '/' + id + '/reschedule', {
    method: 'POST',
    body:   JSON.stringify({ appointment_date: date, start_time: startTime }),
  })
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getCustomerProfile(): Promise<CustomerProfile> {
  return request<CustomerProfile>('/profile')
}

export async function updateCustomerProfile(payload: { name?: string; phone?: string | null }): Promise<CustomerProfile> {
  return request<CustomerProfile>('/profile', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  })
}

export async function updateCustomerEmail(email: string): Promise<CustomerProfile> {
  return request<CustomerProfile>('/profile/email', {
    method: 'PATCH',
    body:   JSON.stringify({ email }),
  })
}

export async function changeCustomerPassword(payload: {
  current_password:      string
  new_password:          string
  new_password_confirmation: string
}): Promise<{ message: string; revoked_count: number }> {
  return request('/profile/password', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// ── Danger Zone (Phase 6) ────────────────────────────────────────────────────

/**
 * Downloads a JSON dump of the customer's profile + bookings across
 * every linked tenant. Uses raw fetch (not the request() helper)
 * because we want the Blob, not a parsed JSON body — the response
 * is also delivered as JSON but with Content-Disposition: attachment
 * so we can save it to disk.
 */
export async function exportCustomerData(): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}/customer/danger/export`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err && err.message) || 'Export failed')
  }
  const disp = res.headers.get('Content-Disposition') ?? ''
  const match = disp.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `bookready-export-${new Date().toISOString().slice(0, 10)}.json`
  const blob = await res.blob()
  return { blob, filename }
}

export async function deleteCustomerAccount(password: string): Promise<{
  message:          string
  unlinked_clients: number
  unlinked_tenants: number
}> {
  return request('/danger/delete-account', {
    method: 'POST',
    body:   JSON.stringify({ password }),
  })
}
