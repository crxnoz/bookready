'use client'

import { useState, useRef } from 'react'
import {
  Heart, Phone, Mail, Instagram, MapPin, Dot, CalendarCheck,
} from 'lucide-react'
import TheFadeRoomBooking from './TheFadeRoomBooking'
import type { PublicSite, Service } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ── Profile shape ─────────────────────────────────────────────────────────────

interface Profile {
  business_name?: string | null
  tagline?: string | null
  public_phone?: string | null
  public_email?: string | null
  address_line?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  instagram_url?: string | null
}

// ── Tab registry ──────────────────────────────────────────────────────────────

type TabId = 'book' | 'gallery' | 'policies' | 'about'
           | 'results' | 'aftercare' | 'before'

// ── Main template ─────────────────────────────────────────────────────────────

export default function TheFadeRoomTemplate({ site, slug }: { site: PublicSite; slug: string }) {
  const p           = site.profile as Profile | null
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  const services    = (site.services ?? []).filter((s: Service) => s.is_active)
  const hours       = site.hours     ?? []
  const policies    = site.policies  ?? null
  const availability = site.availability ?? null
  const address     = [p?.address_line, p?.city, p?.state, p?.zip].filter(Boolean).join(', ')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'book',      label: 'Book'                    },
    { id: 'gallery',   label: 'Gallery'                 },
    { id: 'policies',  label: 'Policy'                  },
    { id: 'about',     label: 'About'                   },
    { id: 'results',   label: 'Before & After'          },
    { id: 'aftercare', label: 'Steps'                   },
    { id: 'before',    label: 'Before Your Appointment' },
  ]

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      <style>{TFR_CSS}</style>
      <div className="tfr-template">

        {/* ── Announcement bar ── */}
        <div className="tfr-announce" aria-hidden="true">
          <div className="tfr-announce-track">
            <AnnounceMsgs tagline={p?.tagline} name={displayName} />
            <AnnounceMsgs tagline={p?.tagline} name={displayName} />
          </div>
        </div>

        {/* ── Header ── */}
        <section className="tfr-header-section">
          <span className="tfr-floating-heart tfr-fh-1" aria-hidden="true"><Heart size={14} fill="currentColor" /></span>
          <span className="tfr-floating-heart tfr-fh-2" aria-hidden="true"><Heart size={18} fill="currentColor" /></span>
          <span className="tfr-floating-heart tfr-fh-3" aria-hidden="true"><Heart size={12} /></span>

          <div className="tfr-header-cover">
            <div className="tfr-cover-veil" aria-hidden="true" />
            <div className="tfr-cover-heart" aria-hidden="true"><Heart size={22} fill="currentColor" /></div>
          </div>

          <div className="tfr-header-avatar">
            <span className="tfr-avatar-ring" aria-hidden="true" />
            <span className="tfr-avatar-heart" aria-hidden="true"><Heart size={14} fill="currentColor" /></span>
            <div className="tfr-avatar-initials">{initials(displayName)}</div>
          </div>

          <div className="tfr-header-content">
            <h1>{displayName}</h1>
            <p>{p?.tagline ?? 'Sharp cuts. Smooth booking.'}</p>

            <div className="tfr-header-buttons">
              <button className="tfr-header-btn tfr-header-btn-book" onClick={goBook}>
                <Heart size={16} fill="currentColor" /><span>Book</span>
              </button>
              <a
                className="tfr-header-btn tfr-header-btn-call"
                href={p?.public_phone ? `tel:${p.public_phone}` : '#'}
                aria-disabled={!p?.public_phone || undefined}
              >
                <Phone size={16} /><span>Call</span>
              </a>
              <a
                className="tfr-header-btn tfr-header-btn-chat"
                href={p?.public_email ? `mailto:${p.public_email}` : '#'}
                aria-disabled={!p?.public_email || undefined}
              >
                <Mail size={16} /><span>Email</span>
              </a>
              <a
                className="tfr-header-btn tfr-header-btn-instagram"
                href={p?.instagram_url ?? '#'}
                target={p?.instagram_url ? '_blank' : undefined}
                rel={p?.instagram_url ? 'noopener noreferrer' : undefined}
                aria-disabled={!p?.instagram_url || undefined}
              >
                <Instagram size={16} /><span>Instagram</span>
              </a>
              <a
                className="tfr-header-btn tfr-header-btn-tiktok"
                href={address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '#'}
                target={address ? '_blank' : undefined}
                rel={address ? 'noopener noreferrer' : undefined}
                aria-disabled={!address || undefined}
              >
                <MapPin size={16} /><span>Directions</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── Sticky tab nav ── */}
        <section className="tfr-tabbed-section">
          <div className="tfr-tab-rail" ref={tabRailRef}>
            <div className="tfr-tab-slider" role="tablist">
              {tabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active === t.id}
                  className={`tfr-tab-pill${active === t.id ? ' is-active' : ''}`}
                  onClick={() => setActive(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Book ── */}
          <div className={`tfr-tab-panel${active === 'book' ? ' is-active' : ''}`}>
            <TheFadeRoomBooking
              slug={slug}
              services={services}
              displayName={displayName}
              availability={availability}
            />
          </div>

          {/* ── Gallery ── */}
          <div className={`tfr-tab-panel${active === 'gallery' ? ' is-active' : ''}`}>
            <GalleryPanel />
          </div>

          {/* ── Results ── */}
          <div className={`tfr-tab-panel${active === 'results' ? ' is-active' : ''}`}>
            <ResultsPanel />
          </div>

          {/* ── About ── */}
          <div className={`tfr-tab-panel${active === 'about' ? ' is-active' : ''}`}>
            <AboutPanel profile={p} displayName={displayName} />
          </div>

          {/* ── Policy ── */}
          <div className={`tfr-tab-panel${active === 'policies' ? ' is-active' : ''}`}>
            <PoliciesPanel policies={policies} />
          </div>

          {/* ── Before & After ── */}
          {/* (panel reuses 'results' id) */}

          {/* ── Steps (aftercare) ── */}
          <div className={`tfr-tab-panel${active === 'aftercare' ? ' is-active' : ''}`}>
            <AftercarePanel />
          </div>

          {/* ── Before Your Appointment ── */}
          <div className={`tfr-tab-panel${active === 'before' ? ' is-active' : ''}`}>
            <BeforePanel />
          </div>

        </section>

        {/* ── Thanks outro ── */}
        <section className="tfr-thanks-section" aria-label="Thank you">
          <div className="tfr-thanks-inner">
            <span className="tfr-thanks-eyebrow">From us, with love</span>
            <h2>Thank you<br />for choosing <em>{displayName}</em></h2>
            <div className="tfr-thanks-sig">
              <span className="tfr-thanks-line" />
              <em>{displayName.split(' ')[0]}</em>
              <span className="tfr-thanks-line" />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <Footer profile={p} hours={hours} displayName={displayName} address={address} onBook={goBook} />

      </div>
    </>
  )
}

// ── Announcement bar ──────────────────────────────────────────────────────────

function AnnounceMsgs({ tagline, name }: { tagline?: string | null; name: string }) {
  const msgs = [
    tagline ?? name,
    'Book your appointment online',
    'Now accepting new clients',
    'Walk-ins welcome — call ahead',
    name,
  ]
  return (
    <>
      {msgs.flatMap((msg, i) => [
        <span key={`m${i}`}>{msg}</span>,
        <span key={`s${i}`} className="tfr-announce-sep" aria-hidden="true"><Dot size={14} /></span>,
      ])}
    </>
  )
}

// ── Gallery panel ─────────────────────────────────────────────────────────────

const GALLERY_GROUPS = [
  {
    label: 'Fresh Work',
    images: [
      { label: 'Fresh Fade' },
      { label: 'Beard Detail' },
      { label: 'Clean Lineup' },
      { label: 'Chair View' },
    ],
  },
  {
    label: 'The Shop',
    images: [
      { label: 'Shop Floor' },
      { label: 'Shop Detail' },
      { label: 'Tools' },
      { label: 'Vibe' },
    ],
  },
]

