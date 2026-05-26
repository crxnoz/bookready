/**
 * Phase S1 — public "coming soon" page.
 *
 * Shown when the API responds with status: 'coming_soon'. No template
 * data is returned for these sites; just the business name.
 */
import { Sparkles } from 'lucide-react'

export default function SiteComingSoonScreen({
  businessName,
  slug,
}: {
  businessName: string | null
  slug:         string
}) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.iconWrap}>
          <Sparkles size={20} strokeWidth={1.8} />
        </span>
        <p style={styles.eyebrow}>Coming soon</p>
        <h1 style={styles.heading}>{businessName ?? slug}</h1>
        <p style={styles.body}>
          We&apos;re putting the finishing touches on the booking site.
          Check back soon to book your appointment.
        </p>
        <p style={styles.footer}>Booking system by BookReady</p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F8F6F2', fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '40px 16px',
  } as React.CSSProperties,
  card: {
    maxWidth: 440, width: '100%', padding: '40px 32px',
    background: '#fff', border: '1px solid rgba(18,18,18,0.10)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  iconWrap: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, background: '#FFE5F0',
    border: '1px solid rgba(255,61,190,0.30)', color: '#b8197f', marginBottom: 18,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 8,
  } as React.CSSProperties,
  heading: {
    fontSize: 24, fontWeight: 700, color: '#121212',
    letterSpacing: '-0.02em', margin: '0 0 14px',
  } as React.CSSProperties,
  body: { fontSize: 13, color: '#3A3A3A', lineHeight: 1.55, margin: 0 } as React.CSSProperties,
  footer: {
    fontSize: 10, color: '#9AA0A6', marginTop: 28, letterSpacing: '0.08em',
  } as React.CSSProperties,
}
