/** @type {import('next').NextConfig} */

// Phase S5 — security headers (updated for editor preview iframe).
//
// Per-host rules: the editor at app.bkrdy.me / app.daysbookings.site
// loads Stripe.js, Google sign-in, and other third-party scripts
// (APP_CSP) and must never be embedded (X-Frame-Options: DENY,
// CSP frame-ancestors 'none'). Public tenant sites at /site/{slug}
// (direct hits AND subdomain rewrites) get the tighter PUBLIC_SITE_CSP,
// with frame-ancestors allowing the editor to embed them in the
// website-preview iframe.
//
// CSP notes:
//   - script-src includes 'unsafe-inline' because Next.js inlines its
//     hydration runtime. Removing it requires per-page nonces, which
//     is a separate refactor. The bigger XSS gains come from safeHref
//     (Phase S2) blocking javascript: URLs at render time anyway.
//   - connect-src is restricted to the BookReady API so any future XSS
//     can't exfil to an arbitrary domain.
//   - PUBLIC_SITE_CSP frame-ancestors allows the editor (app.bkrdy.me /
//     app.daysbookings.site) to iframe tenant sites for the preview;
//     APP_CSP keeps frame-ancestors 'none' so the editor can never be
//     embedded anywhere.
//   - X-Frame-Options is applied only on editor hosts. Tenant
//     subdomains rely on CSP frame-ancestors instead — XFO doesn't
//     support domain whitelisting (only DENY / SAMEORIGIN).
const PUBLIC_SITE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.bkrdy.me",
  "frame-ancestors 'self' https://app.bkrdy.me https://app.daysbookings.site",
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
  // X-Frame-Options moved into per-host rules below — XFO can only
  // DENY or SAMEORIGIN, no whitelist support, so it can't sit
  // alongside the editor-embeds-tenants requirement.
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
        // Editor hosts (app.bkrdy.me / app.daysbookings.site) —
        // X-Frame-Options: DENY + APP_CSP (allows Stripe/Google).
        // No one should ever iframe the editor.
        source: '/:path*',
        has: [{ type: 'host', value: 'app\..+' }],
        headers: [
          ...COMMON_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: APP_CSP },
        ],
      },
      {
        // Direct /site/{slug} hits — strict CSP. frame-ancestors
        // allows the editor preview to embed.
        source: '/site/:path*',
        headers: [
          ...COMMON_HEADERS,
          { key: 'Content-Security-Policy', value: PUBLIC_SITE_CSP },
        ],
      },
      {
        // Tenant subdomains ({slug}.bkrdy.me) — middleware rewrites to
        // /site/{slug} internally, but headers() matches on the
        // incoming URL so this catch-all is what they hit. `missing`
        // excludes editor hosts so they don't get the tenant CSP.
        source: '/:path*',
        missing: [{ type: 'host', value: 'app\..+' }],
        headers: [
          ...COMMON_HEADERS,
          { key: 'Content-Security-Policy', value: PUBLIC_SITE_CSP },
        ],
      },
    ]
  },
}

export default nextConfig
