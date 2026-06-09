import type { Metadata } from 'next'
import WaitlistClaimPage from '@/components/public-site/WaitlistClaimPage'

export const dynamic = 'force-dynamic'

/** Token-gated. See manage/[token]/page.tsx for the rationale. */
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
  return <WaitlistClaimPage slug={params.slug} token={params.token} />
}
