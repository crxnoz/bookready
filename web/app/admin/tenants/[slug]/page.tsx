import AdminTenantDetailPage from '@/components/admin/AdminTenantDetailPage'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string } }) {
  return <AdminTenantDetailPage slug={params.slug} />
}
