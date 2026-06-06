import { NextRequest, NextResponse } from 'next/server'
import { parseHost } from '@/lib/domain'

// bkrdy.me and www.bkrdy.me are the product domain. Their ROOT page used
// to serve a marketing-shaped homepage that duplicated mybookready.com
// (the actual marketing site), which made it feel like the platform had
// two home pages. Redirect just the apex `/` to mybookready.com so there's
// only one home page, while keeping every other path on bkrdy.me alive
// (login, register, /auth/google/complete, /register/complete, etc. — all
// whitelisted in GoogleAuthController::APP_BASES as valid app surfaces).
const APEX_HOMEPAGE_REDIRECT_HOSTS = new Set(['bkrdy.me', 'www.bkrdy.me'])
const MARKETING_HOME = 'https://mybookready.com'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')
  const hostname = (host ?? '').split(':')[0].toLowerCase()

  // Apex homepage → marketing site. Scoped to pathname === '/' so auth
  // flows on bkrdy.me keep working untouched.
  if (
    APEX_HOMEPAGE_REDIRECT_HOSTS.has(hostname) &&
    req.nextUrl.pathname === '/'
  ) {
    return NextResponse.redirect(MARKETING_HOME, 308)
  }

  const parsed = parseHost(host)

  if (parsed.kind === 'tenant') {
    const { slug } = parsed
    const url = req.nextUrl.clone()

    // Already on the /site/[slug] internal path — don't loop
    if (url.pathname.startsWith('/site/')) {
      return NextResponse.next()
    }

    // Rewrite tenant subdomain requests to the internal /site/[slug] route
    url.pathname = `/site/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // app.bkrdy.me, app.daysbookings.site, localhost: pass through normally
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files.
    // `templates/` excludes built-in template assets shipped under
    // web/public/templates/ — e.g. Bottega's terrazzo.jpg backdrop.
    // Without it, tenant subdomains rewrite the asset URL into the
    // tenant render flow and 404. (First surfaced when Bottega's
    // terrazzo PNG 404'd on bottega.bkrdy.me but loaded on app.bkrdy.me.)
    '/((?!_next/static|_next/image|favicon.ico|templates/).*)',
  ],
}
