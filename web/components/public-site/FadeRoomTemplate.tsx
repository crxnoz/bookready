'use client'

import React, { useState } from 'react'
import { TenantData, HoursEntry } from '@/lib/types'

// ─── Design tokens (self-contained — no Tailwind) ────────────────────────────
const C = {
  bg: '#0A0A0A',
  surface: '#111111',
  surfaceElevated: '#181818',
  border: 'rgba(255,255,255,0.07)',
  text: '#F0F0F0',
  muted: '#787878',
  accent: '#C9647D',
  accentHover: '#D4748C',
  white: '#FFFFFF',
}

const S: Record<string, React.CSSProperties> = {
  section: { padding: '96px 24px', maxWidth: '1200px', margin: '0 auto' },
  label: {
    letterSpacing: '0.22em',
    fontSize: '10px',
    color: C.accent,
    textTransform: 'uppercase' as const,
    fontWeight: 700,
    marginBottom: '16px',
    display: 'block',
  },
  h2: {
    fontSize: 'clamp(32px, 5vw, 52px)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    color: C.text,
    marginBottom: '16px',
  },
  subtext: { fontSize: '16px', color: C.muted, lineHeight: 1.7, maxWidth: '520px' },
  divider: { width: '100%', height: '1px', background: C.border },
  btnPrimary: {
    display: 'inline-block',
    padding: '15px 36px',
    background: C.accent,
    color: C.white,
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
  },
  btnGhost: {
    display: 'inline-block',
    padding: '14px 36px',
    border: `1px solid rgba(255,255,255,0.18)`,
    color: C.text,
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'transparent',
  },
}

