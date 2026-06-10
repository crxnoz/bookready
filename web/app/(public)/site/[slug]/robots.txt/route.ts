/**
 * Per-tenant robots.txt served at {slug}.bkrdy.me/robots.txt.
 *
 * Belt-and-suspenders with the page-level noindex metadata on token
 * routes:
 *   - The Disallow lines tell well-behaved crawlers to skip the path
 *     entirely (they never fetch the URL, so no risk of token logging
 *     in crawler-side analytics).
 *   - The page-level <meta name="robots" content="noindex,..."> tells
 *     crawlers that DO fetch the URL anyway (some adversarial bots
 *     ignore robots.txt) to drop it from the index.
 *
 * The Sitemap line points crawlers at the per-tenant sitemap. Google
 * also picks up sitemaps submitted manually via Search Console; the
 * Sitemap directive here is a redundant signal that helps niche
 * crawlers (DuckDuckGo, Bing, Yandex) find it without manual submit.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'

export const dynamic    = 'force-dynamic'
export const revalidate = 86400 // 24h — robots.txt rarely changes

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const base = `https://${params.slug}.${BASE_DOMAIN}`

  // Order matters for some crawlers: User-agent + group rules first,
  // Sitemap line at the bottom is the universal convention.
  const robots = `User-agent: *
Allow: /
Disallow: /manage/
Disallow: /tip/
Disallow: /request/
Disallow: /waitlist/

Sitemap: ${base}/sitemap.xml
`

  return new Response(robots, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
