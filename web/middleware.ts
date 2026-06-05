import { NextRequest, NextResponse } from 'next/server'
import { parseHost } from '@/lib/domain'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')
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

  // app.daysbookings.site and localhost: pass through normally
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
