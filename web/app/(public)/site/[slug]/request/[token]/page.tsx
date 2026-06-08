import AvailabilityRequestPage from '@/components/public-site/AvailabilityRequestPage'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string; token: string } }) {
  return <AvailabilityRequestPage slug={params.slug} token={params.token} />
}
