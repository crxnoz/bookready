'use client'

/**
 * Opaline — premium luxury beauty + spa template.
 *
 * For estheticians, med spas, lash + brow artists, waxing studios,
 * injectors, PMU artists, and boutique skin clinics that want to feel
 * established, calm, and high-end. The aesthetic is pearl + champagne +
 * marble + silk: bright, soft, generously spaced, timeless. Luxury
 * through restraint — the gold whispers, the whitespace breathes.
 *
 * Visual vocabulary:
 *   - Constant pearl/marble canvas (#F7F3EC); the accent swatch tones
 *     CTAs + ornaments + active states (champagne default).
 *   - Cormorant Garamond display serif + Jost humanist sans.
 *   - Hairline champagne rules, soft small radii, lots of air.
 *   - Tracked uppercase Jost eyebrows over light Cormorant headings.
 *   - Sticky tab rail; the active tab gets a soft champagne-wash pill
 *     (the Opaline signature — distinct from the other templates' bars
 *     and sparkles).
 *
 * All 12 required sections render. Empty data shows a calm empty state.
 * Booking embeds the platform flow via OpalineBooking, re-skinned to
 * the pearl + champagne palette.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import OpalineBooking from './OpalineBooking'

// ── Contact-href helper ──────────────────────────────────────────────────────
// Normalizes bare phone/email/sms input to a scheme, then runs it through the
// shared safeHref allowlist so tenant-controlled values can't inject
// javascript:/data: schemes (matches VelvetTheory + LushStudio).
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
function ensureScheme(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  if (SCHEME_RE.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  if (fallback === 'mailto' && v.includes('@')) return `mailto:${v}`
  if (fallback === 'tel') return `tel:${v.replace(/[^\d+]/g, '')}`
  if (fallback === 'sms') return `sms:${v.replace(/[^\d+]/g, '')}`
  return v
}
function safeContactHref(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  return safeHref(ensureScheme(raw, fallback)) ?? null
}

// ── Brand glyphs lucide doesn't ship (Opaline draws its own SVG icon set so it
// stays dependency-free; sized for the small hero pill at 14px). ──
function TikTokGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
    </svg>
  )
}
function PinterestGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.65 7.88 6.39 9.34-.09-.79-.17-2 .03-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.34-.24 1 .5 1.81 1.49 1.81 1.79 0 3.17-1.89 3.17-4.62 0-2.42-1.74-4.11-4.22-4.11-2.87 0-4.56 2.15-4.56 4.38 0 .87.33 1.8.75 2.31a.3.3 0 0 1 .07.29c-.08.32-.26 1.04-.29 1.18-.05.2-.16.24-.36.15-1.34-.62-2.17-2.59-2.17-4.16 0-3.39 2.46-6.5 7.09-6.5 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.68-5.57 6.68-1.09 0-2.11-.57-2.46-1.24l-.67 2.55c-.24.93-.89 2.1-1.33 2.81.99.31 2.04.47 3.13.47 5.54 0 10.04-4.5 10.04-10.04C22.08 6.5 17.58 2 12.04 2z"/>
    </svg>
  )
}
function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.07 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.94.55 3.74 1.5 5.27L2 22l4.84-1.46a10.05 10.05 0 0 0 5.2 1.46c5.54 0 10.04-4.5 10.04-10.04S17.58 2 12.04 2zm0 18.13a8.07 8.07 0 0 1-4.4-1.27l-.31-.19-2.87.87.86-2.8-.2-.32a8.07 8.07 0 0 1-1.27-4.38c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.09-8.09 8.09z"/>
    </svg>
  )
}
function MessageGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  )
}
function YoutubeGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 12s0-3.2-.41-4.73a2.5 2.5 0 0 0-1.76-1.77C19.31 5.09 12 5.09 12 5.09s-7.31 0-8.83.41A2.5 2.5 0 0 0 1.41 7.27C1 8.8 1 12 1 12s0 3.2.41 4.73a2.5 2.5 0 0 0 1.76 1.77c1.52.41 8.83.41 8.83.41s7.31 0 8.83-.41a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
    </svg>
  )
}
function FacebookGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/>
    </svg>
  )
}

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

// Map website_sections.section_key → TabId. Accepts both canonical and
// legacy keys so older tenants who predate the M3 rename still resolve.
const SECTION_KEY_TO_TAB: Record<string, TabId> = {
  book: 'book',
  gallery: 'gallery',
  results: 'results',
  before_after: 'results',
  about: 'about',
  policy: 'policy',
  policies: 'policy',
  advice: 'advice',
  steps: 'advice',
  timeline: 'timeline',
  before_appointment: 'timeline',
}

// Pick a readable foreground (#FFFFFF or warm near-black) for text sitting
// ON a solid accent fill. Champagne (#B89B72, lum ~0.62) reads cleaner with
// dark text — the threshold below biases toward the warm ink so light/metallic
// accents stay elegant rather than washing out white text.
function pickOnAccent(hex: string | null | undefined): string {
  if (!hex) return '#2A2620'
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#2A2620'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#2A2620' : '#FBF8F2'
}

function fmt12(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const hr = h % 12 || 12
  return `${hr}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function OpalineTemplate({ site, slug }: Props) {
  const p          = site.profile
  const display    = p?.business_name ?? site.business_name ?? site.slug
  const services   = (site.services ?? []).filter(s => s.is_active)
  const hours      = site.hours ?? []
  const settings: any = site.template?.settings ?? {}
  const header: any   = settings.header ?? {}
  const tabs:   any   = settings.tabs ?? {}
  const about:  any   = settings.about ?? {}
  const additionals: any = settings.additionals ?? {}
  const advice:   any[] = Array.isArray(settings.advice?.items)   ? settings.advice.items   : []
  const timeline: any[] = Array.isArray(settings.timeline?.items) ? settings.timeline.items : []
  const gallery       = site.gallery ?? []
  const results       = site.results ?? site.before_after ?? []
  const policies: any = site.policies ?? {}
  const aboutImages: (string | null)[] = Array.isArray(about.images) ? about.images : []

  // Accent (tenant-picked or champagne default). Canvas + ink stay constant.
  const accentHex = settings?.theme?.accent_color || '#B89B72'
  const onAccent  = pickOnAccent(accentHex)

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)

  const enabledByTab: Record<TabId, boolean> = {
    book: true, gallery: true, results: true, about: true,
    policy: true, advice: true, timeline: true,
  }
  const sectionsList = site.template?.sections ?? []
  if (sectionsList.length > 0) {
    for (const s of sectionsList) {
      const tabId = SECTION_KEY_TO_TAB[s.section_key]
      if (tabId) enabledByTab[tabId] = s.is_enabled
    }
  }

  const allTabs: { id: TabId; label: string }[] = [
    { id: 'book',     label: tabs.book_label     ?? 'Reserve' },
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Gallery' },
    { id: 'results',  label: tabs.results_label  ?? 'Results' },
    { id: 'about',    label: tabs.about_label    ?? 'About' },
    { id: 'policy',   label: tabs.policy_label   ?? 'Policies' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Care' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Visit' },
  ]
  const visibleTabs = allTabs.filter(t => t.id === 'book' || enabledByTab[t.id])

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      <style>{OPALINE_CSS}</style>
      <div
        className="opaline-template"
        style={{
          ['--opaline-accent' as any]: accentHex,
          ['--opaline-on-accent' as any]: onAccent,
        }}
      >

        {/* 1. Announcement */}
        {header.show_announcement && header.announcement_text && (
          <div className="opaline-announce">
            <span className="opaline-announce-mark" aria-hidden="true">&#9670;</span>
            <span>{header.announcement_text}</span>
            <span className="opaline-announce-mark" aria-hidden="true">&#9670;</span>
          </div>
        )}

        {/* 2. Header / Hero */}
        <header className="opaline-header">
          {header.cover_image_url && (
            <div className="opaline-cover-wrap">
              <img className="opaline-cover" src={header.cover_image_url} alt="" />
              <div className="opaline-cover-veil" aria-hidden="true" />
            </div>
          )}
          <div className="opaline-header-inner">
            {header.avatar_image_url && (
              <img className="opaline-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="opaline-eyebrow">{p?.business_type || 'Studio'}</p>
            <h1 className="opaline-name">{display}</h1>
            {p?.tagline && <p className="opaline-tagline">{p.tagline}</p>}
            <span className="opaline-rule-ornament" aria-hidden="true" />
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail ── */}
        <div className="opaline-tab-rail" ref={tabRailRef}>
          <div className="opaline-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`opaline-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Reserve / Book */}
        <div className={`opaline-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="opaline-section opaline-book" aria-label={tabs.book_label ?? 'Reserve'}>
            <OpalineBooking
              slug={slug}
              services={services}
              displayName={display}
              availability={site.availability ?? null}
              paymentSettings={site.payment_settings ?? null}
              requirePolicyAgreement={site.policies?.require_policy_agreement ?? false}
              serviceAddons={site.service_addons ?? []}
              staffMembers={site.staff ?? []}
              serviceCategories={site.service_categories ?? []}
              bookingQuestions={site.booking_questions ?? []}
            />
          </section>
        </div>

        {/* 4. Gallery */}
        {enabledByTab.gallery && (
          <div className={`opaline-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <section className="opaline-section" aria-label={tabs.gallery_label ?? 'Gallery'}>
              <SectionHeader eyebrow={tabs.gallery_label ?? 'Gallery'} title="Portfolio" />
              {gallery.length === 0 ? (
                <p className="opaline-empty">A curated gallery of recent work will appear here.</p>
              ) : (
                <ul className="opaline-gallery-grid">
                  {gallery.map(g => (
                    <li key={g.id} className="opaline-gallery-item">
                      <img src={g.image_url} alt={g.alt_text ?? ''} loading="lazy" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 5. Results / Before & After */}
        {enabledByTab.results && (
          <div className={`opaline-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <section className="opaline-section" aria-label={tabs.results_label ?? 'Results'}>
              <SectionHeader eyebrow={tabs.results_label ?? 'Results'} title="Before & After" />
              {results.length === 0 ? (
                <p className="opaline-empty">Before-and-after results will be shown here.</p>
              ) : (
                <div className="opaline-ba-stack">
                  {results.map((r: any) => (
                    <article key={r.id} className="opaline-ba">
                      <figure className="opaline-ba-pane">
                        <span className="opaline-ba-label">Before</span>
                        <img src={r.before_image_url} alt={r.before_alt_text ?? 'Before'} loading="lazy" />
                      </figure>
                      <span className="opaline-ba-sep" aria-hidden="true">&#9670;</span>
                      <figure className="opaline-ba-pane">
                        <span className="opaline-ba-label">After</span>
                        <img src={r.after_image_url} alt={r.after_alt_text ?? 'After'} loading="lazy" />
                      </figure>
                      {r.caption && <p className="opaline-ba-caption">{r.caption}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 6. About */}
        {enabledByTab.about && (
          <div className={`opaline-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="opaline-section opaline-about" aria-label={tabs.about_label ?? 'About'}>
              {aboutImages[0] && (
                <div className="opaline-about-feature">
                  <img src={aboutImages[0]!} alt="" loading="lazy" />
                </div>
              )}
              <SectionHeader eyebrow={about.eyebrow || (tabs.about_label ?? 'About')} title={about.heading ?? 'About'} />
              {about.body && <p className="opaline-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="opaline-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      {h.title && <h3>{h.title}</h3>}
                      {h.body && <p>{h.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(aboutImages[1] || aboutImages[2]) && (
                <div className="opaline-about-pair">
                  {[aboutImages[1], aboutImages[2]].map((img, i) => (
                    img
                      ? <div key={i} className="opaline-about-pair-img"><img src={img} alt="" loading="lazy" /></div>
                      : <div key={i} className="opaline-about-pair-img opaline-about-pair-img--empty" aria-hidden="true" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 7. Policies */}
        {enabledByTab.policy && (
          <div className={`opaline-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <section className="opaline-section" aria-label={tabs.policy_label ?? 'Policies'}>
              <SectionHeader eyebrow={tabs.policy_label ?? 'Policies'} title="Good to Know" />
              <div className="opaline-policy-list">
                <PolicyRow label="Cancellation" body={policies.cancellation_policy} />
                <PolicyRow label="Late Arrival" body={policies.late_policy} />
                <PolicyRow label="No-Show"      body={policies.no_show_policy} />
                <PolicyRow label="Deposit"      body={policies.deposit_policy} />
                <PolicyRow label="Rescheduling" body={policies.reschedule_policy} />
                <PolicyRow label="Guests"       body={policies.guest_policy} />
                {Array.isArray(policies.custom_groups) && policies.custom_groups.map((g: any, gi: number) => (
                  Array.isArray(g.items)
                    ? g.items.map((it: any, ii: number) => (
                        <PolicyRow key={`c${gi}-${ii}`} label={it.title} body={it.content ?? it.body} />
                      ))
                    : <PolicyRow key={`c${gi}`} label={g.heading} body={g.body} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 8. Advice / Care */}
        {enabledByTab.advice && (
          <div className={`opaline-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <section className="opaline-section" aria-label={tabs.advice_label ?? 'Care'}>
              <SectionHeader eyebrow={tabs.advice_label ?? 'Care'} title={settings.advice?.heading ?? 'Care notes'} />
              {advice.length === 0 ? (
                <p className="opaline-empty">Aftercare guidance will appear here.</p>
              ) : (
                <ul className="opaline-care-list">
                  {advice.map((it: any, i: number) => (
                    <li key={i} className="opaline-care">
                      <span className="opaline-care-mark" aria-hidden="true">&#9670;</span>
                      <div>
                        {settings.advice?.card_kicker && (
                          <span className="opaline-card-kicker">{settings.advice.card_kicker}</span>
                        )}
                        {it.title && <h3>{it.title}</h3>}
                        {it.body && <p>{it.body}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 9. Timeline / Visit */}
        {enabledByTab.timeline && (
          <div className={`opaline-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <section className="opaline-section" aria-label={tabs.timeline_label ?? 'Visit'}>
              <SectionHeader eyebrow={tabs.timeline_label ?? 'Visit'} title={settings.timeline?.heading ?? 'Your visit'} />
              {timeline.length === 0 ? (
                <p className="opaline-empty">A simple step-by-step of your visit will appear here.</p>
              ) : (
                <ol className="opaline-timeline">
                  {timeline.map((it: any, i: number) => (
                    <li key={i}>
                      <span className="opaline-timeline-num">{String(i + 1).padStart(2, '0')}</span>
                      <div className="opaline-timeline-body">
                        {settings.timeline?.card_kicker && (
                          <span className="opaline-card-kicker">{settings.timeline.card_kicker}</span>
                        )}
                        {it.title && <h3>{it.title}</h3>}
                        {it.body && <p>{it.body}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false
          && Array.isArray(additionals.faq?.items)
          && additionals.faq.items.length > 0 && (
          <section className="opaline-section" aria-label="FAQ">
            <SectionHeader eyebrow="Questions" title={additionals.faq.heading ?? 'Frequently asked'} />
            <div className="opaline-faq-list">
              {additionals.faq.items.map((f: any, i: number) => (
                <details key={i} className="opaline-faq">
                  <summary>{f.q ?? f.question}</summary>
                  <p>{f.a ?? f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* 11. Reviews */}
        {additionals.reviews?.enabled !== false
          && Array.isArray(additionals.reviews?.items)
          && additionals.reviews.items.length > 0 && (
          <section className="opaline-section" aria-label="Reviews">
            <SectionHeader eyebrow="Kind Words" title={additionals.reviews.heading ?? 'What clients say'} />
            <ul className="opaline-reviews">
              {additionals.reviews.items.map((rv: any, i: number) => (
                <li key={i} className="opaline-review">
                  <span className="opaline-review-quote" aria-hidden="true">&#8220;</span>
                  {typeof rv.rating === 'number' && rv.rating > 0 && (
                    <div className="opaline-review-stars" aria-label={`${rv.rating} of 5`}>
                      {'♦'.repeat(Math.max(0, Math.min(5, Math.round(rv.rating))))}
                    </div>
                  )}
                  <blockquote>{rv.body ?? rv.quote}</blockquote>
                  <p className="opaline-review-attr">
                    {rv.author ?? rv.name}
                    {rv.location && <span> &middot; {rv.location}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 12. Thank-you */}
        {additionals.show_thank_you !== false && additionals.thank_you_title && (
          <section className="opaline-section opaline-thanks" aria-label="Thank you">
            <p className="opaline-eyebrow">With Gratitude</p>
            <h2 className="opaline-thanks-title">{additionals.thank_you_title}</h2>
            {additionals.thank_you_body && <p className="opaline-thanks-body">{additionals.thank_you_body}</p>}
            <p className="opaline-thanks-sign">&mdash; {(typeof additionals.thank_you_signature === 'string' && additionals.thank_you_signature.trim()) || display}</p>
          </section>
        )}

        <Footer site={site} hours={hours} services={services} goBook={goBook} />
      </div>
    </>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="opaline-section-head">
      <p className="opaline-eyebrow">{eyebrow}</p>
      <h2 className="opaline-section-title">{title}</h2>
    </header>
  )
}

function PolicyRow({ label, body }: { label: string; body?: string | null }) {
  if (!body) return null
  return (
    <div className="opaline-policy">
      <h3 className="opaline-policy-title">{label}</h3>
      <p className="opaline-policy-text" style={{ whiteSpace: 'pre-wrap' }}>{body}</p>
    </div>
  )
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  // Each entry resolves its own href (URL override → profile fallback) and
  // carries an optional icon. The brand/contact buttons get a glyph; the
  // text-forward Reserve/Call/Email/etc. labels carry the meaning on their own.
  const btns: { key: string; href: string | null; label: string; icon?: React.ReactNode }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'message',    href: safeContactHref(header.message_button_url, 'sms'), label: 'Message', icon: <MessageGlyph /> },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'tiktok',     href: safeHref(header.tiktok_button_url) ?? null, label: 'TikTok', icon: <TikTokGlyph /> },
    { key: 'youtube',    href: safeHref(header.youtube_button_url) ?? null, label: 'YouTube', icon: <YoutubeGlyph /> },
    { key: 'facebook',   href: safeHref(header.facebook_button_url) ?? null, label: 'Facebook', icon: <FacebookGlyph /> },
    { key: 'pinterest',  href: safeHref(header.pinterest_button_url) ?? null, label: 'Pinterest', icon: <PinterestGlyph /> },
    { key: 'whatsapp',   href: safeHref(header.whatsapp_button_url) ?? null, label: 'WhatsApp', icon: <WhatsAppGlyph /> },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions' },
  ]
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="opaline-social" aria-label="Contact">
      {visible.map(b => {
        const isReserve = b.key === 'book' && !header.book_button_url
        const onClick = isReserve
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        const isWeb = !!b.href && /^https?:/i.test(b.href)
        return (
          <a
            key={b.key}
            href={safeHref(b.href!)}
            target={!isReserve && isWeb ? '_blank' : undefined}
            rel={!isReserve && isWeb ? 'noopener noreferrer' : undefined}
            className={`opaline-social-btn opaline-social-btn--${b.key}${b.key === 'book' ? ' opaline-social-btn--primary' : ''}`}
            onClick={onClick}
          >
            {b.icon && <span className="opaline-social-ico" aria-hidden="true">{b.icon}</span>}
            {b.label}
          </a>
        )
      })}
    </nav>
  )
}

function Footer({ site, hours, services, goBook }: { site: PublicSite; hours: any[]; services: any[]; goBook: () => void }) {
  const settings: any = site.template?.settings ?? {}
  const footer:   any = settings.footer ?? {}
  const p           = site.profile
  const name        = footer.business_name_override ?? p?.business_name ?? site.business_name ?? site.slug
  const sorted = hours
    ? [...hours.filter((h: any) => h.day_of_week !== 0), ...hours.filter((h: any) => h.day_of_week === 0)]
    : []
  return (
    <footer className="opaline-footer">
      {footer.show_quick_book !== false && services.length > 0 && (
        <div className="opaline-footer-cta-band">
          <button type="button" className="opaline-footer-book" onClick={goBook}>
            Reserve your appointment
          </button>
        </div>
      )}

      <div className="opaline-footer-inner">
        <div className="opaline-footer-col opaline-footer-brand">
          <p className="opaline-eyebrow">The Studio</p>
          <p className="opaline-footer-name">{name}</p>
          {footer.subtext && <p className="opaline-footer-subtext">{footer.subtext}</p>}
        </div>

        {footer.show_hours !== false && sorted.length > 0 && (
          <div className="opaline-footer-col opaline-footer-col--hours">
            <p className="opaline-eyebrow">Hours</p>
            <dl className="opaline-footer-hours">
              {sorted.map((h: any) => (
                <div key={h.day_of_week ?? h.id} className="opaline-footer-hours-row">
                  <dt>{h.day_name}</dt>
                  <dd>
                    {h.is_open && h.open_time && h.close_time
                      ? `${fmt12(h.open_time)} – ${fmt12(h.close_time)}`
                      : 'Closed'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {footer.show_contact_links !== false && (p?.public_phone || p?.public_email) && (
          <div className="opaline-footer-col">
            <p className="opaline-eyebrow">Contact</p>
            <ul className="opaline-footer-contact">
              {p?.public_phone && <li><a href={`tel:${p.public_phone.replace(/[^\d+]/g, '')}`}>{p.public_phone}</a></li>}
              {p?.public_email && <li><a href={`mailto:${p.public_email}`}>{p.public_email}</a></li>}
            </ul>
          </div>
        )}
      </div>

      {footer.show_powered_by !== false && (
        <div className="opaline-footer-credit-band">
          <p>Powered by BookReady</p>
        </div>
      )}
    </footer>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const OPALINE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');

.opaline-template {
  ${tokensToCss()}
  --opaline-bg: #F7F3EC;
  --opaline-surface: #FCFAF5;
  --opaline-ink: #2A2620;
  --opaline-muted: #857C70;
  --opaline-rule: rgba(42,38,32,0.12);
  --opaline-accent: #B89B72;
  --opaline-on-accent: #2A2620;
  --opaline-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --opaline-body: 'Jost', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  background: var(--opaline-bg);
  color: var(--opaline-ink);
  font-family: var(--opaline-body);
  font-size: 16px;
  font-weight: 300;
  line-height: 1.65;
  letter-spacing: 0.01em;
  min-height: 100vh;
  /* overflow-x:clip (NOT hidden) so the sticky tab rail keeps sticking. */
  overflow-x: clip;
}
.opaline-template *, .opaline-template *::before, .opaline-template *::after { box-sizing: border-box; }
.opaline-template img { max-width: 100%; display: block; }
.opaline-template a { color: inherit; text-decoration: none; }
.opaline-template :focus-visible { outline: 2px solid var(--opaline-accent); outline-offset: 3px; }

/* ── Shared eyebrow + section header ── */
.opaline-eyebrow {
  margin: 0;
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--opaline-accent);
}
.opaline-section-head {
  text-align: center;
  margin: 0 auto 44px;
  max-width: 640px;
}
.opaline-section-title {
  margin: 14px 0 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: clamp(38px, 5.4vw, 60px);
  line-height: 1.04;
  letter-spacing: 0.005em;
  color: var(--opaline-ink);
}
.opaline-empty {
  text-align: center;
  color: var(--opaline-muted);
  font-style: italic;
  font-family: var(--opaline-display);
  font-size: 19px;
  padding: 28px 0;
}

/* ── Announcement ── */
.opaline-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 13px 24px;
  background: var(--opaline-surface);
  border-bottom: 1px solid var(--opaline-rule);
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--opaline-ink);
  text-align: center;
}
.opaline-announce-mark { color: var(--opaline-accent); font-size: 7px; }

/* ── Header / Hero ── */
.opaline-header { position: relative; }
.opaline-cover-wrap { position: relative; width: 100%; }
.opaline-cover {
  width: 100%;
  height: clamp(280px, 52vw, 560px);
  object-fit: cover;
  filter: saturate(0.94) brightness(1.02);
}
.opaline-cover-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(247,243,236,0) 40%, rgba(247,243,236,0.55) 100%);
  pointer-events: none;
}
.opaline-header-inner {
  position: relative;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: clamp(48px, 7vw, 80px) var(--brk-space-md) clamp(40px, 6vw, 64px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* When a cover exists, lift the identity card up into the soft veil. */
.opaline-cover-wrap + .opaline-header-inner { margin-top: -64px; }
.opaline-avatar {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  object-fit: cover;
  margin: 0 0 22px;
  border: 1px solid var(--opaline-rule);
  background: var(--opaline-surface);
  box-shadow: 0 8px 30px rgba(42,38,32,0.10);
}
.opaline-name {
  margin: 14px 0 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: clamp(46px, 8vw, 88px);
  line-height: 1.0;
  letter-spacing: 0.004em;
  color: var(--opaline-ink);
}
.opaline-tagline {
  margin: 16px 0 0;
  max-width: 46ch;
  font-family: var(--opaline-display);
  font-style: italic;
  font-size: clamp(18px, 2.4vw, 23px);
  line-height: 1.5;
  color: var(--opaline-muted);
}
.opaline-rule-ornament {
  display: block;
  width: 56px;
  height: 1px;
  margin: 30px auto;
  background: var(--opaline-accent);
  opacity: 0.7;
}

/* Hero buttons — refined hairline pills, generous padding, calm. */
.opaline-social {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.opaline-social-btn {
  display: inline-flex;
  align-items: center;
  padding: 13px 26px;
  border: 1px solid var(--opaline-rule);
  border-radius: 2px;
  background: transparent;
  color: var(--opaline-ink);
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
}
.opaline-social-btn:hover {
  border-color: var(--opaline-accent);
  color: var(--opaline-accent);
}
.opaline-social-btn--primary {
  background: var(--opaline-accent);
  border-color: var(--opaline-accent);
  color: var(--opaline-on-accent);
}
.opaline-social-btn--primary:hover {
  color: var(--opaline-on-accent);
  filter: brightness(1.04);
}
/* Inline glyph that precedes the label on the brand/contact pills. Inherits
   currentColor so it tracks the same hover shift as the text. */
.opaline-social-ico {
  display: inline-flex;
  align-items: center;
  margin-right: 9px;
  color: currentColor;
}
.opaline-social-ico svg { display: block; }
/* Per-type hairline buttons (message + social brands). They share the calm
   pill shell above; the hover simply warms toward the champagne accent like
   the base rule, kept explicit here so future per-brand tints have a home. */
.opaline-social-btn--message:hover,
.opaline-social-btn--tiktok:hover,
.opaline-social-btn--youtube:hover,
.opaline-social-btn--facebook:hover,
.opaline-social-btn--pinterest:hover,
.opaline-social-btn--whatsapp:hover {
  border-color: var(--opaline-accent);
  color: var(--opaline-accent);
}

/* ── Sticky tab rail ── Signature: the active tab fills with a soft
   champagne wash pill (distinct from the other templates' bars + marks). */
.opaline-tab-rail {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--opaline-bg) 86%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--opaline-rule);
  border-bottom: 1px solid var(--opaline-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.opaline-tab-rail::-webkit-scrollbar { display: none; }
.opaline-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: 12px var(--brk-space-md);
  gap: 6px;
}
.opaline-tab-pill {
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  border-radius: 999px;
  padding: 11px 22px;
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--opaline-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease, background 220ms ease;
}
.opaline-tab-pill:hover { color: var(--opaline-ink); }
.opaline-tab-pill.is-active {
  color: var(--opaline-ink);
  background: color-mix(in srgb, var(--opaline-accent) 16%, transparent);
}

.opaline-tab-panel { display: none; }
.opaline-tab-panel.is-active { display: block; }

/* ── Section frame ── generous, breathing. */
.opaline-section {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(64px, 8vw, 104px) var(--brk-space-md);
}
.opaline-book { padding-top: clamp(40px, 5vw, 64px); }

/* ── Gallery ── */
.opaline-gallery-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}
.opaline-gallery-item {
  overflow: hidden;
  border-radius: 3px;
  border: 1px solid var(--opaline-rule);
  background: var(--opaline-surface);
  aspect-ratio: 4/5;
}
.opaline-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
@media (min-width: 641px) { .opaline-gallery-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1025px) { .opaline-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 22px; } }

/* ── Results / Before-After diptych ── */
.opaline-ba-stack { display: flex; flex-direction: column; gap: 56px; max-width: 920px; margin: 0 auto; }
.opaline-ba {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
}
.opaline-ba-pane { margin: 0; position: relative; }
.opaline-ba-pane img {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid var(--opaline-rule);
}
.opaline-ba-label {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  padding: 5px 12px;
  background: color-mix(in srgb, var(--opaline-bg) 86%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid var(--opaline-rule);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--opaline-ink);
}
.opaline-ba-sep { color: var(--opaline-accent); font-size: 10px; align-self: center; }
.opaline-ba-caption {
  grid-column: 1 / -1;
  margin: 6px 0 0;
  text-align: center;
  font-family: var(--opaline-display);
  font-style: italic;
  font-size: 18px;
  color: var(--opaline-muted);
}
@media (max-width: 640px) {
  .opaline-ba { grid-template-columns: 1fr; }
  .opaline-ba-sep { display: none; }
}

/* ── About ── */
.opaline-about { max-width: 880px; }
.opaline-about-feature {
  margin: 0 0 52px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--opaline-rule);
  aspect-ratio: 16/9;
}
.opaline-about-feature img { width: 100%; height: 100%; object-fit: cover; }
.opaline-about-body {
  max-width: 60ch;
  margin: 0 auto;
  text-align: center;
  font-size: 18px;
  line-height: 1.85;
  color: color-mix(in srgb, var(--opaline-ink) 88%, var(--opaline-muted));
}
.opaline-highlights {
  list-style: none;
  margin: 52px auto 0;
  padding: 0;
  max-width: 720px;
  display: grid;
  gap: 0;
}
.opaline-highlights > li {
  padding: 28px 0;
  border-top: 1px solid var(--opaline-rule);
  text-align: center;
}
.opaline-highlights > li:last-child { border-bottom: 1px solid var(--opaline-rule); }
.opaline-highlights h3 {
  margin: 0 0 8px;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 25px;
  letter-spacing: 0.005em;
  color: var(--opaline-ink);
}
.opaline-highlights p { margin: 0; font-size: 15px; line-height: 1.7; color: var(--opaline-muted); }
.opaline-about-pair {
  margin: 56px auto 0;
  max-width: 720px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.opaline-about-pair-img {
  overflow: hidden;
  border-radius: 3px;
  border: 1px solid var(--opaline-rule);
  aspect-ratio: 4/5;
}
.opaline-about-pair-img img { width: 100%; height: 100%; object-fit: cover; }
.opaline-about-pair-img--empty {
  background: linear-gradient(135deg, color-mix(in srgb, var(--opaline-accent) 6%, var(--opaline-surface)), color-mix(in srgb, var(--opaline-accent) 14%, var(--opaline-surface)));
}

/* ── Policies ── hairline-divided ledger, no boxes. */
.opaline-policy-list { max-width: 720px; margin: 0 auto; border-top: 1px solid var(--opaline-rule); }
.opaline-policy { padding: 30px 0; border-bottom: 1px solid var(--opaline-rule); }
.opaline-policy-title {
  margin: 0 0 10px;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 26px;
  letter-spacing: 0.005em;
  color: var(--opaline-ink);
}
.opaline-policy-text { margin: 0; font-size: 15px; line-height: 1.75; color: var(--opaline-muted); }

/* ── Advice / Care ── */
.opaline-care-list { list-style: none; margin: 0 auto; padding: 0; max-width: 720px; display: grid; gap: 0; }
.opaline-care {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 18px;
  padding: 28px 0;
  border-top: 1px solid var(--opaline-rule);
  align-items: start;
}
.opaline-care:last-child { border-bottom: 1px solid var(--opaline-rule); }
.opaline-care-mark { color: var(--opaline-accent); font-size: 13px; line-height: 1.9; text-align: center; }

/* Small tracked-uppercase kicker label above an advice/timeline item title
   (rendered from settings.advice.card_kicker / settings.timeline.card_kicker). */
.opaline-card-kicker {
  display: block;
  margin: 0 0 6px;
  font-family: var(--opaline-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--opaline-accent);
}
.opaline-care h3 {
  margin: 0 0 6px;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 24px;
  color: var(--opaline-ink);
}
.opaline-care p { margin: 0; font-size: 15px; line-height: 1.7; color: var(--opaline-muted); }

/* ── Timeline / Visit ── */
.opaline-timeline { list-style: none; margin: 0 auto; padding: 0; max-width: 720px; }
.opaline-timeline > li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 26px;
  padding: 30px 0;
  border-top: 1px solid var(--opaline-rule);
  align-items: baseline;
}
.opaline-timeline > li:last-child { border-bottom: 1px solid var(--opaline-rule); }
.opaline-timeline-num {
  font-family: var(--opaline-display);
  font-weight: 400;
  font-size: 40px;
  line-height: 1;
  color: var(--opaline-accent);
  font-variant-numeric: tabular-nums;
}
.opaline-timeline-body h3 {
  margin: 0 0 8px;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 25px;
  color: var(--opaline-ink);
}
.opaline-timeline-body p { margin: 0; font-size: 15px; line-height: 1.7; color: var(--opaline-muted); }

/* ── FAQ ── */
.opaline-faq-list { max-width: 760px; margin: 0 auto; border-top: 1px solid var(--opaline-rule); }
.opaline-faq { border-bottom: 1px solid var(--opaline-rule); }
.opaline-faq summary {
  list-style: none;
  cursor: pointer;
  padding: 26px 40px 26px 0;
  position: relative;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 22px;
  color: var(--opaline-ink);
}
.opaline-faq summary::-webkit-details-marker { display: none; }
.opaline-faq summary::after {
  content: '+';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--opaline-body);
  font-size: 22px;
  font-weight: 300;
  color: var(--opaline-accent);
  transition: transform 200ms ease;
}
.opaline-faq[open] summary::after { content: '\\2013'; }
.opaline-faq p {
  margin: 0;
  padding: 0 40px 28px 0;
  font-size: 15px;
  line-height: 1.75;
  color: var(--opaline-muted);
}

/* ── Reviews ── editorial quote cards. */
.opaline-reviews {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
@media (min-width: 821px) { .opaline-reviews { grid-template-columns: repeat(2, 1fr); } }
.opaline-review {
  position: relative;
  padding: 40px 36px 32px;
  background: var(--opaline-surface);
  border: 1px solid var(--opaline-rule);
  border-radius: 4px;
}
.opaline-review-quote {
  position: absolute;
  top: 6px;
  left: 22px;
  font-family: var(--opaline-display);
  font-size: 72px;
  line-height: 1;
  color: var(--opaline-accent);
  opacity: 0.32;
}
.opaline-review-stars { color: var(--opaline-accent); font-size: 11px; letter-spacing: 0.3em; margin: 0 0 14px; }
.opaline-review blockquote {
  margin: 0 0 18px;
  font-family: var(--opaline-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--opaline-ink);
}
.opaline-review-attr {
  margin: 0;
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--opaline-muted);
}

/* ── Thank-you ── */
.opaline-thanks { text-align: center; max-width: 680px; }
.opaline-thanks-title {
  margin: 14px 0 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  color: var(--opaline-ink);
}
.opaline-thanks-body {
  margin: 22px auto 0;
  max-width: 52ch;
  font-size: 17px;
  line-height: 1.8;
  color: var(--opaline-muted);
}
.opaline-thanks-sign {
  margin: 30px 0 0;
  font-family: var(--opaline-display);
  font-style: italic;
  font-size: 24px;
  color: var(--opaline-accent);
}

/* ── Footer — 3-band ── */
.opaline-footer { border-top: 1px solid var(--opaline-rule); background: var(--opaline-surface); }
.opaline-footer-cta-band {
  padding: clamp(48px, 6vw, 72px) 24px;
  text-align: center;
  border-bottom: 1px solid var(--opaline-rule);
}
.opaline-footer-book {
  display: inline-flex;
  align-items: center;
  padding: 17px 44px;
  background: var(--opaline-accent);
  color: var(--opaline-on-accent);
  border: 1px solid var(--opaline-accent);
  border-radius: 2px;
  font-family: var(--opaline-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 180ms ease;
}
.opaline-footer-book:hover { filter: brightness(1.05); }
.opaline-footer-inner {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(56px, 7vw, 80px) var(--brk-space-md);
  display: grid;
  grid-template-columns: 1fr;
  gap: 44px;
}
@media (min-width: 720px) {
  .opaline-footer-inner { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0; }
  .opaline-footer-col { padding: 0 44px; }
  .opaline-footer-col:first-child { padding-left: 0; }
  .opaline-footer-col:last-child { padding-right: 0; }
  .opaline-footer-col + .opaline-footer-col { border-left: 1px solid var(--opaline-rule); }
}
.opaline-footer-col { display: flex; flex-direction: column; gap: 14px; }
.opaline-footer-brand { gap: 12px; }
.opaline-footer-col--hours { min-width: 250px; }
.opaline-footer-name {
  margin: 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 34px;
  line-height: 1;
  color: var(--opaline-ink);
}
.opaline-footer-subtext {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--opaline-muted);
  max-width: 34ch;
}
.opaline-footer-hours { margin: 0; display: flex; flex-direction: column; }
.opaline-footer-hours-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 9px 0;
  border-top: 1px solid var(--opaline-rule);
  font-size: 13px;
}
.opaline-footer-hours-row:first-child { border-top: 0; padding-top: 0; }
.opaline-footer-hours-row dt {
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--opaline-ink);
}
.opaline-footer-hours-row dd { margin: 0; color: var(--opaline-muted); font-variant-numeric: tabular-nums; }
.opaline-footer-contact { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; font-size: 14px; }
.opaline-footer-contact a { color: var(--opaline-ink); transition: color 180ms ease; }
.opaline-footer-contact a:hover { color: var(--opaline-accent); }
.opaline-footer-credit-band {
  padding: 18px 24px;
  border-top: 1px solid var(--opaline-rule);
  text-align: center;
}
.opaline-footer-credit-band p {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--opaline-muted);
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .opaline-tab-pill,
  .opaline-social-btn,
  .opaline-faq summary::after,
  .opaline-footer-book,
  .opaline-footer-contact a { transition: none !important; }
}
`