function fmt12h(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Nav({ name }: { name: string }) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}
    >
      <span
        style={{
          fontWeight: 800,
          fontSize: '16px',
          letterSpacing: '0.06em',
          color: C.text,
          textTransform: 'uppercase',
        }}
      >
        {name}
      </span>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {['Services', 'Team', 'Gallery', 'Contact'].map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase()}`}
            style={{
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: C.muted,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {l}
          </a>
        ))}
        <a
          href="#booking"
          style={{
            ...S.btnPrimary,
            padding: '10px 22px',
            fontSize: '11px',
          }}
        >
          Book Now
        </a>
      </div>
    </nav>
  )
}

function Hero({ business }: { business: TenantData['business'] }) {
  return (
    <section
      id="home"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      <span style={S.label}>Premium Barbershop & Salon</span>

      <h1
        style={{
          fontSize: 'clamp(60px, 11vw, 128px)',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 0.95,
          color: C.white,
          marginBottom: '28px',
          textTransform: 'uppercase',
        }}
      >
        {business.name}
      </h1>

      <p
        style={{
          fontSize: '18px',
          color: C.muted,
          maxWidth: '440px',
          lineHeight: 1.65,
          marginBottom: '52px',
        }}
      >
        {business.tagline}
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="#booking" style={S.btnPrimary}>
          Book Now
        </a>
        <a href="#services" style={S.btnGhost}>
          View Services
        </a>
      </div>

      {/* scroll hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' }}>
          Scroll
        </span>
        <div
          style={{
            width: '1px',
            height: '40px',
            background: `linear-gradient(${C.border}, transparent)`,
          }}
        />
      </div>
    </section>
  )
}

function Services({ services }: { services: TenantData['services'] }) {
  const categories = Array.from(new Set(services.map(s => s.category)))

  return (
    <section id="services" style={{ background: C.surface }}>
      <div style={{ ...S.section }}>
        <span style={S.label}>What We Do</span>
        <h2 style={S.h2}>Services</h2>
        <p style={{ ...S.subtext, marginBottom: '64px' }}>
          Every service is a deliberate act. We don&apos;t rush craft.
        </p>

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: '56px' }}>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.muted,
                fontWeight: 700,
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {cat}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {services
                .filter(s => s.category === cat)
                .map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '24px',
                      padding: '22px 0',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '16px', color: C.text, marginBottom: '6px' }}>
                        {s.name}
                      </p>
                      <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.6 }}>
                        {s.description}
                      </p>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '10px',
                          fontSize: '11px',
                          color: C.muted,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {s.duration_minutes} min
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: C.text }}>
                        ${s.price}
                      </span>
                      <a href="#booking" style={{ ...S.btnPrimary, padding: '10px 20px', fontSize: '10px' }}>
                        Book
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Staff({ staff }: { staff: TenantData['staff'] }) {
  return (
    <section id="team" style={{ background: C.bg }}>
      <div style={S.section}>
        <span style={S.label}>The Team</span>
        <h2 style={S.h2}>Meet The Artists</h2>
        <p style={{ ...S.subtext, marginBottom: '64px' }}>
          Skilled hands. Deliberate craft. Passion for the work.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {staff.map(member => (
            <div
              key={member.id}
              style={{
                background: C.surfaceElevated,
                border: `1px solid ${C.border}`,
                padding: '32px',
              }}
            >
              {/* Avatar placeholder */}
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#2a2a2a',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: C.accent,
                  letterSpacing: '-0.02em',
                }}
              >
                {member.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </div>

              <p style={{ fontWeight: 800, fontSize: '18px', color: C.text, marginBottom: '4px' }}>
                {member.name}
              </p>
              <p style={{ fontSize: '12px', color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '14px' }}>
                {member.title}
              </p>
              <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65, marginBottom: '20px' }}>
                {member.bio}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {member.specialties.map(s => (
                  <span
                    key={s}
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      border: `1px solid ${C.border}`,
                      color: C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Gallery({ gallery }: { gallery: TenantData['gallery'] }) {
  const placeholderColors = ['#1a1a1a', '#141414', '#1e1e1e', '#161616', '#1c1c1c', '#181818']

  return (
    <section id="gallery" style={{ background: C.surface }}>
      <div style={S.section}>
        <span style={S.label}>The Work</span>
        <h2 style={S.h2}>Gallery</h2>
        <p style={{ ...S.subtext, marginBottom: '48px' }}>
          Results speak louder than words.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'auto',
            gap: '4px',
          }}
        >
          {gallery.map((img, i) => (
            <div
              key={img.id}
              style={{
                aspectRatio: i === 0 ? '1/1' : i === 3 ? '2/1' : '1/1',
                gridColumn: i === 3 ? 'span 2' : 'span 1',
                background: placeholderColors[i % placeholderColors.length],
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                }}
              >
                {img.alt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HoursDisplay({ hours }: { hours: HoursEntry[] }) {
  return (
    <div>
      {hours.map(h => (
        <div
          key={h.day}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: `1px solid ${C.border}`,
            fontSize: '14px',
          }}
        >
          <span style={{ color: C.muted, fontWeight: 600 }}>{h.day}</span>
          <span style={{ color: h.closed ? C.muted : C.text }}>
            {h.closed ? 'Closed' : `${fmt12h(h.open)} – ${fmt12h(h.close)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

function FAQAccordion({ faqs }: { faqs: TenantData['faqs'] }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div>
      {faqs.map(faq => (
        <div
          key={faq.id}
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <button
            onClick={() => setOpen(open === faq.id ? null : faq.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '22px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '16px', color: C.text }}>
              {faq.question}
            </span>
            <span
              style={{
                color: C.accent,
                fontSize: '22px',
                lineHeight: 1,
                flexShrink: 0,
                transform: open === faq.id ? 'rotate(45deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              +
            </span>
          </button>
          {open === faq.id && (
            <p style={{ color: C.muted, fontSize: '15px', lineHeight: 1.7, paddingBottom: '24px' }}>
              {faq.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function PoliciesSection({ policies }: { policies: TenantData['policies'] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div>
      {policies.map(p => (
        <div key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
          <button
            onClick={() => setOpen(open === p.id ? null : p.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '22px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '16px', color: C.text }}>{p.title}</span>
            <span style={{ color: C.accent, fontSize: '22px', transform: open === p.id ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>+</span>
          </button>
          {open === p.id && (
            <p style={{ color: C.muted, fontSize: '15px', lineHeight: 1.7, paddingBottom: '24px' }}>
              {p.content}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function Contact({ business, hours }: Pick<TenantData, 'business' | 'hours'>) {
  return (
    <section id="contact" style={{ background: C.surface }}>
      <div
        style={{
          ...S.section,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
        }}
      >
        <div>
          <span style={S.label}>Find Us</span>
          <h2 style={{ ...S.h2, fontSize: '36px', marginBottom: '32px' }}>
            Location & Contact
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              ['Address', `${business.address}, ${business.city}, ${business.state} ${business.zip}`],
              ['Phone', business.phone],
              ['Email', business.email],
              ...(business.instagram ? [['Instagram', business.instagram]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: '4px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '15px', color: C.text }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span style={S.label}>Hours</span>
          <h2 style={{ ...S.h2, fontSize: '36px', marginBottom: '32px' }}>
            When We&apos;re Open
          </h2>
          <HoursDisplay hours={hours} />
        </div>
      </div>
    </section>
  )
}

function BookingSection() {
  return (
    <section id="booking" style={{ background: C.bg, padding: '120px 24px', textAlign: 'center' }}>
      <span style={S.label}>Ready?</span>
      <h2
        style={{
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: C.white,
          lineHeight: 1,
          marginBottom: '24px',
        }}
      >
        Book Your Appointment
      </h2>
      <p style={{ fontSize: '16px', color: C.muted, marginBottom: '48px', maxWidth: '400px', margin: '0 auto 48px' }}>
        Select your service, choose your artist, pick a time. Done in 60 seconds.
      </p>
      <a href="#" style={{ ...S.btnPrimary, fontSize: '14px', padding: '18px 48px' }}>
        Book Now
      </a>
    </section>
  )
}

function Footer({ business }: { business: TenantData['business'] }) {
  return (
    <footer
      style={{
        background: '#060606',
        padding: '48px 24px',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.06em', color: C.text, textTransform: 'uppercase' }}>
        {business.name}
      </span>
      <p style={{ fontSize: '12px', color: C.muted }}>
        © {new Date().getFullYear()} {business.name}. Powered by BookReady.
      </p>
    </footer>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function FadeRoomTemplate({
  data,
  isPreview = false,
}: {
  data: TenantData
  isPreview?: boolean
}) {
  const { business, services, staff, gallery, hours, policies, faqs } = data

  return (
    <div
      style={{
        backgroundColor: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
        minWidth: isPreview ? 'none' : undefined,
      }}
    >
      {!isPreview && <Nav name={business.name} />}
      <Hero business={business} />
      <div style={S.divider} />
      <Services services={services} />
      <div style={S.divider} />
      <Staff staff={staff} />
      <div style={S.divider} />
      <Gallery gallery={gallery} />
      <div style={S.divider} />

      {/* Info row: policies + FAQs */}
      <section style={{ background: C.bg }}>
        <div
          style={{
            ...S.section,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
          }}
        >
          <div>
            <span style={S.label}>Policies</span>
            <h2 style={{ ...S.h2, fontSize: '32px', marginBottom: '32px' }}>Our Policies</h2>
            <PoliciesSection policies={policies} />
          </div>
          <div>
            <span style={S.label}>FAQ</span>
            <h2 style={{ ...S.h2, fontSize: '32px', marginBottom: '32px' }}>Common Questions</h2>
            <FAQAccordion faqs={faqs} />
          </div>
        </div>
      </section>

      <div style={S.divider} />
      <Contact business={business} hours={hours} />
      <div style={S.divider} />
      <BookingSection />
      <Footer business={business} />
    </div>
  )
}
