import { getPublicSite } from '@/lib/api'
import { PublicSite } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const site = await getPublicSite(params.slug).catch(() => null)
  if (!site) return { title: 'Not Found — BookReady' }
  return { title: `${site.business_name ?? site.slug} — BookReady` }
}

export default async function PublicSitePage({ params }: Props) {
  const site = await getPublicSite(params.slug).catch((): null => null)
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'daysbookings.site'

  if (!site) return <NotFound slug={params.slug} baseDomain={baseDomain} />

  return <Placeholder site={site} baseDomain={baseDomain} />
}

function Placeholder({ site, baseDomain }: { site: PublicSite; baseDomain: string }) {
  const p = site.profile
  const displayName = p?.business_name ?? site.business_name ?? site.slug

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>BookReady — Public Site</p>

        <h1 style={styles.heading}>{displayName}</h1>

        {p?.tagline && (
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>{p.tagline}</p>
        )}

        <p style={styles.subdomain}>
          {site.slug}.{baseDomain}
        </p>

        {p?.business_type && (
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>{p.business_type}</p>
        )}

        <div style={styles.notice}>
          <p style={styles.noticeTitle}>Public site placeholder</p>
          <p style={styles.noticeBody}>
            This will render the tenant&apos;s selected booking website template once
            templates are built and wired up.
          </p>
        </div>

        <dl style={styles.meta}>
          {p?.public_phone && <MetaRow label="Phone" value={p.public_phone} />}
          {p?.public_email && <MetaRow label="Email" value={p.public_email} />}
          {p?.address_line && (
            <MetaRow
              label="Address"
              value={[p.address_line, p.city, p.state, p.zip].filter(Boolean).join(', ')}
            />
          )}
          {p?.instagram_url && <MetaRow label="Instagram" value={p.instagram_url} />}
          <MetaRow label="Tenant ID" value={site.tenant_id} />
          <MetaRow label="Domain" value={site.domain ?? '—'} />
          <MetaRow label="Plan" value={site.plan} />
          <MetaRow label="Status" value={site.status} />
        </dl>
      </div>
    </div>
  )
}

function NotFound({ slug, baseDomain }: { slug: string; baseDomain: string }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>BookReady</p>
        <h1 style={{ ...styles.heading, fontSize: 20 }}>Site not found</h1>
        <p style={styles.subdomain}>
          {slug}.{baseDomain}
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 16 }}>
          No booking site exists at this address yet.
        </p>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(18,18,18,0.06)' }}>
      <dt style={{ fontSize: 11, color: '#6B7280', width: 80, flexShrink: 0 }}>{label}</dt>
      <dd style={{ fontSize: 11, color: '#121212', fontWeight: 600 }}>{value}</dd>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F8F6F2',
    fontFamily: 'system-ui, sans-serif',
    padding: '32px 16px',
  } as React.CSSProperties,
  card: {
    maxWidth: 480,
    width: '100%',
    padding: '48px 32px',
    background: '#fff',
    border: '1px solid rgba(18,18,18,0.10)',
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#6B7280',
    marginBottom: 20,
  } as React.CSSProperties,
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: '#121212',
    letterSpacing: '-0.02em',
    marginBottom: 6,
  } as React.CSSProperties,
  subdomain: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 28,
  } as React.CSSProperties,
  notice: {
    padding: '14px 18px',
    background: '#F8F6F2',
    borderLeft: '3px solid #121212',
    marginBottom: 24,
  } as React.CSSProperties,
  noticeTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#121212',
    marginBottom: 4,
  } as React.CSSProperties,
  noticeBody: {
    fontSize: 12,
    color: '#6B7280',
  } as React.CSSProperties,
  meta: {
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
}
