const PRIMARY_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'

// Support both the primary domain and the legacy staging domain simultaneously.
// This lets tenant subdomains on either domain resolve correctly in middleware.
const BASE_DOMAINS = Array.from(new Set([PRIMARY_DOMAIN, 'daysbookings.site']))

const RESERVED = new Set(['app', 'api', 'www'])

export type HostType =
  | { kind: 'app' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'unknown' }

export function parseHost(host: string | null): HostType {
  if (!host) return { kind: 'app' }

  // Strip port (e.g. localhost:3000)
  const hostname = host.split(':')[0]

  // Local dev — treat as app
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { kind: 'app' }
  }

  for (const baseDomain of BASE_DOMAINS) {
    if (hostname !== baseDomain && !hostname.endsWith(`.${baseDomain}`)) continue

    const subdomain =
      hostname === baseDomain
        ? ''
        : hostname.slice(0, hostname.length - baseDomain.length - 1)

    // Bare domain or reserved subdomain → app shell
    if (!subdomain || RESERVED.has(subdomain)) {
      return { kind: 'app' }
    }

    return { kind: 'tenant', slug: subdomain }
  }

  return { kind: 'unknown' }
}
