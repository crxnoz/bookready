import ManageBookingPage from '@/components/public-site/ManageBookingPage'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string; token: string } }) {
  return <ManageBookingPage slug={params.slug} token={params.token} />
}
