const BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'daysbookings.site'

// Subdomains that belong to the app itself, not tenants
const RESERVED = new Set(['app', 'api', 'www'])

export type HostType =
  | { kind: 'app' }         // app.daysbookings.site or localhost
  | { kind: 'tenant'; slug: string }  // the-fade-room.daysbookings.site
  | { kind: 'unknown' }

export function parseHost(host: string | null): HostType {
  if (!host) return { kind: 'app' }

  // Strip port (e.g. localhost:3000)
  const hostname = host.split(':')[0]

  // Local dev — treat as app
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { kind: 'app' }
  }

  // Must end with the base domain
  if (!hostname.endsWith(`.${BASE_DOMAIN}`) && hostname !== BASE_DOMAIN) {
    return { kind: 'unknown' }
  }

  const subdomain = hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1)

  // No subdomain (bare domain) or reserved subdomain -> treat as app
  if (!subdomain || RESERVED.has(subdomain)) {
    return { kind: 'app' }
  }

  return { kind: 'tenant', slug: subdomain }
}
