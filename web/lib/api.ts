/**
 * BookReady API client.
 * All functions are stubs that return mock data for now.
 * Replace the body of each function with real fetch() calls when the API is ready.
 *
 * Base URL reads from NEXT_PUBLIC_API_URL env var.
 */

import { AuthResponse, LoginPayload, RegisterPayload, TenantData } from './types'
import { mockTenant } from './mockTenant'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  // TODO: return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  console.log('[api] register stub', payload)
  return Promise.resolve({
    token: 'mock-token',
    tenant_id: 'the-fade-room',
    domain: 'the-fade-room.bookready.app',
    user: { id: 1, name: payload.owner_name, email: payload.email, tenant_id: 'the-fade-room', is_owner: true },
  })
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  // TODO: return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  console.log('[api] login stub', payload)
  return Promise.resolve({
    token: 'mock-token',
    tenant_id: 'the-fade-room',
    domain: 'the-fade-room.bookready.app',
    user: { id: 1, name: 'Demo Owner', email: payload.email, tenant_id: 'the-fade-room', is_owner: true },
  })
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function getPublicSite(slug: string): Promise<TenantData> {
  // TODO: return request<TenantData>(`/public/sites/${slug}`)
  console.log('[api] getPublicSite stub', slug)
  return Promise.resolve(mockTenant)
}

// ── Editor ────────────────────────────────────────────────────────────────────

export async function getEditorData(token: string): Promise<TenantData> {
  // TODO: return request<TenantData>('/editor/site', { token })
  console.log('[api] getEditorData stub', token)
  return Promise.resolve(mockTenant)
}

export async function saveBusiness(
  token: string,
  data: TenantData['business'],
): Promise<void> {
  // TODO: return request('/editor/business', { method: 'PATCH', token, body: JSON.stringify(data) })
  console.log('[api] saveBusiness stub', data)
}

export async function saveServices(
  token: string,
  data: TenantData['services'],
): Promise<void> {
  // TODO: real API calls
  console.log('[api] saveServices stub', data)
}

export async function saveHours(
  token: string,
  data: TenantData['hours'],
): Promise<void> {
  console.log('[api] saveHours stub', data)
}

export async function saveStaff(
  token: string,
  data: TenantData['staff'],
): Promise<void> {
  console.log('[api] saveStaff stub', data)
}

export async function savePolicies(
  token: string,
  data: TenantData['policies'],
): Promise<void> {
  console.log('[api] savePolicies stub', data)
}

export async function saveGallery(
  token: string,
  data: TenantData['gallery'],
): Promise<void> {
  console.log('[api] saveGallery stub', data)
}
