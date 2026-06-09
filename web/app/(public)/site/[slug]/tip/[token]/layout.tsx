import type { Metadata } from 'next'

/**
 * The sibling page.tsx is `'use client'` and so cannot export
 * `metadata` itself. This thin layout exists solely to attach the
 * noindex + no-referrer headers that the token-gated tip URL needs.
 *
 * See manage/[token]/page.tsx for the full rationale: token in URL is
 * a single-use secret; indexing it leaks the token in SERPs, and
 * outbound links (Stripe iframe, redirects) leak it via Referer to
 * third parties without referrer no-referrer set.
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

export default function TipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
