'use client'

import { useState, useRef } from 'react'
import PublicBookingForm from '@/components/public/PublicBookingForm'
import type { PublicSite, PublicStaffMember, Service } from '@/lib/types'

// ── Design tokens ─────────────────────────────────────────────────────────────

const PINK    = '#FF3DBE'
const BG      = '#0E1111'
const TEXT    = '#FFFFFF'
const MUTED   = '#9CA3AF'
const GLOW    = '0 0 4px rgba(255,7,169,1), 0 0 10px rgba(255,61,190,0.95), 0 0 26px rgba(255,61,190,0.75), 0 0 60px rgba(255,61,190,0.35)'
const CARD_BG = 'linear-gradient(180deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.01) 100%)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'booking' | 'services' | 'about' | 'team' | 'hours' | 'policies'

interface Profile {
  business_name?: string | null
  tagline?: string | null
  public_phone?: string | null
  public_email?: string | null
  address_line?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TheFadeRoomTemplate({ site, slug }: { site: PublicSite; slug: string }) {
  const p = site.profile as Profile | null
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  const services    = (site.services ?? []).filter((s: Service) => s.is_active)
  const staff       = (site.staff    ?? []) as PublicStaffMember[]
  const hours       = site.hours     ?? []
  const policies    = site.policies  ?? null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'booking',  label: 'Book'     },
    ...(services.length > 0 ? [{ id: 'services' as Tab, label: 'Services' }] : []),
    { id: 'about',    label: 'About'    },
    ...(staff.length  > 0   ? [{ id: 'team'     as Tab, label: 'Team'     }] : []),
    ...(hours.length  > 0   ? [{ id: 'hours'    as Tab, label: 'Hours'    }] : []),
    ...(policies            ? [{ id: 'policies' as Tab, label: 'Policies' }] : []),
  ]

  const [active, setActive] = useState<Tab>('booking')
  const tabRailRef = useRef<HTMLDivElement>(null)

  function goBook() {
    setActive('booking')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  const address = [p?.address_line, p?.city, p?.state, p?.zip].filter(Boolean).join(', ')

  return (
    <>
      <style>{TFR_CSS}</style>
      <div className="tfr-root">

        {/* ── Announcement bar ── */}
        <div className="tfr-announce" aria-hidden="true">
          <div className="tfr-announce-track">
            <AnnounceMsgs tagline={p?.tagline} name={displayName} />
            <AnnounceMsgs tagline={p?.tagline} name={displayName} />
          </div>
        </div>

        {/* ── Header ── */}
        <header className="tfr-header">
          <div className="tfr-fh tfr-fh-1" aria-hidden="true">♥</div>
          <div className="tfr-fh tfr-fh-2" aria-hidden="true">♥</div>
          <div className="tfr-fh tfr-fh-3" aria-hidden="true">♥</div>

          <div className="tfr-cover">
            <div className="tfr-cover-veil" aria-hidden="true" />
          </div>

          <div className="tfr-avatar-wrap">
            <div className="tfr-avatar-ring" aria-hidden="true" />
            <div className="tfr-avatar-inner">{initials(displayName)}</div>
            <div className="tfr-avatar-heart" aria-hidden="true">♥</div>
          </div>

          <div className="tfr-header-content">
            <h1 className="tfr-hero-name">{displayName}</h1>
            {p?.tagline && <p className="tfr-hero-tagline">{p.tagline}</p>}

            <div className="tfr-cta-wrap">
              <button className="tfr-book-btn" onClick={goBook}>
                <span aria-hidden="true">♥</span> Book an Appointment
              </button>
              {(p?.public_phone || p?.public_email) && (
                <div className="tfr-contact-icons">
                  {p?.public_phone && (
                    <a href={`tel:${p.public_phone}`} className="tfr-icon-btn" aria-label="Call us">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44a2 2 0 0 1 1.99-2.18H6.6a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  )}
                  {p?.public_email && (
                    <a href={`mailto:${p.public_email}`} className="tfr-icon-btn" aria-label="Email us">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                    </a>
                  )}
                  {address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="tfr-icon-btn" aria-label="Get directions">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Sticky tab nav ── */}
        <nav className="tfr-tab-rail" aria-label="Sections" ref={tabRailRef}>
          <div className="tfr-tab-slider" role="tablist">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`tfr-tab-pill${active === t.id ? ' tfr-tab-pill--active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Tab panels ── */}
        <main>
          {active === 'booking'  && <BookingPanel  slug={slug} services={services} displayName={displayName} />}
          {active === 'services' && <ServicesPanel services={services} />}
          {active === 'about'    && <AboutPanel    profile={p} address={address} />}
          {active === 'team'     && <TeamPanel     staff={staff} />}
          {active === 'hours'    && <HoursPanel    hours={hours} />}
          {active === 'policies' && policies && <PoliciesPanel policies={policies} />}
        </main>

        {/* ── Footer ── */}
        <Footer profile={p} hours={hours} displayName={displayName} address={address} />
      </div>
    </>
  )
}

// ── Announcement bar helper ───────────────────────────────────────────────────

function AnnounceMsgs({ tagline, name }: { tagline?: string | null; name: string }) {
  const msgs = [
    tagline ?? name,
    'Book your appointment online',
    'Now accepting new clients',
    tagline ?? 'Walk-ins welcome',
    name,
  ]
  return (
    <>
      {msgs.flatMap((msg, i) => [
        <span key={`m${i}`}>{msg}</span>,
        <span key={`s${i}`} style={{ color: PINK, opacity: 0.6, fontSize: 8 }}>●</span>,
      ])}
    </>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: PINK,
      textShadow: '0 0 12px rgba(255,61,190,0.5)',
      marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

// ── Booking panel ─────────────────────────────────────────────────────────────

function BookingPanel({ slug, services, displayName }: { slug: string; services: Service[]; displayName: string }) {
  return (
    <div className="tfr-section tfr-booking-section">
      <div className="tfr-section-inner">
        <div className="tfr-booking-layout">
          {/* Left: heading + service preview */}
          <div className="tfr-booking-left">
            <SectionEyebrow>Book Online</SectionEyebrow>
            <h2 className="tfr-section-heading">Reserve Your<br /><em className="tfr-script-em">Appointment</em></h2>
            {services.length > 0 && (
              <div className="tfr-booking-service-list">
                {services.slice(0, 4).map(s => (
                  <div key={s.id} className="tfr-booking-service-pill">
                    <span className="tfr-booking-service-name">{s.name}</span>
                    <span className="tfr-booking-service-meta">${Number(s.price).toFixed(0)} · {s.duration_minutes}min</span>
                  </div>
                ))}
              </div>
            )}
            <p className="tfr-booking-note">No payment required — the business will confirm your appointment.</p>
          </div>

          {/* Right: form card */}
          <div className="tfr-booking-right">
            <div className="tfr-form-card">
              <PublicBookingForm slug={slug} services={services} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Services panel ────────────────────────────────────────────────────────────

function ServicesPanel({ services }: { services: Service[] }) {
  return (
    <div className="tfr-section">
      <div className="tfr-section-inner">
        <SectionEyebrow>What We Offer</SectionEyebrow>
        <h2 className="tfr-section-heading" style={{ marginBottom: 36 }}>
          Our <em className="tfr-script-em">Services</em>
        </h2>
        <div className="tfr-services-grid">
          {services.map(s => (
            <div key={s.id} className="tfr-service-card">
              <div className="tfr-service-card-top">
                <div className="tfr-pink-dot" aria-hidden="true" />
                <h3 className="tfr-service-name">{s.name}</h3>
              </div>
              {s.description && <p className="tfr-service-desc">{s.description}</p>}
              <div className="tfr-service-footer">
                <span className="tfr-service-price">${Number(s.price).toFixed(2)}</span>
                <span className="tfr-service-duration">{s.duration_minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── About panel ───────────────────────────────────────────────────────────────

function AboutPanel({ profile: p, address }: { profile: Profile | null; address: string }) {
  return (
    <div className="tfr-section">
      <div className="tfr-section-inner" style={{ maxWidth: 720 }}>
        <SectionEyebrow>About Us</SectionEyebrow>
        <h2 className="tfr-section-heading" style={{ marginBottom: 36 }}>
          Get to <em className="tfr-script-em">Know Us</em>
        </h2>

        <div className="tfr-about-grid">
          {p?.public_phone && (
            <ContactItem label="Phone" value={p.public_phone} href={`tel:${p.public_phone}`} />
          )}
          {p?.public_email && (
            <ContactItem label="Email" value={p.public_email} href={`mailto:${p.public_email}`} />
          )}
          {address && (
            <ContactItem
              label="Location"
              value={address}
              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
              external
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ContactItem({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  const inner = (
    <div className="tfr-contact-item">
      <span className="tfr-contact-label">{label}</span>
      <span className="tfr-contact-value">{value}</span>
    </div>
  )
  if (href) {
    return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ textDecoration: 'none' }}>{inner}</a>
  }
  return inner
}

// ── Team panel ────────────────────────────────────────────────────────────────

function TeamPanel({ staff }: { staff: PublicStaffMember[] }) {
  return (
    <div className="tfr-section">
      <div className="tfr-section-inner">
        <SectionEyebrow>The Crew</SectionEyebrow>
        <h2 className="tfr-section-heading" style={{ marginBottom: 36 }}>
          Our <em className="tfr-script-em">Team</em>
        </h2>
        <div className="tfr-team-grid">
          {staff.map(m => (
            <div key={m.id} className="tfr-team-card">
              <div className="tfr-team-avatar">{initials(m.name)}</div>
              <div className="tfr-team-info">
                <p className="tfr-team-name">{m.name}</p>
                {m.role && <p className="tfr-team-role">{m.role}</p>}
                {m.bio && <p className="tfr-team-bio">{m.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Hours panel ───────────────────────────────────────────────────────────────

function HoursPanel({ hours }: { hours: PublicSite['hours'] }) {
  if (!hours || hours.length === 0) return null
  const sorted = [...hours.filter(h => h.day_of_week !== 0), ...hours.filter(h => h.day_of_week === 0)]
  return (
    <div className="tfr-section">
      <div className="tfr-section-inner" style={{ maxWidth: 560 }}>
        <SectionEyebrow>When We&apos;re Open</SectionEyebrow>
        <h2 className="tfr-section-heading" style={{ marginBottom: 36 }}>
          Business <em className="tfr-script-em">Hours</em>
        </h2>
        <div className="tfr-hours-list">
          {sorted.map(h => (
            <div key={h.day_of_week} className="tfr-hours-row">
              <span className="tfr-hours-day">{h.day_name}</span>
              <span className="tfr-hours-time">
                {h.is_open && h.open_time && h.close_time
                  ? `${fmt12(h.open_time)} – ${fmt12(h.close_time)}`
                  : 'Closed'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Policies panel ────────────────────────────────────────────────────────────

const POLICY_PAIRS: [string, string][] = [
  ['cancellation_policy', 'Cancellation'],
  ['late_policy',         'Late Arrival'],
  ['no_show_policy',      'No-Show'],
  ['deposit_policy',      'Deposit'],
  ['reschedule_policy',   'Rescheduling'],
  ['extra_notes',         'Additional Notes'],
]

function PoliciesPanel({ policies }: { policies: PublicSite['policies'] }) {
  if (!policies) return null
  const active = POLICY_PAIRS.filter(([key]) => (policies as unknown as Record<string, string | null>)[key])
  if (active.length === 0) return null

  return (
    <div className="tfr-section">
      <div className="tfr-section-inner">
        <SectionEyebrow>Good to Know</SectionEyebrow>
        <h2 className="tfr-section-heading" style={{ marginBottom: 36 }}>
          Our <em className="tfr-script-em">Policies</em>
        </h2>
        <div className="tfr-policy-grid">
          {active.map(([key, label]) => (
            <div key={key} className="tfr-policy-card">
              <h3 className="tfr-policy-title">{label}</h3>
              <p className="tfr-policy-text">{(policies as unknown as Record<string, string | null>)[key]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ profile: p, hours, displayName, address }: {
  profile: Profile | null
  hours: PublicSite['hours']
  displayName: string
  address: string
}) {
  const sorted = hours
    ? [...hours.filter(h => h.day_of_week !== 0), ...hours.filter(h => h.day_of_week === 0)]
    : []

  return (
    <footer className="tfr-footer">
      <div className="tfr-footer-glow" aria-hidden="true" />
      <div className="tfr-footer-inner">

        {/* Brand */}
        <div className="tfr-footer-brand">
          <p className="tfr-footer-mark">{displayName}</p>
          {p?.tagline && <p className="tfr-footer-tag">{p.tagline}</p>}
        </div>

        {/* Contact */}
        {(p?.public_phone || p?.public_email || address) && (
          <div className="tfr-footer-col">
            <p className="tfr-footer-label">Contact</p>
            {p?.public_phone && (
              <a href={`tel:${p.public_phone}`} className="tfr-footer-item">{p.public_phone}</a>
            )}
            {p?.public_email && (
              <a href={`mailto:${p.public_email}`} className="tfr-footer-item">{p.public_email}</a>
            )}
            {address && <p className="tfr-footer-item" style={{ color: MUTED, fontSize: 12 }}>{address}</p>}
          </div>
        )}

        {/* Hours */}
        {sorted.length > 0 && (
          <div className="tfr-footer-col">
            <p className="tfr-footer-label">Hours</p>
            {sorted.map(h => (
              <div key={h.day_of_week} className="tfr-footer-hour">
                <span>{h.day_name}</span>
                <span>
                  {h.is_open && h.open_time && h.close_time
                    ? `${fmt12(h.open_time)} – ${fmt12(h.close_time)}`
                    : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
      <div className="tfr-footer-bottom">
        <span>© {new Date().getFullYear()} {displayName}</span>
        <span className="tfr-footer-dot">●</span>
        <span>Powered by <strong>BookReady</strong></span>
      </div>
    </footer>
  )
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const TFR_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=DM+Serif+Text:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');

:root {
  --tfr-bg:   #0E1111;
  --tfr-pink: #FF3DBE;
  --tfr-text: #FFFFFF;
  --tfr-muted: #9CA3AF;
  --tfr-script: "Dancing Script", cursive;
  --tfr-serif:  "DM Serif Text", serif;
  --tfr-sans:   "DM Sans", system-ui, sans-serif;
  --tfr-glow: 0 0 4px rgba(255,7,169,1), 0 0 10px rgba(255,61,190,0.95), 0 0 26px rgba(255,61,190,0.75), 0 0 60px rgba(255,61,190,0.35);
}

*, *::before, *::after { box-sizing: border-box; }

.tfr-root {
  min-height: 100vh;
  background: var(--tfr-bg);
  color: var(--tfr-text);
  font-family: var(--tfr-sans);
  overflow-x: hidden;
}

/* ── Announce bar ── */
.tfr-announce {
  width: 100%;
  background: linear-gradient(90deg, rgba(255,61,190,0.18), rgba(14,17,17,0.95) 35%, rgba(14,17,17,0.95) 65%, rgba(255,61,190,0.18));
  border-bottom: 1px solid rgba(255,61,190,0.25);
  overflow: hidden;
  position: relative;
}
.tfr-announce::before, .tfr-announce::after {
  content: "";
  position: absolute; top: 0; bottom: 0; width: 60px; z-index: 2; pointer-events: none;
}
.tfr-announce::before { left: 0; background: linear-gradient(90deg, #0E1111, transparent); }
.tfr-announce::after  { right: 0; background: linear-gradient(-90deg, #0E1111, transparent); }
.tfr-announce-track {
  display: inline-flex; align-items: center; gap: 20px;
  padding: 10px 0; white-space: nowrap;
  animation: tfrMarquee 40s linear infinite;
  color: #fff;
  font-family: var(--tfr-sans); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; font-weight: 600;
}
@keyframes tfrMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .tfr-announce-track { animation: none; } }

/* ── Header ── */
.tfr-header {
  position: relative;
  background: var(--tfr-bg);
  display: flex; flex-direction: column; align-items: center;
  overflow: hidden;
}

/* Cover image */
.tfr-cover {
  width: 100%; height: 240px; min-height: 240px;
  background: linear-gradient(135deg, #170810 0%, #0E1111 40%, #190d1f 70%, #0E1111 100%);
  position: relative; flex-shrink: 0; order: 1;
}
.tfr-cover-veil {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(14,11,16,0) 45%, rgba(14,11,16,0.85) 100%),
              radial-gradient(120% 80% at 50% 0%, rgba(255,61,190,0.18), transparent 60%);
  pointer-events: none;
}

/* Avatar */
.tfr-avatar-wrap {
  position: relative;
  width: 160px; height: 160px;
  border-radius: 50%;
  border: 5px solid var(--tfr-bg);
  order: 2;
  transform: translateY(-78px);
  margin-bottom: -50px;
  flex-shrink: 0;
  z-index: 2;
}
.tfr-avatar-ring {
  position: absolute; inset: -10px;
  border-radius: 50%;
  border: 1px dashed rgba(255,61,190,0.55);
  pointer-events: none;
  animation: tfrSpin 22s linear infinite;
}
.tfr-avatar-inner {
  width: 100%; height: 100%; border-radius: 50%;
  background: linear-gradient(135deg, #2a0a1e, #1a0a14);
  border: 2px solid rgba(255,61,190,0.55);
  box-shadow: 0 0 0 4px rgba(255,61,190,0.15), 0 0 40px rgba(255,61,190,0.3);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--tfr-serif); font-size: 52px; color: var(--tfr-pink);
  text-shadow: var(--tfr-glow);
  user-select: none;
}
.tfr-avatar-heart {
  position: absolute; top: -4px; right: -2px;
  width: 34px; height: 34px; border-radius: 50%;
  background: #0E0B10;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--tfr-pink);
  border: 1px solid rgba(255,61,190,0.6);
  box-shadow: 0 0 14px rgba(255,61,190,0.7);
  z-index: 3;
  animation: tfrHeartPulse 2.4s ease-in-out infinite;
}
@keyframes tfrSpin { to { transform: rotate(360deg); } }
@keyframes tfrHeartPulse {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255,61,190,0.7)); }
  50%      { transform: scale(1.12); filter: drop-shadow(0 0 14px rgba(255,61,190,0.95)); }
}

/* Header content */
.tfr-header-content {
  order: 3;
  width: 100%;
  max-width: 560px;
  padding: 8px 24px 52px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.tfr-hero-name {
  font-family: var(--tfr-serif);
  font-size: clamp(32px, 8vw, 72px);
  font-weight: 400;
  line-height: 1.0;
  letter-spacing: -0.03em;
  color: var(--tfr-text);
  margin: 0 0 8px;
}
.tfr-hero-tagline {
  font-family: var(--tfr-script);
  font-size: clamp(22px, 5vw, 46px);
  font-weight: 400;
  color: var(--tfr-pink);
  text-shadow: var(--tfr-glow);
  margin: 0 0 36px;
  line-height: 1.1;
}

/* Book CTA */
.tfr-cta-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  width: min(100%, 420px);
}
.tfr-book-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 14px 22px;
  background: var(--tfr-pink); color: #fff;
  border: 0; border-radius: 999px;
  font-family: var(--tfr-sans); font-size: 13px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(255,61,190,0.35);
  transition: transform .2s ease, box-shadow .2s ease;
}
.tfr-book-btn:hover { transform: translateY(-1px); box-shadow: 0 0 34px rgba(255,61,190,0.6); }
.tfr-contact-icons { display: flex; gap: 8px; }
.tfr-icon-btn {
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.03);
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; text-decoration: none;
  transition: all .25s ease;
}
.tfr-icon-btn:hover { border-color: var(--tfr-pink); color: var(--tfr-pink); box-shadow: 0 0 16px rgba(255,61,190,0.5); transform: translateY(-2px); }

/* Floating hearts */
.tfr-fh {
  position: absolute; color: var(--tfr-pink); pointer-events: none; z-index: 1;
  text-shadow: 0 0 10px rgba(255,61,190,0.85), 0 0 22px rgba(255,61,190,0.5);
  animation: tfrFloat 6s ease-in-out infinite;
}
.tfr-fh-1 { top: 20%; left: 8%;  font-size: 14px; opacity: 0.8;  animation-delay: -1s; }
.tfr-fh-2 { top: 35%; right: 8%; font-size: 18px; opacity: 0.85; animation-delay: -3s; }
.tfr-fh-3 { bottom: 20%; left: 14%; font-size: 12px; opacity: 0.7; animation-delay: -5s; }
@keyframes tfrFloat {
  0%,100% { transform: translateY(0) rotate(-6deg); }
  50%      { transform: translateY(-10px) rotate(6deg); }
}

/* ── Tab rail ── */
.tfr-tab-rail {
  position: sticky; top: 0; z-index: 50;
  width: 100%;
  background: rgba(14,17,17,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tfr-tab-rail::-webkit-scrollbar { display: none; }
.tfr-tab-slider {
  display: inline-flex; align-items: stretch;
  min-width: 100%;
  padding: 0 16px;
  gap: 0;
}
.tfr-tab-pill {
  position: relative;
  flex-shrink: 0;
  padding: 18px 14px;
  background: transparent; border: 0;
  color: var(--tfr-muted);
  font-family: var(--tfr-sans); font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  cursor: pointer;
  transition: color .2s ease;
  white-space: nowrap;
}
.tfr-tab-pill::after {
  content: "";
  position: absolute; bottom: 0; left: 14px; right: 14px;
  height: 2px; background: var(--tfr-pink);
  transform: scaleX(0); transition: transform .2s ease;
  box-shadow: 0 0 8px rgba(255,61,190,0.8);
}
.tfr-tab-pill:hover { color: #fff; }
.tfr-tab-pill--active { color: #fff; }
.tfr-tab-pill--active::after { transform: scaleX(1); }

/* ── Section base ── */
.tfr-section {
  width: 100%;
  background: var(--tfr-bg);
  padding: 52px 22px 72px;
}
.tfr-section-inner {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}
.tfr-section-heading {
  font-family: var(--tfr-serif);
  font-size: clamp(38px, 7vw, 64px);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--tfr-text);
  margin: 0 0 8px;
}
.tfr-script-em {
  font-family: var(--tfr-script);
  font-style: normal;
  color: var(--tfr-pink);
  text-shadow: var(--tfr-glow);
  font-size: 1.05em;
  line-height: 1.4;
}

/* ── Booking section ── */
.tfr-booking-section { padding-top: 48px; padding-bottom: 80px; }
.tfr-booking-layout {
  display: flex; flex-direction: column; gap: 40px;
}
.tfr-booking-left { display: flex; flex-direction: column; }
.tfr-booking-service-list { display: flex; flex-direction: column; gap: 8px; margin: 24px 0 28px; }
.tfr-booking-service-pill {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 2px solid rgba(255,61,190,0.5);
}
.tfr-booking-service-name { font-family: var(--tfr-sans); font-size: 13px; color: var(--tfr-text); font-weight: 500; }
.tfr-booking-service-meta { font-family: var(--tfr-sans); font-size: 12px; color: var(--tfr-muted); }
.tfr-booking-note { font-size: 12px; color: var(--tfr-muted); line-height: 1.5; }

/* Form card — light on dark (intentional contrast) */
.tfr-form-card {
  background: #fff;
  padding: 28px;
  border-radius: 4px;
  box-shadow: 0 0 40px rgba(255,61,190,0.15);
}

/* ── Services grid ── */
.tfr-services-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.tfr-service-card {
  position: relative;
  padding: 20px 18px 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 2px solid var(--tfr-pink);
  overflow: hidden;
}
.tfr-service-card::before {
  content: "";
  position: absolute; left: 0; top: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, rgba(255,61,190,0.5), rgba(255,61,190,0) 70%);
}
.tfr-service-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.tfr-pink-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tfr-pink); flex-shrink: 0; }
.tfr-service-name { font-family: var(--tfr-sans); font-size: 15px; font-weight: 600; color: var(--tfr-text); margin: 0; }
.tfr-service-desc { font-size: 13px; color: var(--tfr-muted); line-height: 1.55; margin: 0 0 14px; }
.tfr-service-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.tfr-service-price { font-family: var(--tfr-script); font-size: 28px; color: var(--tfr-pink); text-shadow: 0 0 10px rgba(255,61,190,0.4); }
.tfr-service-duration { font-size: 12px; color: var(--tfr-muted); letter-spacing: 0.06em; }

/* ── About / contact ── */
.tfr-about-grid { display: flex; flex-direction: column; gap: 12px; }
.tfr-contact-item {
  display: flex; flex-direction: column; gap: 4px;
  padding: 16px 18px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 2px solid var(--tfr-pink);
}
.tfr-contact-label { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--tfr-pink); }
.tfr-contact-value { font-size: 14px; color: var(--tfr-text); }

/* ── Team grid ── */
.tfr-team-grid { display: flex; flex-direction: column; gap: 16px; }
.tfr-team-card {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 18px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 2px solid var(--tfr-pink);
}
.tfr-team-avatar {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #2a0a1e, #1a0a14);
  border: 1px solid rgba(255,61,190,0.4);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--tfr-serif); font-size: 18px;
  color: var(--tfr-pink); user-select: none;
}
.tfr-team-info { flex: 1; min-width: 0; }
.tfr-team-name { font-size: 15px; font-weight: 700; color: var(--tfr-text); margin: 0 0 4px; }
.tfr-team-role { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tfr-pink); margin: 0 0 8px; }
.tfr-team-bio { font-size: 13px; color: var(--tfr-muted); line-height: 1.55; margin: 0; }

/* ── Hours ── */
.tfr-hours-list { display: flex; flex-direction: column; gap: 0; }
.tfr-hours-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.07);
}
.tfr-hours-row:last-child { border-bottom: 0; }
.tfr-hours-day { font-size: 13px; font-weight: 600; color: var(--tfr-text); }
.tfr-hours-time { font-size: 13px; color: var(--tfr-muted); font-family: "DM Mono", monospace, var(--tfr-sans); }

/* ── Policies ── */
.tfr-policy-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.tfr-policy-card {
  position: relative;
  padding: 20px 18px 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 2px solid var(--tfr-pink);
  overflow: hidden;
}
.tfr-policy-card::before {
  content: "";
  position: absolute; left: 0; top: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, rgba(255,61,190,0.55), rgba(255,61,190,0) 70%);
}
.tfr-policy-title {
  font-family: var(--tfr-script); font-size: 28px; font-weight: 400;
  color: var(--tfr-text); text-shadow: var(--tfr-glow);
  margin: 0 0 12px;
}
.tfr-policy-text {
  font-size: 13px; color: rgba(246,245,243,0.82);
  line-height: 1.55; white-space: pre-wrap; margin: 0;
}

/* ── Footer ── */
.tfr-footer {
  position: relative;
  width: 100%;
  background: linear-gradient(180deg, #0E1111 0%, #170810 100%);
  color: #fff;
  border-top: 1px solid rgba(255,61,190,0.18);
  overflow: hidden;
}
.tfr-footer-glow {
  position: absolute; top: -120px; left: 50%;
  transform: translateX(-50%);
  width: 520px; height: 240px;
  background: radial-gradient(ellipse at center, rgba(255,61,190,0.22), transparent 70%);
  pointer-events: none;
}
.tfr-footer-inner {
  position: relative;
  max-width: 1100px; margin: 0 auto;
  padding: 56px 24px 36px;
  display: grid; grid-template-columns: 1fr; gap: 36px;
}
.tfr-footer-brand { display: flex; flex-direction: column; gap: 8px; }
.tfr-footer-mark { font-family: var(--tfr-serif); font-size: 34px; line-height: 1; letter-spacing: -0.02em; margin: 0; }
.tfr-footer-tag { font-family: var(--tfr-script); font-size: 22px; color: var(--tfr-pink); text-shadow: var(--tfr-glow); margin: 0; }
.tfr-footer-col { display: flex; flex-direction: column; gap: 10px; }
.tfr-footer-label { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--tfr-pink); font-weight: 600; text-shadow: 0 0 10px rgba(255,61,190,0.4); margin-bottom: 4px; }
.tfr-footer-item { color: var(--tfr-text); font-size: 13px; line-height: 1.4; text-decoration: none; transition: color .2s ease; }
.tfr-footer-item:hover { color: var(--tfr-pink); }
.tfr-footer-hour {
  display: flex; justify-content: space-between; gap: 16px;
  font-size: 12px; color: var(--tfr-text);
  padding-bottom: 6px; border-bottom: 1px dashed rgba(255,255,255,0.08);
}
.tfr-footer-hour:last-of-type { border-bottom: 0; }
.tfr-footer-hour span:last-child { color: var(--tfr-muted); font-size: 11px; }
.tfr-footer-bottom {
  position: relative;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 18px 24px;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px;
  font-size: 11px; letter-spacing: 0.06em; color: var(--tfr-muted);
}
.tfr-footer-bottom strong { color: var(--tfr-pink); font-weight: 600; }
.tfr-footer-dot { color: var(--tfr-pink); opacity: 0.5; font-size: 6px; }

/* ── Responsive: tablet ── */
@media (min-width: 641px) {
  .tfr-cover { height: 320px; }
  .tfr-avatar-wrap { width: 190px; height: 190px; transform: translateY(-92px); margin-bottom: -60px; }
  .tfr-avatar-inner { font-size: 64px; }
  .tfr-header-content { max-width: 720px; padding: 16px 40px 64px; }
  .tfr-services-grid { grid-template-columns: repeat(2, 1fr); }
  .tfr-team-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .tfr-policy-grid { grid-template-columns: repeat(2, 1fr); }
  .tfr-footer-inner { grid-template-columns: 1fr 1fr; }
  .tfr-footer-brand { grid-column: 1 / -1; }
}

/* ── Responsive: desktop ── */
@media (min-width: 1025px) {
  /* Header: editorial split */
  .tfr-header {
    display: grid; grid-template-columns: 1.05fr 1fr;
    align-items: stretch; padding: 0;
    flex-direction: unset;
  }
  .tfr-cover { height: auto; min-height: 620px; order: 1; grid-row: 1 / 3; }
  .tfr-cover img { height: 100%; }
  .tfr-avatar-wrap {
    position: absolute; top: 56px; left: 56px;
    width: 140px; height: 140px;
    transform: none; margin-bottom: 0;
    border-width: 6px;
    z-index: 3;
    order: unset;
  }
  .tfr-header { position: relative; }
  .tfr-header-content {
    order: 2; grid-column: 2;
    max-width: none; margin: 0;
    padding: 90px 72px 72px;
    text-align: left; align-items: flex-start;
    justify-content: center;
  }
  .tfr-cta-wrap { width: 100%; max-width: 480px; align-items: flex-start; }
  .tfr-tab-slider { justify-content: center; padding: 0 40px; gap: 4px; }
  .tfr-tab-pill { padding: 22px 18px; font-size: 11px; letter-spacing: 0.2em; }
  .tfr-tab-pill::after { left: 18px; right: 18px; }
  .tfr-section { padding: 72px 48px 96px; }
  .tfr-booking-layout { flex-direction: row; gap: 60px; align-items: flex-start; }
  .tfr-booking-left { flex: 1; }
  .tfr-booking-right { flex: 1.2; }
  .tfr-services-grid { grid-template-columns: repeat(3, 1fr); }
  .tfr-team-grid { grid-template-columns: repeat(3, 1fr); }
  .tfr-policy-grid { grid-template-columns: repeat(3, 1fr); }
  .tfr-footer-inner { grid-template-columns: 1.4fr 1fr 1fr; gap: 48px; padding: 72px 48px 40px; }
  .tfr-footer-brand { grid-column: unset; }
}

/* ── Mobile: small ── */
@media (max-width: 420px) {
  .tfr-hero-name { font-size: 28px; }
  .tfr-hero-tagline { font-size: 24px; }
  .tfr-booking-layout { gap: 28px; }
  .tfr-form-card { padding: 20px 16px; }
}
`