function GalleryPanel() {
  return (
    <section className="tfr-gallery-section">
      {GALLERY_GROUPS.map(g => (
        <div key={g.label} className="tfr-gallery-group">
          <h2>{g.label}</h2>
          <div className="tfr-gallery-grid">
            {g.images.map((img, i) => (
              <div key={i} className="tfr-gallery-img tfr-gallery-img--square">
                <div className="tfr-gallery-placeholder">
                  <span>{img.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

// ── Results (before/after) panel ──────────────────────────────────────────────

const BA_PAIRS = [
  { label: 'Fade' },
  { label: 'Lineup' },
  { label: 'Beard' },
]

function ResultsPanel() {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setRevealed(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <section className="tfr-before-after-section">
      <div className="tfr-results-heading">
        <div className="tfr-results-backdrop">RESULTS</div>
        <h2>Amazing</h2>
      </div>
      <div className="tfr-ba-stack">
        {BA_PAIRS.map((pair, i) => (
          <div key={i} className="tfr-ba-pair">
            <span className="tfr-ba-label tfr-ba-label--before">Before</span>
            <span className="tfr-ba-label tfr-ba-label--after">After</span>
            <div className="tfr-ba-card tfr-ba-card--before">
              <div className="tfr-ba-placeholder" />
            </div>
            <button
              className={`tfr-ba-card tfr-ba-card--after${revealed.has(i) ? ' is-revealed' : ''}`}
              onClick={() => toggle(i)}
              aria-label={revealed.has(i) ? 'Hide result' : 'Tap to reveal result'}
            >
              <div className="tfr-ba-placeholder tfr-ba-after-img" />
              <span>Tap to Reveal</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── About panel ───────────────────────────────────────────────────────────────

function AboutPanel({ profile: p, displayName }: { profile: Profile | null; displayName: string }) {
  const businessWord = displayName.split(' ')[0].toUpperCase()
  return (
    <section className="tfr-about-section">
      <div className="tfr-about-images">
        <div className="tfr-about-img tfr-about-img--one"><div className="tfr-gallery-placeholder" /></div>
        <div className="tfr-about-img tfr-about-img--two"><div className="tfr-gallery-placeholder" /></div>
        <div className="tfr-about-img tfr-about-img--three"><div className="tfr-gallery-placeholder" /></div>
      </div>
      <div>
        <div className="tfr-about-heading-wrap">
          <div className="tfr-about-backdrop">{businessWord}</div>
          <h2>The {displayName.split(' ')[0]} Experience</h2>
        </div>
        <div className="tfr-about-copy">
          <p>
            <span>About {displayName}</span>
            {p?.tagline
              ? `${p.tagline} — we're dedicated to delivering an exceptional experience every visit.`
              : `At ${displayName}, every appointment is an experience. We bring precision, care, and craft to every client.`}
          </p>
          <div className="tfr-about-list">
            <span>What we deliver</span>
            <ul>
              <li><strong>Expert technique</strong> refined through years of hands-on practice.</li>
              <li><strong>Personalized service</strong> tailored to your style and preferences.</li>
              <li><strong>A welcoming atmosphere</strong> where you can relax and trust the process.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Policies panel ────────────────────────────────────────────────────────────

const POLICY_KEYS: [string, string][] = [
  ['cancellation_policy', 'Cancellation'],
  ['late_policy',         'Late Arrival'],
  ['no_show_policy',      'No-Show'],
  ['deposit_policy',      'Deposit'],
  ['reschedule_policy',   'Rescheduling'],
  ['extra_notes',         'Additional Notes'],
]

const FALLBACK_POLICIES = [
  { label: 'Cancellation', text: 'We require 24 hours notice for cancellations. Cancellations made with less than 24 hours notice may be subject to a fee.' },
  { label: 'Late Arrival',  text: 'Please arrive on time. Clients arriving more than 10 minutes late may need to be rescheduled to protect other clients\' appointments.' },
  { label: 'No-Show',      text: 'No-shows may be charged a no-show fee. Repeated no-shows may result in prepayment requirements for future bookings.' },
]

function PoliciesPanel({ policies }: { policies: PublicSite['policies'] }) {
  const activeReal = policies
    ? POLICY_KEYS.filter(([key]) => (policies as unknown as Record<string, string | null>)[key])
    : []

  return (
    <section className="tfr-policy-section">
      <div className="tfr-policy-heading">
        <span>Booking</span>
        <h2>Policies</h2>
      </div>
      <div className="tfr-policy-list">
        {activeReal.length > 0
          ? activeReal.map(([key, label]) => (
              <div key={key} className="tfr-policy-card">
                <h3>{label}</h3>
                <div className="tfr-policy-copy">
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {(policies as unknown as Record<string, string | null>)[key]}
                  </p>
                </div>
              </div>
            ))
          : FALLBACK_POLICIES.map(fp => (
              <div key={fp.label} className="tfr-policy-card">
                <h3>{fp.label}</h3>
                <div className="tfr-policy-copy"><p>{fp.text}</p></div>
              </div>
            ))
        }
      </div>
    </section>
  )
}

// ── Before Your Appointment panel ─────────────────────────────────────────────

const BEFORE_STEPS = [
  { title: 'Arrive on Time',          body: 'Plan to arrive 5 minutes early so you can settle in and we can start your service right on schedule.' },
  { title: 'Come Prepared',           body: 'Wear comfortable clothing and avoid heavy product in your hair or beard before your appointment.' },
  { title: 'Bring Reference Photos',  body: 'Not sure exactly what you want? Bring photos of styles you like — it helps us dial in the perfect look.' },
  { title: 'Confirm Your Service',    body: 'Review your booked service before arriving. If anything has changed, give us a call and we\'ll sort it out.' },
]

function BeforePanel() {
  return (
    <section className="tfr-before-appointment-section">
      <h2>Before Your Appointment</h2>
      <ol className="tfr-before-timeline">
        {BEFORE_STEPS.map((s, i) => (
          <li key={i} className="tfr-before-step">
            <div className="tfr-before-node">
              <span className="tfr-before-node-num">{i + 1}</span>
            </div>
            <div className="tfr-before-step-body">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ── Aftercare panel ───────────────────────────────────────────────────────────

const AFTERCARE_CARDS = [
  { title: 'Keep It Fresh',            body: 'Maintain your look between appointments with the right products for your hair type.' },
  { title: 'Avoid Heavy Products',     body: 'Let any treatments settle for 24–48 hours before applying styling products.' },
  { title: 'Book Your Maintenance',    body: 'Most styles look best when touched up every 2–4 weeks. Book your next visit before you leave.' },
  { title: 'Follow Your Care Guide',   body: 'Your barber may give specific instructions for your service — follow them for the best results.' },
]

function AftercarePanel() {
  return (
    <section className="tfr-aftercare-section">
      <h2>Aftercare</h2>
      <div className="tfr-aftercare-list">
        {AFTERCARE_CARDS.map((c, i) => (
          <div key={i} className="tfr-aftercare-card">
            <div className="tfr-aftercare-head">
              <span className="tfr-aftercare-dot" aria-hidden="true" />
              <span className="tfr-aftercare-index">Step {String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({
  profile: p,
  hours,
  displayName,
  address,
  onBook,
}: {
  profile: Profile | null
  hours: PublicSite['hours']
  displayName: string
  address: string
  onBook: () => void
}) {
  const sorted = hours
    ? [...hours.filter(h => h.day_of_week !== 0), ...hours.filter(h => h.day_of_week === 0)]
    : []

  return (
    <footer className="tfr-footer">
      <div className="tfr-footer-glow" aria-hidden="true" />
      <div className="tfr-footer-inner">

        <div className="tfr-footer-brand">
          <span className="tfr-footer-mark">{displayName}</span>
          {p?.tagline && <p className="tfr-footer-tag">{p.tagline}</p>}
          <p className="tfr-footer-blurb">Booking by appointment. Walk-ins welcome when available.</p>
        </div>

        {(p?.public_phone || p?.public_email || address) && (
          <div className="tfr-footer-col">
            <span className="tfr-footer-label">Contact</span>
            {p?.public_phone && (
              <a className="tfr-footer-item" href={`tel:${p.public_phone}`}>
                <Phone size={14} /> {p.public_phone}
              </a>
            )}
            {p?.public_email && (
              <a className="tfr-footer-item" href={`mailto:${p.public_email}`}>
                <Mail size={14} /> {p.public_email}
              </a>
            )}
            {address && (
              <a
                className="tfr-footer-item"
                href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={14} /> {address}
              </a>
            )}
          </div>
        )}

        {sorted.length > 0 && (
          <div className="tfr-footer-col">
            <span className="tfr-footer-label">Hours</span>
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

        <div className="tfr-footer-col">
          <span className="tfr-footer-label">Quick Book</span>
          <button className="tfr-header-btn tfr-header-btn-book" onClick={onBook}
            style={{ minHeight: 44, borderRadius: 10, fontSize: 13 }}>
            <CalendarCheck size={16} /><span>Book Now</span>
          </button>
        </div>

      </div>
      <div className="tfr-footer-bottom">
        <span>© {new Date().getFullYear()} {displayName}</span>
        <span className="tfr-footer-dot" aria-hidden="true"><Dot size={14} /></span>
        <span>Powered by <strong>BookReady</strong></span>
      </div>
    </footer>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────────────────────

const TFR_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=DM+Serif+Text:ital@0;1&family=DM+Sans:opsz,wght@9..40,300..700&family=Roboto:wght@400;500;600&display=swap');

/* ── Tokens scoped to template root ── */
.tfr-template {
  --tfr-bg:          #0E1111;
  --tfr-card:        #202020;
  --tfr-text:        #FFFFFF;
  --tfr-muted:       #9CA3AF;
  --tfr-pink:        #FF3DBE;
  --tfr-pink-soft:   #FFA2CC;
  --tfr-dark-border: #292835;
  --tfr-glow:        0 0 10px rgba(255,61,190,0.95),0 0 22px rgba(255,61,190,0.55),0 0 40px rgba(255,61,190,0.25);
  --tfr-text-glow:   0 0 4px rgba(255,7,169,1),0 0 10px rgba(255,61,190,0.95),0 0 22px rgba(255,61,190,0.7),0 0 38px rgba(255,61,190,0.45);
  --tfr-script:      "Dancing Script", cursive;
  --tfr-serif:       "DM Serif Text", serif;
  --tfr-sans:        "DM Sans", sans-serif;
  --tfr-ui:          "Roboto", sans-serif;
  --tfr-mono:        "DM Mono","Roboto Mono",monospace;
  width: 100%; background: var(--tfr-bg); color: var(--tfr-text);
  overflow-x: hidden; font-family: var(--tfr-ui);
}
.tfr-template *, .tfr-template *::before, .tfr-template *::after { box-sizing: border-box; }
.tfr-template img { max-width: 100%; display: block; }
.tfr-template a { text-decoration: none; }
.tfr-template button, .tfr-template a { -webkit-tap-highlight-color: transparent; cursor: pointer; }
.tfr-template :focus-visible { outline: 2px solid var(--tfr-pink); outline-offset: 3px; }

/* ── Announcement bar ── */
.tfr-announce {
  width: 100%; overflow: hidden; position: relative;
  background: linear-gradient(90deg,rgba(255,61,190,0.18),rgba(14,17,17,0.95) 35%,rgba(14,17,17,0.95) 65%,rgba(255,61,190,0.18));
  border-bottom: 1px solid rgba(255,61,190,0.25);
}
.tfr-announce::before, .tfr-announce::after {
  content:""; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none;
}
.tfr-announce::before { left:0; background:linear-gradient(90deg,#0E1111,transparent); }
.tfr-announce::after  { right:0; background:linear-gradient(-90deg,#0E1111,transparent); }
.tfr-announce-track {
  display:inline-flex; align-items:center; gap:20px; padding:10px 0;
  white-space:nowrap; animation:tfrMarquee 42s linear infinite;
  color:#fff; font-family:var(--tfr-sans); font-size:11px;
  letter-spacing:0.14em; text-transform:uppercase; font-weight:600;
}
.tfr-announce-sep { color:var(--tfr-pink); opacity:0.6; font-size:8px; }
@keyframes tfrMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@media (prefers-reduced-motion:reduce) { .tfr-announce-track { animation:none; } }

/* ── Header ── */
.tfr-header-section {
  width:100%; min-height:100vh; background:var(--tfr-bg);
  overflow:hidden; position:relative;
}
.tfr-header-cover {
  width:100%; height:42vh; min-height:320px; position:relative;
  background:linear-gradient(135deg,#170810 0%,#0E1111 40%,#1a0a2a 70%,#0E1111 100%);
  overflow:hidden;
}
.tfr-cover-veil {
  position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(180deg,rgba(14,11,16,0) 45%,rgba(14,11,16,0.85) 100%),
             radial-gradient(120% 80% at 50% 0%,rgba(255,61,190,0.18),transparent 60%);
}
.tfr-cover-heart {
  position:absolute; top:22px; right:22px;
  color:var(--tfr-pink); display:inline-flex; align-items:center; justify-content:center;
  filter:drop-shadow(0 0 8px rgba(255,61,190,0.85)) drop-shadow(0 0 16px rgba(255,61,190,0.5));
  animation:tfrHeartPulse 2.4s ease-in-out infinite;
}
.tfr-header-avatar {
  width:clamp(165px,16vw,250px); height:clamp(165px,16vw,250px);
  position:absolute;
  top:calc(42vh - clamp(82px,8vw,125px));
  left:50%; transform:translateX(-50%);
  border-radius:999px;
  border:clamp(5px,0.7vw,10px) solid var(--tfr-bg);
  overflow:visible; z-index:2;
  box-shadow:0 0 0 2px rgba(255,61,190,0.55),0 0 24px rgba(255,61,190,0.45),0 0 60px rgba(255,61,190,0.25);
}
.tfr-avatar-ring {
  position:absolute; inset:-10px; border-radius:999px;
  border:1px dashed rgba(255,61,190,0.55); pointer-events:none;
  animation:tfrSpin 22s linear infinite;
}
.tfr-avatar-heart {
  position:absolute; top:-4px; right:-2px;
  width:36px; height:36px; border-radius:999px;
  background:#0E0B10; color:var(--tfr-pink); font-size:14px;
  border:1px solid rgba(255,61,190,0.6);
  box-shadow:0 0 14px rgba(255,61,190,0.7); z-index:3;
  display:inline-flex; align-items:center; justify-content:center;
  animation:tfrHeartPulse 2.4s ease-in-out infinite;
}
.tfr-avatar-initials {
  width:100%; height:100%; border-radius:999px;
  background:linear-gradient(135deg,#2a0a1e,#1a0a14);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--tfr-serif); font-size:clamp(40px,6vw,72px);
  color:var(--tfr-pink); text-shadow:var(--tfr-text-glow);
  user-select:none;
}
@keyframes tfrSpin { to{transform:rotate(360deg)} }
@keyframes tfrHeartPulse {
  0%,100% { transform:scale(1); filter:drop-shadow(0 0 6px rgba(255,61,190,0.7)); }
  50%      { transform:scale(1.12); filter:drop-shadow(0 0 14px rgba(255,61,190,0.95)); }
}
.tfr-header-content {
  width:min(100%,1040px); margin:0 auto;
  padding:clamp(100px,11vw,150px) 32px 72px;
  text-align:center;
}
.tfr-header-content h1 {
  margin:0; color:var(--tfr-text); font-family:var(--tfr-serif);
  font-size:clamp(48px,7vw,104px); line-height:0.95; font-weight:400; letter-spacing:-0.045em;
}
.tfr-header-content p {
  margin:12px 0 clamp(24px,3vw,38px); color:var(--tfr-text);
  font-family:var(--tfr-script); font-size:clamp(36px,5.5vw,72px);
  line-height:1.0; font-weight:400; text-shadow:var(--tfr-text-glow);
}
.tfr-header-buttons {
  width:min(100%,880px); margin:0 auto;
  display:grid; grid-template-columns:repeat(5,minmax(100px,1fr)); gap:10px;
  align-items:stretch;
}
.tfr-header-btn {
  width:100%; min-width:0; min-height:56px; padding:0 14px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  color:var(--tfr-text); border-radius:12px;
  border:1px solid var(--tfr-dark-border);
  font-family:var(--tfr-ui); font-size:15px; font-weight:500; line-height:1;
  transition:transform .18s ease,filter .18s ease; cursor:pointer;
}
.tfr-header-btn:hover { filter:brightness(1.1); transform:translateY(-2px); }
.tfr-header-btn[aria-disabled] { opacity:0.5; cursor:default; transform:none !important; }
.tfr-header-btn span:first-child { font-size:18px; }
.tfr-header-btn-book      { background:var(--tfr-pink); box-shadow:0 0 18px rgba(255,61,190,0.4); }
.tfr-header-btn-call      { background:linear-gradient(45deg,#A281FF 0%,#FF9CD7 100%); }
.tfr-header-btn-chat      { background:linear-gradient(45deg,#FF987E 0%,#FF7EAC 100%); }
.tfr-header-btn-tiktok    { background:linear-gradient(45deg,#EA5F96 36%,#2FC2BF 100%); }
.tfr-header-btn-youtube   { background:linear-gradient(45deg,#FB3354 49%,#FE879C 100%); }
.tfr-header-btn-instagram { background:linear-gradient(45deg,#F9CE34 0%,#EE2A7B 50%,#6228D7 100%); }

/* ── Floating hearts ── */
.tfr-floating-heart { position:absolute; color:var(--tfr-pink); pointer-events:none; z-index:1; display:inline-flex; filter:drop-shadow(0 0 8px rgba(255,61,190,0.85)) drop-shadow(0 0 16px rgba(255,61,190,0.5)); animation:tfrFloat 6s ease-in-out infinite; }
.tfr-fh-1 { top:18%; left:6%; font-size:14px; opacity:0.85; animation-delay:-1s; }
.tfr-fh-2 { top:30%; right:8%; font-size:18px; opacity:0.9; animation-delay:-3s; }
.tfr-fh-3 { bottom:14%; left:12%; font-size:12px; opacity:0.75; animation-delay:-5s; }
@keyframes tfrFloat { 0%,100% { transform:translateY(0) rotate(-6deg); } 50% { transform:translateY(-10px) rotate(6deg); } }

/* ── Tabs ── */
.tfr-tabbed-section { width:100%; background:var(--tfr-bg); overflow:hidden; }
.tfr-tab-rail {
  width:100%; background:var(--tfr-bg); position:sticky; top:0; z-index:20;
  border-top:1px solid rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.05);
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
          mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
}
.tfr-tab-slider {
  width:100%; display:flex; align-items:stretch; gap:4px; padding:6px 22px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  scroll-snap-type:x mandatory;
}
.tfr-tab-slider::-webkit-scrollbar { display:none; }
.tfr-tab-pill {
  position:relative; flex:0 0 auto;
  display:inline-flex; align-items:center; justify-content:center;
  padding:16px 14px; background:transparent; border:0;
  color:rgba(255,255,255,0.5);
  font-family:var(--tfr-ui); font-size:11px; font-weight:600;
  letter-spacing:0.16em; text-transform:uppercase; line-height:1;
  cursor:pointer; white-space:nowrap; scroll-snap-align:center;
  transition:color .22s ease;
}
.tfr-tab-pill::after {
  content:""; position:absolute; left:14px; right:14px; bottom:0;
  height:2px; background:var(--tfr-pink); border-radius:2px;
  transform:scaleX(0); transform-origin:center;
  transition:transform .28s cubic-bezier(.4,0,.2,1),box-shadow .28s ease;
}
.tfr-tab-pill:hover { color:rgba(255,255,255,0.85); }
.tfr-tab-pill.is-active { color:#fff; }
.tfr-tab-pill.is-active::after { transform:scaleX(1); box-shadow:0 0 12px rgba(255,61,190,0.6),0 0 22px rgba(255,61,190,0.35); }
.tfr-tab-panel { display:none; }
.tfr-tab-panel.is-active { display:block; }

/* ── Booking ── */
.tfr-booking-section { padding:36px 22px 64px; max-width:860px; margin:0 auto; color:var(--tfr-text); }
.tfr-booking-head { text-align:center; margin-bottom:28px; }
.tfr-booking-eyebrow {
  display:inline-block; font-family:var(--tfr-sans); font-size:11px;
  font-weight:600; letter-spacing:0.22em; text-transform:uppercase;
  color:var(--tfr-pink); text-shadow:0 0 12px rgba(255,61,190,0.5); margin-bottom:8px;
}
.tfr-booking-head h2 {
  font-family:var(--tfr-script); font-size:clamp(36px,6vw,56px);
  font-weight:400; line-height:1; margin:0 0 22px; text-shadow:var(--tfr-text-glow);
}
.tfr-booking-progress {
  display:flex; justify-content:center; align-items:center;
  gap:0; flex-wrap:wrap; margin-bottom:4px;
}
.tfr-booking-step {
  background:transparent; border:0; padding:10px 12px;
  display:inline-flex; align-items:center; gap:8px;
  color:rgba(255,255,255,0.4); font-family:var(--tfr-sans);
  cursor:pointer; transition:color .2s ease;
}
.tfr-booking-step+.tfr-booking-step::before {
  content:""; display:inline-block; width:22px; height:1px;
  background:rgba(255,255,255,0.15); margin-right:8px;
}
.tfr-booking-step-num {
  font-size:11px; letter-spacing:0.14em; padding:4px 8px;
  border:1px solid rgba(255,255,255,0.15); border-radius:999px; min-width:26px; text-align:center;
}
.tfr-booking-step-label { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; font-weight:600; }
.tfr-booking-step.is-active { color:#fff; }
.tfr-booking-step.is-active .tfr-booking-step-num { background:var(--tfr-pink); border-color:var(--tfr-pink); color:#fff; box-shadow:0 0 14px rgba(255,61,190,0.55); }
.tfr-booking-step.is-done { color:rgba(255,255,255,0.7); }
.tfr-booking-step.is-done .tfr-booking-step-num { border-color:rgba(255,61,190,0.55); color:var(--tfr-pink); }
.tfr-booking-slides { display:block; }
.tfr-booking-slide { display:none; animation:tfrBookingFade .35s ease both; }
.tfr-booking-slide.is-active { display:block; }
@keyframes tfrBookingFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Services in booking */
.tfr-booking-services { display:grid; gap:12px; }
.tfr-booking-service-card {
  background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));
  border:1px solid rgba(255,255,255,0.08); border-left:2px solid var(--tfr-pink);
  border-radius:6px; padding:18px 18px 16px;
  display:flex; flex-direction:column; gap:8px;
  transition:border-color .2s ease,box-shadow .25s ease;
}
.tfr-booking-service-card:hover { border-color:rgba(255,61,190,0.45); box-shadow:0 6px 24px rgba(255,61,190,0.16); }
.tfr-booking-service-card.is-selected { border-color:var(--tfr-pink); box-shadow:0 6px 24px rgba(255,61,190,0.25); background:linear-gradient(180deg,rgba(255,61,190,0.06),rgba(255,255,255,0.01)); }
.tfr-booking-service-top { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.tfr-booking-service-card h3 { margin:0; font-family:var(--tfr-sans); font-size:16px; font-weight:600; letter-spacing:0.02em; color:var(--tfr-text); }
.tfr-booking-price { font-family:var(--tfr-mono); font-size:15px; color:var(--tfr-pink); text-shadow:0 0 10px rgba(255,61,190,0.45); white-space:nowrap; }
.tfr-booking-desc { margin:0; font-size:13px; color:var(--tfr-muted); line-height:1.5; }
.tfr-booking-meta { margin:0; font-size:12px; color:var(--tfr-muted); display:inline-flex; gap:6px; align-items:center; }
.tfr-booking-pick {
  align-self:flex-start; margin-top:4px; background:transparent;
  border:1px solid rgba(255,61,190,0.4); color:var(--tfr-text);
  border-radius:999px; padding:8px 14px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase; font-weight:600;
  cursor:pointer; display:inline-flex; gap:8px; align-items:center;
  transition:background .2s ease,box-shadow .25s ease;
}
.tfr-booking-pick:hover { background:rgba(255,61,190,0.12); box-shadow:0 0 14px rgba(255,61,190,0.35); }

/* Date & time */
.tfr-booking-datetime { display:flex; flex-direction:column; gap:22px; }
.tfr-booking-block { }
.tfr-booking-block-label {
  display:block; font-size:11px; letter-spacing:0.18em;
  text-transform:uppercase; color:var(--tfr-muted); margin-bottom:12px; font-weight:600;
}
.tfr-booking-days { display:flex; flex-wrap:wrap; gap:8px; }
.tfr-booking-day {
  flex:1 1 72px; min-width:68px; max-width:100px;
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1);
  border-radius:8px; padding:12px 8px;
  display:flex; flex-direction:column; align-items:center; gap:3px;
  color:var(--tfr-text); cursor:pointer; transition:all .2s ease;
}
.tfr-booking-day span { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--tfr-muted); }
.tfr-booking-day strong { font-family:var(--tfr-mono); font-size:18px; font-weight:500; }
.tfr-booking-day:hover { border-color:rgba(255,61,190,0.4); }
.tfr-booking-day.is-selected { border-color:var(--tfr-pink); background:rgba(255,61,190,0.1); box-shadow:0 0 14px rgba(255,61,190,0.35); }
.tfr-booking-day.is-selected span, .tfr-booking-day.is-selected strong { color:#fff; }

/* ── Calendar ── */
.tfr-booking-calendar {
  background:linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005));
  border:1px solid rgba(255,255,255,0.08); border-radius:10px;
  padding:14px; display:flex; flex-direction:column; gap:10px;
}
.tfr-calendar-head {
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.tfr-calendar-title {
  font-family:var(--tfr-sans); font-size:14px; font-weight:600;
  letter-spacing:0.08em; color:var(--tfr-text); text-transform:uppercase;
}
.tfr-calendar-nav {
  background:transparent; border:1px solid rgba(255,255,255,0.12);
  color:var(--tfr-text); width:34px; height:34px; border-radius:999px;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s ease;
}
.tfr-calendar-nav:hover { border-color:var(--tfr-pink); color:var(--tfr-pink); box-shadow:0 0 12px rgba(255,61,190,0.4); }
.tfr-calendar-nav:disabled { opacity:0.3; cursor:not-allowed; }
.tfr-calendar-nav:disabled:hover { border-color:rgba(255,255,255,0.12); color:var(--tfr-text); box-shadow:none; }
.tfr-calendar-dow {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
  font-family:var(--tfr-sans); font-size:10px; font-weight:600;
  letter-spacing:0.1em; text-transform:uppercase; color:var(--tfr-muted);
  text-align:center; padding:0 2px;
}
.tfr-calendar-dow span { padding:4px 0; }
.tfr-calendar-grid {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
}
.tfr-calendar-day {
  aspect-ratio:1/1; min-height:36px;
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08);
  border-radius:6px; color:var(--tfr-text);
  font-family:var(--tfr-mono); font-size:13px; font-weight:500;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .15s ease; padding:0;
}
.tfr-calendar-day:hover:not(:disabled) { border-color:rgba(255,61,190,0.5); transform:translateY(-1px); }
.tfr-calendar-day--today {
  border-color:rgba(255,255,255,0.35); color:#fff;
}
.tfr-calendar-day--blocked {
  background:transparent; border-color:rgba(255,255,255,0.04);
  color:rgba(255,255,255,0.18); cursor:not-allowed;
}
.tfr-calendar-day--blocked:hover { transform:none; }
.tfr-calendar-day--selected {
  background:var(--tfr-pink); border-color:var(--tfr-pink); color:#fff;
  box-shadow:0 0 16px rgba(255,61,190,0.55), inset 0 0 0 1px rgba(255,255,255,0.2);
}
.tfr-calendar-day--selected.tfr-calendar-day--today { color:#fff; }
.tfr-calendar-day--empty {
  background:transparent; border:0; cursor:default; visibility:hidden;
}
.tfr-booking-times { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px; }
.tfr-booking-time {
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1);
  border-radius:999px; padding:12px 10px; color:var(--tfr-text);
  font-family:var(--tfr-mono); font-size:13px; cursor:pointer; transition:all .2s ease; text-align:center;
}
.tfr-booking-time:hover { border-color:rgba(255,61,190,0.4); }
.tfr-booking-time.is-selected { border-color:var(--tfr-pink); background:rgba(255,61,190,0.12); color:#fff; box-shadow:0 0 14px rgba(255,61,190,0.35); }
.tfr-slot-msg { font-size:13px; color:var(--tfr-muted); padding:16px 0; }
.tfr-slot-error { color:#ff6b6b; }

/* Details step */
.tfr-booking-fields { display:grid; gap:14px; }
.tfr-booking-fields label { display:flex; flex-direction:column; gap:6px; }
.tfr-booking-fields span { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--tfr-muted); font-weight:600; }
.tfr-booking-fields input,
.tfr-booking-textarea {
  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1);
  border-radius:6px; padding:12px 14px; color:var(--tfr-text);
  font-family:var(--tfr-sans); font-size:14px; width:100%;
  transition:border-color .2s ease,box-shadow .2s ease;
}
.tfr-booking-fields input::placeholder,
.tfr-booking-textarea::placeholder { color:var(--tfr-muted); }
.tfr-booking-fields input:focus,
.tfr-booking-textarea:focus { outline:0; border-color:var(--tfr-pink); box-shadow:0 0 0 3px rgba(255,61,190,0.18); }
.tfr-booking-textarea { resize:vertical; }

/* Nav buttons */
.tfr-booking-nav { display:flex; justify-content:space-between; gap:10px; padding-top:4px; flex-wrap:wrap; }
.tfr-booking-back,
.tfr-booking-next,
.tfr-booking-confirm-btn {
  background:transparent; border:1px solid rgba(255,255,255,0.15);
  color:var(--tfr-text); padding:13px 20px; border-radius:999px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase;
  font-weight:600; cursor:pointer;
  display:inline-flex; gap:8px; align-items:center;
  transition:all .25s ease; font-family:var(--tfr-sans);
}
.tfr-booking-back:hover { border-color:rgba(255,255,255,0.4); }
.tfr-booking-next,
.tfr-booking-confirm-btn {
  background:var(--tfr-pink); border-color:var(--tfr-pink);
  box-shadow:0 0 18px rgba(255,61,190,0.45);
}
.tfr-booking-next:hover,
.tfr-booking-confirm-btn:hover { box-shadow:0 0 28px rgba(255,61,190,0.65); transform:translateY(-1px); }
.tfr-booking-next:disabled,
.tfr-booking-confirm-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

/* Confirm step */
.tfr-booking-confirm { display:flex; flex-direction:column; gap:18px; }
.tfr-booking-summary {
  background:linear-gradient(180deg,rgba(255,61,190,0.06),rgba(255,255,255,0.01));
  border:1px solid rgba(255,61,190,0.2); border-radius:8px; padding:18px;
}
.tfr-booking-summary dl { margin:0; display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.tfr-booking-summary div {
  display:flex; justify-content:space-between; align-items:baseline; gap:12px;
  padding-bottom:8px; border-bottom:1px dashed rgba(255,255,255,0.08);
}
.tfr-booking-summary div:last-child { border-bottom:0; padding-bottom:0; }
.tfr-booking-summary dt { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:var(--tfr-muted); margin:0; font-weight:600; }
.tfr-booking-summary dd { margin:0; font-family:var(--tfr-sans); font-size:14px; color:var(--tfr-text); text-align:right; }
.tfr-booking-total dt, .tfr-booking-total dd { color:var(--tfr-pink) !important; font-size:16px !important; text-shadow:0 0 10px rgba(255,61,190,0.45); }
.tfr-booking-error { background:rgba(255,100,100,0.08); border:1px solid rgba(255,100,100,0.25); border-radius:6px; padding:12px 16px; font-size:13px; color:#ff8888; }
.tfr-booking-disclaimer { text-align:center; font-size:11px; color:rgba(255,255,255,0.35); margin-top:4px; }

/* Success */
.tfr-booking-success {
  text-align:center; padding:48px 24px; display:flex; flex-direction:column;
  align-items:center; gap:12px; max-width:500px; margin:0 auto;
}
.tfr-booking-success-icon { font-size:48px; color:var(--tfr-pink); text-shadow:var(--tfr-glow); animation:tfrHeartPulse 2s ease-in-out infinite; }
.tfr-booking-success h3 { font-family:var(--tfr-script); font-size:40px; font-weight:400; margin:0; text-shadow:var(--tfr-text-glow); }
.tfr-booking-success-copy { font-size:15px; color:var(--tfr-muted); line-height:1.55; margin:0; }
.tfr-booking-success-summary {
  display:flex; flex-wrap:wrap; justify-content:center; gap:8px;
  background:rgba(255,61,190,0.07); border:1px solid rgba(255,61,190,0.2);
  border-radius:8px; padding:12px 18px; font-size:14px; color:var(--tfr-text);
}
.tfr-booking-success-dot { color:var(--tfr-pink); }
.tfr-booking-success-note { font-size:12px; color:rgba(255,255,255,0.35); margin:0; }

/* ── Gallery ── */
.tfr-gallery-section { width:100%; padding:0 0 clamp(64px,8vw,110px); background:var(--tfr-bg); overflow:hidden; }
.tfr-gallery-group { width:min(100%,396px); margin:0 auto; padding:22px 30px 0; }
.tfr-gallery-group+.tfr-gallery-group { padding-top:30px; }
.tfr-gallery-group h2 {
  margin:0 0 18px; color:var(--tfr-text); text-align:center;
  font-family:var(--tfr-script); font-size:26px; line-height:1.1;
  font-weight:400; text-shadow:var(--tfr-text-glow);
  display:inline-flex; align-items:center; gap:12px; width:100%; justify-content:center;
}
.tfr-gallery-group h2::before,.tfr-gallery-group h2::after {
  content:""; flex:1; height:1px; max-width:60px;
  background:linear-gradient(90deg,rgba(255,61,190,0) 0%,rgba(255,61,190,0.5) 50%,rgba(255,61,190,0) 100%);
}
.tfr-gallery-grid { display:grid; grid-template-columns:repeat(2,1fr); grid-auto-flow:dense; gap:12px; }
.tfr-gallery-img {
  position:relative; overflow:hidden; border-radius:10px;
  border:1px solid rgba(255,255,255,0.06);
  transition:border-color .25s ease,box-shadow .25s ease;
}
.tfr-gallery-img:hover { border-color:rgba(255,61,190,0.4); box-shadow:0 6px 22px rgba(255,61,190,0.18); }
.tfr-gallery-img--square { aspect-ratio:1/1; }
.tfr-gallery-img--tall   { aspect-ratio:160/200; }
.tfr-gallery-img--wide   { grid-column:1/-1; aspect-ratio:331/160; }
.tfr-gallery-placeholder {
  width:100%; height:100%; min-height:inherit;
  background:linear-gradient(135deg,#1a1020 0%,#120d1a 50%,#1e1025 100%);
  display:flex; align-items:center; justify-content:center;
}
.tfr-gallery-placeholder span {
  font-family:var(--tfr-sans); font-size:11px; font-weight:600;
  letter-spacing:0.18em; text-transform:uppercase;
  color:rgba(255,255,255,0.25);
}

/* ── Before & After ── */
.tfr-before-after-section { width:min(100%,396px); margin:0 auto; background:var(--tfr-bg); overflow:hidden; padding:22px 0 70px; }
.tfr-results-heading { position:relative; height:105px; text-align:center; overflow:hidden; }
.tfr-results-backdrop { color:rgba(255,255,255,0.2); font-size:76px; font-family:var(--tfr-serif); font-weight:400; line-height:1; letter-spacing:-0.04em; }
.tfr-results-heading h2 { margin:-50px 0 0; color:var(--tfr-text); font-size:26px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-ba-stack { display:grid; gap:24px; padding:8px 0 0; }
.tfr-ba-pair { width:min(100%,350px); height:230px; margin:0 auto; position:relative; }
.tfr-ba-label { position:absolute; z-index:5; color:var(--tfr-text); font-size:26px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); pointer-events:none; }
.tfr-ba-label--before { left:58px; top:0; }
.tfr-ba-label--after  { right:50px; top:70px; }
.tfr-ba-card {
  width:162px; height:162px; position:absolute;
  background:#1a1020; border:1px solid rgba(255,255,255,0.08);
  overflow:hidden; border-radius:8px;
  transition:box-shadow .25s ease,border-color .25s ease,transform .35s ease;
}
.tfr-ba-card--before { left:22px; top:48px; transform:rotate(-6deg); z-index:1; border-color:rgba(255,255,255,0.18); }
.tfr-ba-card--after {
  right:22px; top:92px; transform:rotate(9deg); z-index:2;
  border-color:rgba(255,61,190,0.45);
  box-shadow:0 8px 26px rgba(255,61,190,0.2),0 4px 12px rgba(0,0,0,0.4);
  appearance:none;
}
.tfr-ba-card--after:hover { box-shadow:0 10px 32px rgba(255,61,190,0.32),0 4px 12px rgba(0,0,0,0.4); }
.tfr-ba-placeholder { width:100%; height:100%; background:linear-gradient(135deg,#1a1020 0%,#2a0a1e 50%,#1a0a14 100%); }
.tfr-ba-after-img { filter:blur(6px); transform:scale(1.06); transition:filter .35s ease,transform .35s ease; }
.tfr-ba-card--after span {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:11px; font-family:var(--tfr-sans); font-weight:600;
  letter-spacing:0.16em; text-transform:uppercase; text-align:center;
  background:rgba(14,17,17,0.35); z-index:3; pointer-events:none;
}
.tfr-ba-card--after.is-revealed .tfr-ba-after-img { filter:blur(0); transform:scale(1); }
.tfr-ba-card--after.is-revealed span { display:none; }

/* ── About ── */
.tfr-about-section { width:min(100%,395px); margin:0 auto; background:var(--tfr-bg); overflow:hidden; padding:23px 20px 58px; }
.tfr-about-images { width:100%; height:264px; position:relative; margin-bottom:24px; }
.tfr-about-img { width:113px; height:246px; position:absolute; overflow:hidden; border-radius:6px; border:1px solid rgba(255,255,255,0.08); }
.tfr-about-img--one   { left:6px; top:8px; }
.tfr-about-img--two   { left:124px; top:18px; border-color:rgba(255,61,190,0.35); box-shadow:0 6px 24px rgba(255,61,190,0.2); }
.tfr-about-img--three { left:242px; top:0; }
.tfr-about-img .tfr-gallery-placeholder { height:100%; }
.tfr-about-heading-wrap { position:relative; text-align:center; margin-bottom:32px; }
.tfr-about-backdrop { color:rgba(255,255,255,0.18); font-size:80px; font-family:var(--tfr-serif); font-weight:400; line-height:1; letter-spacing:-0.04em; }
.tfr-about-heading-wrap h2 { margin:-50px 0 0; color:var(--tfr-text); font-size:26px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-about-copy { width:min(100%,344px); margin:0 auto; color:var(--tfr-text); font-family:var(--tfr-serif); font-size:16px; line-height:1.45; }
.tfr-about-copy p { margin:0 0 22px; padding:16px 0 0; border-top:1px solid rgba(255,61,190,0.18); }
.tfr-about-copy p:first-of-type { border-top:0; padding-top:0; }
.tfr-about-copy span {
  display:inline-flex; align-items:center; gap:8px; color:var(--tfr-pink);
  font-family:var(--tfr-sans); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.tfr-about-copy span::before { content:""; width:18px; height:1px; background:var(--tfr-pink); display:inline-block; }
.tfr-about-list { margin:0 0 22px; padding:16px 0 0; border-top:1px solid rgba(255,61,190,0.18); }
.tfr-about-list span {
  display:inline-flex; align-items:center; gap:8px; color:var(--tfr-pink);
  font-family:var(--tfr-sans); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.tfr-about-list span::before { content:""; width:18px; height:1px; background:var(--tfr-pink); display:inline-block; }
.tfr-about-list ul { margin:0; padding-left:0; list-style:none; }
.tfr-about-list li { position:relative; margin:0 0 12px; padding-left:22px; font-family:var(--tfr-serif); font-size:15px; line-height:1.45; color:var(--tfr-text); }
.tfr-about-list li::before { content:""; position:absolute; left:0; top:12px; width:12px; height:1px; background:var(--tfr-pink); }
.tfr-about-list strong { display:block; color:var(--tfr-text); font-weight:400; font-family:var(--tfr-script); font-size:22px; line-height:1.1; margin-bottom:2px; text-shadow:0 0 6px rgba(255,61,190,0.4); }

/* ── Policy ── */
.tfr-policy-section { width:min(100%,396px); margin:0 auto; background:var(--tfr-bg); overflow:hidden; padding:12px 14px 64px; }
.tfr-policy-heading { margin:0 0 20px; display:flex; align-items:flex-end; justify-content:center; gap:8px; }
.tfr-policy-heading span { color:var(--tfr-text); font-size:26px; font-family:var(--tfr-script); font-weight:400; line-height:1.6; text-shadow:var(--tfr-text-glow); }
.tfr-policy-heading h2 { margin:0; color:var(--tfr-text); font-size:clamp(58px,18vw,70px); font-family:var(--tfr-serif); font-weight:400; line-height:0.95; letter-spacing:-0.055em; }
.tfr-policy-list { display:grid; gap:12px; }
.tfr-policy-card {
  position:relative; width:100%; min-height:160px; padding:22px 18px;
  background:linear-gradient(180deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.01) 100%);
  border:1px solid rgba(255,255,255,0.08); border-left:2px solid var(--tfr-pink);
  border-radius:4px; overflow:hidden;
}
.tfr-policy-card::before { content:""; position:absolute; left:0; top:0; right:0; height:1px; background:linear-gradient(90deg,rgba(255,61,190,0.55),rgba(255,61,190,0) 70%); }
.tfr-policy-card h3 { margin:0 0 14px; color:var(--tfr-text); font-size:26px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-policy-copy { color:rgba(246,245,243,0.82); font-size:12.5px; font-family:var(--tfr-sans); font-weight:400; line-height:1.55; }

/* ── Before appointment / Aftercare ── */
.tfr-before-appointment-section { width:min(100%,395px); margin:0 auto; background:var(--tfr-bg); overflow:hidden; padding:28px 16px 60px; }
.tfr-before-appointment-section h2 { margin:0 0 38px; color:var(--tfr-text); text-align:center; font-size:32px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-before-timeline { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:22px; position:relative; }
.tfr-before-timeline::before {
  content:""; position:absolute; left:22px; top:14px; bottom:14px; width:1px;
  background:linear-gradient(180deg,rgba(255,61,190,0) 0%,rgba(255,61,190,0.55) 15%,rgba(255,61,190,0.55) 85%,rgba(255,61,190,0) 100%);
}
.tfr-before-step { display:grid; grid-template-columns:46px 1fr; gap:14px; align-items:flex-start; }
.tfr-before-node { width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:999px; background:var(--tfr-bg); border:1px solid rgba(255,61,190,0.55); flex-shrink:0; }
.tfr-before-node-num { color:var(--tfr-pink); font-family:var(--tfr-sans); font-weight:600; font-size:14px; letter-spacing:0.08em; }
.tfr-before-step-body { padding:4px 4px 10px 6px; border-bottom:1px solid rgba(255,255,255,0.06); }
.tfr-before-step-body h3 { margin:0 0 8px; color:var(--tfr-text); font-family:var(--tfr-script); font-weight:400; font-size:26px; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-before-step-body p { margin:0; color:rgba(246,245,243,0.78); font-family:var(--tfr-sans); font-size:12.5px; font-weight:400; line-height:1.5; }

.tfr-aftercare-section { width:min(100%,396px); margin:0 auto; background:var(--tfr-bg); overflow:hidden; padding:28px 14px 60px; }
.tfr-aftercare-section h2 { margin:0 0 30px; color:var(--tfr-text); text-align:center; font-size:32px; font-family:var(--tfr-script); font-weight:400; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-aftercare-list { display:grid; gap:18px; }
.tfr-aftercare-card { position:relative; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-left:2px solid var(--tfr-pink); padding:16px 16px 18px; overflow:hidden; border-radius:4px; }
.tfr-aftercare-card::before { content:""; position:absolute; left:0; top:0; right:0; height:1px; background:linear-gradient(90deg,rgba(255,61,190,0.6),rgba(255,61,190,0) 70%); }
.tfr-aftercare-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.tfr-aftercare-dot { width:7px; height:7px; border-radius:999px; background:var(--tfr-pink); display:inline-block; flex-shrink:0; }
.tfr-aftercare-index { color:var(--tfr-pink); font-family:var(--tfr-sans); font-size:11px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; }
.tfr-aftercare-card h3 { margin:0 0 8px; color:var(--tfr-text); font-family:var(--tfr-script); font-weight:400; font-size:26px; line-height:1.1; text-shadow:var(--tfr-text-glow); }
.tfr-aftercare-card p { margin:0; color:rgba(246,245,243,0.78); font-family:var(--tfr-sans); font-size:12.5px; font-weight:400; line-height:1.5; }

/* ── Contact cards ── */
.tfr-contact-card {
  display:flex; align-items:center; gap:14px; padding:16px 18px;
  background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07);
  border-left:2px solid var(--tfr-pink); border-radius:4px;
  text-decoration:none; color:var(--tfr-text); transition:border-color .2s ease,box-shadow .2s ease;
}
.tfr-contact-card:hover { border-color:rgba(255,61,190,0.45); box-shadow:0 4px 16px rgba(255,61,190,0.15); }
.tfr-contact-icon { font-size:20px; flex-shrink:0; }
.tfr-contact-card div { display:flex; flex-direction:column; gap:3px; }
.tfr-contact-label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--tfr-pink); font-weight:600; }
.tfr-contact-value { font-size:14px; color:var(--tfr-text); }

/* ── Thanks ── */
.tfr-thanks-section { position:relative; width:100%; background:var(--tfr-bg); padding:80px 22px 88px; border-top:1px solid rgba(255,255,255,0.05); }
.tfr-thanks-inner { max-width:720px; margin:0 auto; text-align:center; color:var(--tfr-text); display:flex; flex-direction:column; align-items:center; gap:24px; }
.tfr-thanks-eyebrow { display:inline-block; font-family:var(--tfr-sans); font-size:11px; font-weight:600; letter-spacing:0.24em; text-transform:uppercase; color:var(--tfr-pink); text-shadow:0 0 12px rgba(255,61,190,0.55); }
.tfr-thanks-inner h2 { font-family:var(--tfr-serif); font-size:clamp(38px,6vw,72px); font-weight:400; line-height:1.05; margin:0; }
.tfr-thanks-inner em { font-family:var(--tfr-script); font-style:normal; color:var(--tfr-pink); font-size:1.15em; text-shadow:var(--tfr-text-glow); }
.tfr-thanks-sig { display:inline-flex; align-items:center; gap:16px; font-family:var(--tfr-script); font-size:28px; color:var(--tfr-pink); text-shadow:var(--tfr-text-glow); }
.tfr-thanks-sig em { font-style:normal; }
.tfr-thanks-line { width:56px; height:1px; background:linear-gradient(90deg,transparent,var(--tfr-pink),transparent); box-shadow:0 0 8px rgba(255,61,190,0.5); }

/* ── Footer ── */
.tfr-footer { position:relative; width:100%; background:linear-gradient(180deg,#0E1111 0%,#170810 100%); color:#fff; overflow:hidden; border-top:1px solid rgba(255,61,190,0.18); }
.tfr-footer-glow { position:absolute; top:-120px; left:50%; transform:translateX(-50%); width:520px; height:240px; background:radial-gradient(ellipse at center,rgba(255,61,190,0.22),transparent 70%); pointer-events:none; }
.tfr-footer-inner { position:relative; width:100%; max-width:1180px; margin:0 auto; padding:56px 24px 32px; display:grid; grid-template-columns:1fr; gap:36px; }
.tfr-footer-brand { display:flex; flex-direction:column; gap:10px; }
.tfr-footer-mark { font-family:var(--tfr-serif); font-size:36px; line-height:1; letter-spacing:-0.03em; margin:0; }
.tfr-footer-tag { margin:0; font-family:var(--tfr-script); font-size:22px; color:var(--tfr-pink); text-shadow:var(--tfr-text-glow); }
.tfr-footer-blurb { margin:0; color:var(--tfr-muted); font-family:var(--tfr-sans); font-size:13px; line-height:1.55; }
.tfr-footer-col { display:flex; flex-direction:column; gap:10px; }
.tfr-footer-label { font-family:var(--tfr-sans); font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--tfr-pink); font-weight:600; text-shadow:0 0 10px rgba(255,61,190,0.4); margin-bottom:4px; }
.tfr-footer-item { display:inline-flex; align-items:center; gap:10px; color:#fff; font-family:var(--tfr-sans); font-size:13px; line-height:1.4; transition:color .2s ease; }
.tfr-footer-item:hover { color:var(--tfr-pink-soft); }
.tfr-footer-hour { display:flex; justify-content:space-between; gap:16px; font-family:var(--tfr-sans); font-size:12px; color:#fff; padding-bottom:6px; border-bottom:1px dashed rgba(255,255,255,0.08); }
.tfr-footer-hour:last-of-type { border-bottom:0; }
.tfr-footer-hour span:last-child { color:var(--tfr-muted); font-family:var(--tfr-mono); font-size:11px; }
.tfr-footer-bottom { position:relative; border-top:1px solid rgba(255,255,255,0.06); padding:18px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; font-family:var(--tfr-sans); font-size:11px; letter-spacing:0.08em; color:var(--tfr-muted); }
.tfr-footer-bottom strong { color:var(--tfr-pink); font-weight:600; }
.tfr-footer-dot { color:var(--tfr-pink); opacity:0.5; font-size:6px; }

/* ── Desktop ── */
@media (min-width:1025px) {
  .tfr-header-section { min-height:auto; display:grid; grid-template-columns:1.05fr 1fr; align-items:stretch; padding:0; position:relative; }
  .tfr-header-cover { height:auto; min-height:640px; order:1; }
  .tfr-header-avatar { position:absolute; top:56px; left:56px; width:140px; height:140px; border-width:6px; box-shadow:none; transform:none; z-index:3; }
  .tfr-header-content { order:2; max-width:none; margin:0; padding:90px 72px 72px; text-align:left; display:flex; flex-direction:column; justify-content:center; }
  .tfr-header-buttons { width:100%; max-width:520px; margin:0; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .tfr-header-btn { min-height:62px; font-size:16px; border-radius:14px; }
  .tfr-tab-slider { justify-content:center; padding:8px 40px; gap:12px; }
  .tfr-tab-pill { padding:22px 18px; font-size:12px; letter-spacing:0.2em; }
  .tfr-tab-pill::after { left:18px; right:18px; height:2px; }
  .tfr-gallery-group, .tfr-before-after-section, .tfr-about-section, .tfr-policy-section, .tfr-before-appointment-section, .tfr-aftercare-section { width:min(100%,1180px); }
  .tfr-gallery-section { padding:0 40px 96px; }
  .tfr-gallery-group { padding:56px 0 0; }
  .tfr-gallery-group+.tfr-gallery-group { padding-top:56px; }
  .tfr-gallery-group h2 { font-size:58px; margin:0 0 34px; text-align:left; }
  .tfr-gallery-grid { grid-template-columns:repeat(4,1fr); gap:16px; }
  .tfr-gallery-img--tall { aspect-ratio:1/1.25; }
  .tfr-gallery-img--wide { grid-column:span 2; aspect-ratio:2/1; }
  .tfr-before-after-section { padding:74px 40px 110px; }
  .tfr-results-heading { height:170px; text-align:left; }
  .tfr-results-backdrop { font-size:clamp(110px,10vw,160px); }
  .tfr-results-heading h2 { font-size:72px; margin-top:-80px; }
  .tfr-ba-stack { grid-template-columns:repeat(3,minmax(0,1fr)); gap:36px; padding:30px 0 0; }
  .tfr-ba-pair { max-width:380px; height:340px; }
  .tfr-ba-label { font-size:38px; }
  .tfr-ba-card { width:205px; height:205px; }
  .tfr-ba-card--before { left:0; top:64px; }
  .tfr-ba-card--after  { right:0; top:128px; left:auto; }
  .tfr-about-section { min-height:auto; padding:80px 40px 110px; display:grid; grid-template-columns:0.95fr 1.05fr; gap:64px; align-items:center; }
  .tfr-about-images { height:560px; margin-bottom:0; }
  .tfr-about-img { width:31%; height:520px; }
  .tfr-about-img--one   { left:0; top:20px; }
  .tfr-about-img--two   { left:34.5%; top:44px; }
  .tfr-about-img--three { left:69%; top:0; }
  .tfr-about-heading-wrap { text-align:left; margin-bottom:34px; }
  .tfr-about-backdrop { font-size:clamp(100px,9vw,150px); }
  .tfr-about-heading-wrap h2 { font-size:62px; margin-top:-60px; }
  .tfr-about-copy { max-width:none; font-size:20px; line-height:1.45; }
  .tfr-policy-section { padding:70px 40px 110px; }
  .tfr-policy-heading { justify-content:flex-start; gap:18px; }
  .tfr-policy-heading span { font-size:58px; line-height:1.2; }
  .tfr-policy-heading h2 { font-size:clamp(110px,10vw,160px); }
  .tfr-policy-list { grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; align-items:stretch; }
  .tfr-policy-card { min-height:320px; padding:24px 24px 28px; display:flex; flex-direction:column; }
  .tfr-policy-card h3 { font-size:40px; margin-bottom:26px; }
  .tfr-policy-copy { font-size:15px; line-height:1.55; }
  .tfr-before-appointment-section, .tfr-aftercare-section { padding:74px 40px 110px; }
  .tfr-before-appointment-section h2, .tfr-aftercare-section h2 { font-size:70px; margin-bottom:58px; text-align:left; }
  .tfr-before-timeline { max-width:880px; margin:0 auto; gap:36px; }
  .tfr-before-timeline::before { left:33px; }
  .tfr-before-step { grid-template-columns:70px 1fr; gap:28px; }
  .tfr-before-node { width:68px; height:68px; }
  .tfr-before-node-num { font-size:18px; }
  .tfr-before-step-body { padding:10px 0 22px; }
  .tfr-before-step-body h3 { font-size:42px; margin-bottom:14px; }
  .tfr-before-step-body p { font-size:16px; line-height:1.6; }
  .tfr-aftercare-list { max-width:1080px; margin:0 auto; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; }
  .tfr-aftercare-card { padding:28px 28px 30px; }
  .tfr-aftercare-card h3 { font-size:38px; margin-bottom:14px; }
  .tfr-aftercare-card p { font-size:15px; line-height:1.6; }
  .tfr-footer-inner { padding:72px 48px 36px; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:48px; align-items:start; }
  .tfr-booking-section { padding:48px 48px 80px; }
  .tfr-booking-services { grid-template-columns:repeat(2,1fr); }
}

/* ── Tablet ── */
@media (min-width:641px) and (max-width:1024px) {
  .tfr-header-section { min-height:auto; }
  .tfr-header-cover { height:320px; min-height:320px; }
  .tfr-header-avatar { top:calc(320px - 95px); width:190px; height:190px; border-width:7px; box-shadow:none; }
  .tfr-header-content { padding:115px 40px 64px; max-width:720px; }
  .tfr-header-buttons { width:min(100%,560px); grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
  .tfr-header-btn { min-height:54px; font-size:15px; }
  .tfr-tab-slider { padding:6px 28px; justify-content:center; gap:8px; }
  .tfr-gallery-group, .tfr-before-after-section, .tfr-about-section, .tfr-policy-section, .tfr-before-appointment-section, .tfr-aftercare-section { width:min(100%,720px); }
  .tfr-gallery-grid { grid-template-columns:repeat(3,1fr); gap:14px; }
  .tfr-policy-list { grid-template-columns:repeat(2,1fr); }
  .tfr-aftercare-list { grid-template-columns:repeat(2,1fr); }
  .tfr-footer-inner { grid-template-columns:1fr 1fr; }
  .tfr-footer-brand { grid-column:1/-1; }
}

/* ── Mobile ── */
@media (max-width:640px) {
  .tfr-header-section { min-height:auto; position:static; display:flex; flex-direction:column; align-items:center; }
  .tfr-header-cover { height:205px; min-height:205px; order:1; width:100%; }
  .tfr-header-avatar { position:static; transform:translateY(-82px); width:165px; height:165px; border-width:5px; order:2; margin-bottom:-50px; box-shadow:none; }
  .tfr-avatar-initials { font-size:38px; }
  .tfr-header-content { order:3; padding:8px 22px 52px; text-align:center; width:100%; }
  .tfr-header-content h1 { font-size:clamp(28px,7vw,48px); }
  .tfr-header-content p { font-size:clamp(24px,6vw,38px); margin:4px 0 32px; }
  .tfr-header-buttons { width:min(100%,348px); max-width:none; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:0 auto; }
  .tfr-header-btn { min-height:48px; height:48px; border-radius:10px; font-size:13px; padding-inline:8px; }
  .tfr-tab-pill { padding:14px 12px; font-size:10px; letter-spacing:0.12em; }
  .tfr-tab-pill::after { left:12px; right:12px; }
  .tfr-booking-section { padding:28px 16px 56px; }
  .tfr-booking-days { gap:6px; }
  .tfr-booking-day { flex:1 1 64px; min-width:60px; padding:10px 6px; }
  .tfr-booking-times { grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:6px; }
  .tfr-gallery-group { padding-left:18px; padding-right:18px; }
  .tfr-about-images { height:220px; }
  .tfr-about-img { width:30%; height:200px; }
  .tfr-about-img--one   { left:0; top:8px; }
  .tfr-about-img--two   { left:33%; top:14px; }
  .tfr-about-img--three { left:66%; top:0; }
  .tfr-booking-step-label { display:none; }
}
`
