/** @type {import('next').NextConfig} */

// Phase S5 — security headers.
//
// Why per-route: the editor at app.bkrdy.me needs to load Stripe.js,
// Google sign-in, and other third-party scripts. The public tenant
// sites at /site/{slug} don't, so they get a tighter CSP.
//
// CSP notes:
//   - script-src includes 'unsafe-inline' because Next.js inlines its
//     hydration runtime. Removing it requires per-page nonces, which is
//     a separate refactor. The bigger XSS gains come from safeHref
//     (Phase S2) blocking javascript: URLs at render time anyway.
//   - connect-src is restricted to the BookReady API so any future XSS
//     can't exfil to an arbitrary domain.
//   - frame-ancestors blocks clickjacking. We never embed tenant sites.
const PUBLIC_SITE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.bkrdy.me https://*.bkrdy.me",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.bkrdy.me",
  "object-src 'none'",
].join('; ')

const COMMON_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options',        value: 'DENY' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Public tenant sites — strictest policy.
        source: '/site/:path*',
        headers: [
          ...COMMON_HEADERS,
          { key: 'Content-Security-Policy', value: PUBLIC_SITE_CSP },
        ],
      },
      {
        // Everything else (editor, auth pages) — common hardening
        // headers but no CSP, so Stripe / Google / etc. keep working.
        source: '/:path*',
        headers: COMMON_HEADERS,
      },
    ]
  },
}

export default nextConfig
