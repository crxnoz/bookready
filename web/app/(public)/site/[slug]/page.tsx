import { getPublicSite } from '@/lib/api'
import FadeRoomTemplate from '@/components/public-site/FadeRoomTemplate'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const data = await getPublicSite(params.slug).catch(() => null)
  if (!data) return { title: 'Not Found' }
  return {
    title: data.business.name,
    description: data.business.tagline,
  }
}

export default async function PublicSitePage({ params }: Props) {
  const data = await getPublicSite(params.slug).catch(() => null)
  if (!data) notFound()

  // Template router — extend here when more templates are added
  if (data.template === 'the-fade-room') {
    return <FadeRoomTemplate data={data} />
  }

  notFound()
}
