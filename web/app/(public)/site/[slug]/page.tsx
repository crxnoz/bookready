export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: `${params.slug} — BookReady` }
}

export default function PublicSitePage({ params }: { params: { slug: string } }) {
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'daysbookings.site'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F6F2',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          padding: '48px 32px',
          background: '#fff',
          border: '1px solid rgba(18,18,18,0.10)',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 24,
          }}
        >
          BookReady — Public Site
        </p>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#121212',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          {params.slug}
        </h1>

        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>
          {params.slug}.{baseDomain}
        </p>

        <div
          style={{
            padding: '16px 20px',
            background: '#F8F6F2',
            borderLeft: '3px solid #121212',
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 12, color: '#121212', fontWeight: 600, marginBottom: 4 }}>
            Public site placeholder
          </p>
          <p style={{ fontSize: 12, color: '#6B7280' }}>
            This will render the tenant&apos;s selected booking website template once
            templates and tenant data fetching are wired up.
          </p>
        </div>

        <p style={{ fontSize: 11, color: '#b0a99f' }}>
          {/* TODO: fetch real tenant data from GET /api/v1/public/sites/{slug} */}
          Tenant data will be loaded from the API when the public endpoint is ready.
        </p>
      </div>
    </div>
  )
}
