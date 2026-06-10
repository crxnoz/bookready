import { getPublicSite } from '@/lib/api'

/**
 * Per-tenant sitemap.xml served at {slug}.bkrdy.me/sitemap.xml.
 *
 * The tenant subdomain rewrite middleware turns
 *   https://lush.bkrdy.me/sitemap.xml
 * into
 *   /site/lush/sitemap.xml
 * which is exactly this route. Submit a single sitemap per tenant
 * in their Google Search Console property — each tenant subdomain
 * is its own SEO surface, so a per-tenant sitemap is the right
 * granularity.
 *
 * What's in the sitemap (intentionally narrow):
 *   - The subdomain root, with a high priority + weekly changefreq
 *
 * What's INTENTIONALLY excluded:
 *   - /manage/{token}, /tip/{token}, /request/{token},
 *     /waitlist/claim/{token} — these are private capability URLs
 *     gated by single-use tokens. Listing them would leak the tokens
 *     into search infrastructure and crawlers (separate from the
 *     noindex meta that the page-level metadata already sets).
 *   - /book or other secondary routes — not yet structured, would
 *     just dilute the root URL's link equity. Add explicit secondary
 *     URLs here when there's a content page worth indexing.
 *
 * Returns 404 for non-active sites (locked / coming_soon / 404)
 * because Google should not crawl them.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'

export const dynamic     = 'force-dynamic'
export const revalidate  = 3600 // 1 hour at the CDN; site changes are rare

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const site = await getPublicSite(params.slug).catch(() => null)
  if (! site || site.status !== 'active') {
    return new Response('Not found', { status: 404 })
  }

  const url = `https://${params.slug}.${BASE_DOMAIN}/`
  const now = new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      // Cache at the CDN for an hour. Tenants don't change their site
      // shape often, and crawlers don't re-fetch sitemaps within an
      // hour anyway. Owners who do change content force a re-crawl by
      // re-submitting the sitemap from Search Console.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

/** Minimal XML-attribute escape for the URL we emit. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
