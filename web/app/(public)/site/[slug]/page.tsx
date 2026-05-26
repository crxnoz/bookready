import { getPublicSite } from '@/lib/api'
import { PublicSite } from '@/lib/types'
import { resolveTemplate } from '@/templates/registry'
import PublicBookingForm from '@/components/public/PublicBookingForm'
import SiteLockScreen from '@/components/public/SiteLockScreen'
import SiteComingSoonScreen from '@/components/public/SiteComingSoonScreen'

export const dynamic = 'force-dynamic'

interface Props {
  params:       { slug: string }
  searchParams: { unlock?: string }
}

export async function generateMetadata({ params, searchParams }: Props) {
  const site = await getPublicSite(params.slug, searchParams?.unlock).catch(() => null)
  if (!site) return { title: 'Not Found — BookReady' }
  return { title: `${site.business_name ?? site.slug} — BookReady` }
}

export default async function PublicSitePage({ params, searchParams }: Props) {
  // Phase S1 — pass the unlock token (if any) through to the API. The
  // server validates it before returning the full payload.
  const site = await getPublicSite(params.slug, searchParams?.unlock).catch((): null => null)
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'

  if (!site) return <NotFound slug={params.slug} baseDomain={baseDomain} />

  // Phase S1 — privacy gate. When the API returns a non-active status
  // we render a dedicated screen and never touch the template.
  if (site.status === 'coming_soon') {
    return <SiteComingSoonScreen businessName={site.business_name ?? null} slug={params.slug} />
  }
  if (site.status === 'locked') {
    return (
      <SiteLockScreen
        slug={params.slug}
        businessName={site.business_name ?? null}
        hasPassword={!! site.has_password}
      />
    )
  }

  const loader = resolveTemplate(site)
  if (loader) {
    const { default: Template } = await loader()
    return <Template site={site} slug={params.slug} />
  }

  return <DefaultSitePage site={site} slug={params.slug} baseDomain={baseDomain} />
}

// ── Fallback default template ─────────────────────────────────────────────────

function DefaultSitePage({ site, slug, baseDomain }: { site: PublicSite; slug: string; baseDomain: string }) {
  const p = site.profile
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  const services = site.services ?? []

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>BookReady</p>
        <h1 style={styles.heading}>{displayName}</h1>
        {p?.tagline && (
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>{p.tagline}</p>
        )}
        <p style={styles.subdomain}>{site.slug}.{baseDomain}</p>

        {(p?.public_phone || p?.public_email || p?.address_line) && (
          <dl style={{ ...styles.meta, marginBottom: 28 }}>
            {p?.public_phone && <MetaRow label="Phone"   value={p.public_phone} />}
            {p?.public_email && <MetaRow label="Email"   value={p.public_email} />}
            {p?.address_line && (
              <MetaRow
                label="Address"
                value={[p.address_line, p.city, p.state, p.zip].filter(Boolean).join(', ')}
              />
            )}
          </dl>
        )}

        {services.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Services</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.map(s => (
                <div key={s.id} style={styles.serviceRow}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#121212', marginBottom: 2 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 11, color: '#6B7280' }}>{s.description}</p>}
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

        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Request a Booking</SectionLabel>
          <PublicBookingForm slug={slug} services={services} />
        </div>

        {site.hours && site.hours.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Hours</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[...site.hours.filter(h => h.day_of_week !== 0), ...site.hours.filter(h => h.day_of_week === 0)].map(h => (
                <div key={h.day_of_week} style={styles.hoursRow}>
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

        {site.staff && site.staff.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Our Team</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {site.staff.map(s => (
                <div key={s.id} style={styles.staffRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.bio ? 6 : 0 }}>
                    <div style={styles.staffAvatar}>
                      {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#121212' }}>{s.name}</p>
                      {s.role && <p style={{ fontSize: 11, color: '#6B7280' }}>{s.role}</p>}
                    </div>
                  </div>
                  {s.bio && (
                    <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginLeft: 42 }}>
                      {s.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {site.policies && ([
          ['Cancellation Policy', site.policies.cancellation_policy],
          ['Late Arrival Policy', site.policies.late_policy],
          ['No-Show Policy',      site.policies.no_show_policy],
          ['Deposit Policy',      site.policies.deposit_policy],
          ['Reschedule Policy',   site.policies.reschedule_policy],
          ['Additional Notes',    site.policies.extra_notes],
        ] as [string, string | null][]).some(([, v]) => v) && (
          <div>
            <SectionLabel>Policies</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['Cancellation Policy', site.policies.cancellation_policy],
                ['Late Arrival Policy', site.policies.late_policy],
                ['No-Show Policy',      site.policies.no_show_policy],
                ['Deposit Policy',      site.policies.deposit_policy],
                ['Reschedule Policy',   site.policies.reschedule_policy],
                ['Additional Notes',    site.policies.extra_notes],
              ] as [string, string | null][]).filter(([, v]) => v).map(([label, text]) => (
                <div key={label}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#121212', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'pre-wrap' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: '#6B7280', marginBottom: 12,
    }}>
      {children}
    </p>
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

function NotFound({ slug, baseDomain }: { slug: string; baseDomain: string }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>BookReady</p>
        <h1 style={{ ...styles.heading, fontSize: 20 }}>Site not found</h1>
        <p style={styles.subdomain}>{slug}.{baseDomain}</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 16 }}>
          No booking site exists at this address yet.
        </p>
      </div>
    </div>
  )
}

// ── Default styles ────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center',
    background: '#F8F6F2', fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '40px 16px',
  } as React.CSSProperties,
  card: {
    maxWidth: 520, width: '100%', padding: '48px 36px',
    background: '#fff', border: '1px solid rgba(18,18,18,0.10)',
    alignSelf: 'flex-start',
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
    textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 20,
  } as React.CSSProperties,
  heading: {
    fontSize: 26, fontWeight: 700, color: '#121212',
    letterSpacing: '-0.02em', marginBottom: 6,
  } as React.CSSProperties,
  subdomain: { fontSize: 13, color: '#6B7280', marginBottom: 28 } as React.CSSProperties,
  meta: { margin: 0, padding: 0 } as React.CSSProperties,
  serviceRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '10px 14px', border: '1px solid rgba(18,18,18,0.08)', background: '#F8F6F2',
  } as React.CSSProperties,
  hoursRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '7px 0', borderBottom: '1px solid rgba(18,18,18,0.06)',
  } as React.CSSProperties,
  staffRow: {
    padding: '12px 14px', border: '1px solid rgba(18,18,18,0.08)', background: '#F8F6F2',
  } as React.CSSProperties,
  staffAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: '#E8D5C4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#121212', flexShrink: 0,
  } as React.CSSProperties,
}
