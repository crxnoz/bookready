import WaitlistClaimPage from '@/components/public-site/WaitlistClaimPage'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string; token: string } }) {
  return <WaitlistClaimPage slug={params.slug} token={params.token} />
}
