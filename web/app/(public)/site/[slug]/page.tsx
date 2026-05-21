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

        {site.services && site.services.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 12 }}>
              Services
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {site.services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 14px', border: '1px solid rgba(18,18,18,0.08)', background: '#F8F6F2' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#121212', marginBottom: 2 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 11, color: '#6B7280' }}>{s.description}</p>}
                    {s.category && <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{s.category}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#121212' }}>${Number(s.price).toFixed(2)}</p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>{s.duration_minutes} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {site.hours && site.hours.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 12 }}>
              Hours
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[...site.hours.filter(h => h.day_of_week !== 0), ...site.hours.filter(h => h.day_of_week === 0)].map(h => (
                <div key={h.day_of_week} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(18,18,18,0.06)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#121212' }}>{h.day_name}</span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    {h.is_open && h.open_time && h.close_time
                      ? `${h.open_time} – ${h.close_time}`
                      : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
