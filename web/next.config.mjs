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
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.bkrdy.me",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.bkrdy.me",
  "object-src 'none'",
].join('; ')

const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.bkrdy.me https://api.stripe.com https://*.stripe.com https://accounts.google.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.bkrdy.me https://checkout.stripe.com",
  "object-src 'none'",
].join('; ')

const COMMON_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Cross-Origin-Opener-Policy — isolates the editor's browsing context
  // so a popup-opener relationship can't be abused for XS-Leaks or to
  // attack window.opener-aware features. 'same-origin' is the strictest
  // value that still works with our Google OAuth popup flow.
  { key: 'Cross-Origin-Opener-Policy',         value: 'same-origin' },
  // Cross-Origin-Resource-Policy — defense-in-depth against Spectre-class
  // leaks. 'same-site' lets api.bkrdy.me ↔ app.bkrdy.me ↔ {slug}.bkrdy.me
  // still load each other's assets while blocking cross-site embedders.
  { key: 'Cross-Origin-Resource-Policy',       value: 'same-site' },
  // X-Permitted-Cross-Domain-Policies — kills any legacy Flash/Adobe
  // crossdomain.xml lookup so a vestigial Flash client (or some bot
  // probing for it) cannot widen our cross-origin policy.
  { key: 'X-Permitted-Cross-Domain-Policies',  value: 'none' },
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
        // Everything else (editor, auth pages) gets the app CSP with
        // the payment and OAuth origins the product actually uses.
        source: '/:path*',
        headers: [
          ...COMMON_HEADERS,
          { key: 'Content-Security-Policy', value: APP_CSP },
        ],
      },
    ]
  },
}

export default nextConfig
