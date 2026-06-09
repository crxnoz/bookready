import type { Metadata } from 'next'
import ManageBookingPage from '@/components/public-site/ManageBookingPage'

export const dynamic = 'force-dynamic'

/**
 * Token in URL. Two real risks if this surface is indexable:
 *   1. Search engine indexes the URL with the secret token (single-use
 *      cancel/reschedule grant), exposing it in SERPs.
 *   2. Outbound links from this page (Stripe iframe, "add to calendar",
 *      Google Maps) leak the token via Referer to the third party.
 *
 * Defence in depth: noindex (1) + referrer no-referrer (2) +
 * nosnippet/noarchive/noimageindex so any short-window crawl can't
 * leak the URL via cached snippets either.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nosnippet: true,
    noarchive: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      nosnippet: true,
      noarchive: true,
      noimageindex: true,
    },
  },
  referrer: 'no-referrer',
}

export default function Page({ params }: { params: { slug: string; token: string } }) {
  return <ManageBookingPage slug={params.slug} token={params.token} />
}
