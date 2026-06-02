'use client'

/**
 * The Fade Room — late-night neon nail + lash studio template.
 *
 * Visual language:
 *   - Deep midnight canvas (#0F0A1A) with a tenant-pickable neon accent
 *     (default hot pink #FF3DBE; full palette in manifest.ts)
 *   - Bricolage Grotesque for display + Inter for body — playful but
 *     legible, more personality than Blackline's Space Grotesk
 *   - Soft 8–12px rounded corners (friendlier than Blackline's hard
 *     zero, more confident than Lush's soft cards)
 *   - Subtle neon glow on accent surfaces — accent text-shadow on
 *     eyebrows + section titles, box-shadow on CTAs/active states
 *   - Pill-shaped buttons (vs Blackline's square pills) — fits the
 *     fun, after-hours energy
 *
 * Section structure mirrors Blackline / VT: sticky tab rail with 7
 * panels (book, gallery, results, about, policy, advice, timeline),
 * plus always-visible FAQ + Reviews + Thank-you + Footer below.
 */

import { useState, useRef, type ComponentType } from 'react'
import { CalendarPlus, Phone, Mail, Instagram, MapPin, MessageSquare, Youtube, Facebook } from 'lucide-react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import TheFadeRoomBooking from './TheFadeRoomBooking'

// ── Brand glyphs lucide doesn't ship (sized to match the lucide icons
//    in the social pills — see SocialButtons). ──
function TikTokGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
    </svg>
  )
}
function PinterestGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.65 7.88 6.39 9.34-.09-.79-.17-2 .03-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.34-.24 1 .5 1.81 1.49 1.81 1.79 0 3.17-1.89 3.17-4.62 0-2.42-1.74-4.11-4.22-4.11-2.87 0-4.56 2.15-4.56 4.38 0 .87.33 1.8.75 2.31a.3.3 0 0 1 .07.29c-.08.32-.26 1.04-.29 1.18-.05.2-.16.24-.36.15-1.34-.62-2.17-2.59-2.17-4.16 0-3.39 2.46-6.5 7.09-6.5 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.68-5.57 6.68-1.09 0-2.11-.57-2.46-1.24l-.67 2.55c-.24.93-.89 2.1-1.33 2.81.99.31 2.04.47 3.13.47 5.54 0 10.04-4.5 10.04-10.04C22.08 6.5 17.58 2 12.04 2z"/>
    </svg>
  )
}
function WhatsAppGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.07 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.94.55 3.74 1.5 5.27L2 22l4.84-1.46a10.05 10.05 0 0 0 5.2 1.46c5.54 0 10.04-4.5 10.04-10.04S17.58 2 12.04 2zm0 18.13a8.07 8.07 0 0 1-4.4-1.27l-.31-.19-2.87.87.86-2.8-.2-.32a8.07 8.07 0 0 1-1.27-4.38c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.09-8.09 8.09z"/>
    </svg>
  )
}

// Normalize a bare phone number into an sms: URI (mirrors VT/Lush's
// safeContactHref(url, 'sms')). Already-schemed values pass through to
// safeHref, which enforces the allowlist (sms:/tel:/mailto:/http(s):).
function smsHref(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v) || v.startsWith('//')) return v
  return `sms:${v.replace(/[^\d+]/g, '')}`
}

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

// Section keys → tab IDs. Accepts canonical + legacy (TFR previously
// used 'aftercare' for advice and 'before' for timeline; the M3 migration
// canonicalized them but legacy keys remain valid for older tenants).
const SECTION_KEY_TO_TAB: Record<string, TabId> = {
  book: 'book',
  gallery: 'gallery',
  results: 'results',
  before_after: 'results',
  about: 'about',
  policy: 'policy',
  policies: 'policy',
  advice: 'advice',
  aftercare: 'advice',
  steps: 'advice',
  timeline: 'timeline',
  before: 'timeline',
  before_appointment: 'timeline',
}

export default function TheFadeRoomTemplate({ site, slug }: Props) {
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

  // Resolve accent — tenant-picked or pink default.
  const accent = settings?.theme?.accent_color || '#FF3DBE'

  // ── Tab state ──
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
    { id: 'book',     label: tabs.book_label     ?? 'Book' },
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Work' },
    { id: 'results',  label: tabs.results_label  ?? 'Before / After' },
    { id: 'about',    label: tabs.about_label    ?? 'The Shop' },
    { id: 'policy',   label: tabs.policy_label   ?? 'House Rules' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Notes' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Process' },
  ]
  const visibleTabs = allTabs.filter(t => t.id === 'book' || enabledByTab[t.id])

  // Reuse the exact resolved tab labels for each tabbed section's eyebrow,
  // so editing a tab name in the editor updates both the rail pill and the
  // section's small uppercase eyebrow.
  const tabLabel = Object.fromEntries(allTabs.map(t => [t.id, t.label])) as Record<TabId, string>

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=DM+Serif+Text:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap"
      />
      <style>{TFR_CSS}</style>
      <div
        className="tfr-template"
        style={{
          ['--tfr-accent' as any]: accent,
        }}
      >

        {/* 1. Announcement bar */}
        {header.show_announcement && header.announcement_text && (
          <div className="tfr-announce">
            <span className="tfr-announce-spark" aria-hidden="true">✦</span>
            <span>{header.announcement_text}</span>
            <span className="tfr-announce-spark" aria-hidden="true">✦</span>
          </div>
        )}

        {/* 2. Header / Hero */}
        <header className="tfr-header">
          {header.cover_image_url && (
            <div className="tfr-cover-wrap">
              <img className="tfr-cover" src={header.cover_image_url} alt="" />
              <div className="tfr-cover-tint" aria-hidden="true" />
            </div>
          )}
          <div className="tfr-header-inner">
            {header.avatar_image_url && (
              <img className="tfr-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="tfr-eyebrow">The Studio</p>
            <h1 className="tfr-name">{display}</h1>
            {p?.business_type && (
              <p className="tfr-business-type">{p.business_type}</p>
            )}
            {p?.tagline && (
              <p className="tfr-tagline">{p.tagline}</p>
            )}
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail ── */}
        <div className="tfr-tab-rail" ref={tabRailRef}>
          <div className="tfr-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
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

        {/* ── Tab panels — all in DOM, only is-active visible (preserves
            booking form state across tab switches) ── */}

        {/* 3. Book — eyebrow + title removed, the booking flow's own
            internal step labels carry that work now (matches VT). */}
        <div className={`tfr-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="tfr-section tfr-book" aria-label={tabs.book_label ?? 'Book'}>
            <TheFadeRoomBooking
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

        {/* 4. Gallery / Work */}
        {enabledByTab.gallery && (
          <div className={`tfr-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <section className="tfr-section" aria-label={tabs.gallery_label ?? 'Work'}>
              <p className="tfr-eyebrow">{tabLabel.gallery}</p>
              <h2 className="tfr-section-title">{tabs.gallery_label ?? 'Gallery'}</h2>
              {gallery.length === 0 ? (
                <p className="tfr-empty">No gallery items yet.</p>
              ) : (
                <ul className="tfr-grid">
                  {gallery.map(g => (
                    <li key={g.id} className="tfr-grid-cell">
                      <img src={g.image_url} alt={g.alt_text ?? ''} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 5. Results / Before & After */}
        {enabledByTab.results && (
          <div className={`tfr-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <section className="tfr-section" aria-label={tabs.results_label ?? 'Results'}>
              <p className="tfr-eyebrow">{tabLabel.results}</p>
              <h2 className="tfr-section-title">{tabs.results_label ?? 'Results'}</h2>
              {results.length === 0 ? (
                <p className="tfr-empty">No results yet.</p>
              ) : (
                <ul className="tfr-grid tfr-grid-2">
                  {results.map(r => (
                    <li key={r.id} className="tfr-ba">
                      <img src={r.before_image_url} alt={r.before_alt_text ?? 'Before'} />
                      <img src={r.after_image_url}  alt={r.after_alt_text  ?? 'After'} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 6. About / The Shop */}
        {enabledByTab.about && (
          <div className={`tfr-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="tfr-section tfr-about" aria-label={tabs.about_label ?? 'About'}>
              {/* Three-image staggered hero (editor exposes about.images[3]). */}
              {Array.isArray(about.images) && about.images.some((img: any) => img) && (
                <div className="tfr-about-images">
                  {[0, 1, 2].map(i => {
                    const img = about.images[i]
                    return img
                      ? <div key={i} className="tfr-about-img"><img src={img} alt="" /></div>
                      : <div key={i} className="tfr-about-img tfr-about-img--placeholder" aria-hidden="true" />
                  })}
                </div>
              )}

              {/* Layered title: DM Serif backdrop eyebrow at 80px low-opacity,
                  Dancing Script neon heading at 30px overlaid centered.
                  Eyebrow stays editable via about.eyebrow; falls back to the
                  resolved About tab label rather than a hardcoded string. */}
              {(() => {
                const aboutEyebrow = (typeof about.eyebrow === 'string' && about.eyebrow.trim())
                  ? about.eyebrow.trim()
                  : tabLabel.about
                return (aboutEyebrow || about.heading) ? (
                  <div className="tfr-layered-title">
                    {aboutEyebrow && (
                      <span className="tfr-layered-eyebrow" aria-hidden="true">{aboutEyebrow}</span>
                    )}
                    {about.heading && (
                      <h2 className="tfr-layered-heading">{about.heading}</h2>
                    )}
                  </div>
                ) : null
              })()}

              {about.body && <p className="tfr-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="tfr-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      <h3>{h.title}</h3>
                      <p>{h.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 7. Policy / House Rules */}
        {enabledByTab.policy && (
          <div className={`tfr-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <section className="tfr-section" aria-label={tabs.policy_label ?? 'House Rules'}>
              <p className="tfr-eyebrow">{tabLabel.policy}</p>
              <h2 className="tfr-section-title">{tabs.policy_label ?? 'Policy'}</h2>
              <div className="tfr-policy-stack">
                <PolicyRow label="Deposit"      body={policies.deposit_policy} />
                <PolicyRow label="Cancellation" body={policies.cancellation_policy} />
                <PolicyRow label="Late arrival" body={policies.late_policy} />
                <PolicyRow label="No-show"      body={policies.no_show_policy} />
                <PolicyRow label="Reschedule"   body={policies.reschedule_policy} />
                {Array.isArray(policies.custom_groups) && policies.custom_groups.map((g: any, i: number) => (
                  <PolicyRow key={`c${i}`} label={g.heading} body={g.body} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 8. Advice / Notes */}
        {enabledByTab.advice && (
          <div className={`tfr-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <section className="tfr-section" aria-label={tabs.advice_label ?? 'Notes'}>
              <p className="tfr-eyebrow">{tabLabel.advice}</p>
              <h2 className="tfr-section-title">{settings.advice?.heading ?? 'Advice'}</h2>
              {advice.length === 0 ? (
                <p className="tfr-empty">No notes yet.</p>
              ) : (
                <ul className="tfr-note-list">
                  {advice.map((it: any, i: number) => (
                    <li key={i}>
                      {settings.advice?.card_kicker && (
                        <span className="tfr-card-kicker">{settings.advice.card_kicker}</span>
                      )}
                      <h3>{it.title}</h3>
                      <p>{it.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 9. Timeline / Process */}
        {enabledByTab.timeline && (
          <div className={`tfr-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <section className="tfr-section" aria-label={tabs.timeline_label ?? 'Process'}>
              <p className="tfr-eyebrow">{tabLabel.timeline}</p>
              <h2 className="tfr-section-title">{settings.timeline?.heading ?? 'Timeline'}</h2>
              {timeline.length === 0 ? (
                <p className="tfr-empty">No timeline yet.</p>
              ) : (
                <ol className="tfr-timeline">
                  {timeline.map((it: any, i: number) => (
                    <li key={i}>
                      <span className="tfr-timeline-num">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        {settings.timeline?.card_kicker && (
                          <span className="tfr-card-kicker">{settings.timeline.card_kicker}</span>
                        )}
                        <h3>{it.title}</h3>
                        <p>{it.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}

        {/* 10. FAQ (always visible below tabs) */}
        {additionals.faq?.enabled !== false
          && Array.isArray(additionals.faq?.items)
          && additionals.faq.items.length > 0 && (
          <section className="tfr-section" aria-label="FAQ">
            <p className="tfr-eyebrow">FAQ</p>
            <h2 className="tfr-section-title">{additionals.faq.heading ?? 'Questions'}</h2>
            <div className="tfr-faq-stack">
              {additionals.faq.items.map((f: any, i: number) => (
                <details key={i} className="tfr-faq">
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
          <section className="tfr-section" aria-label="Reviews">
            <p className="tfr-eyebrow"><span aria-hidden="true">✦</span> Reviews</p>
            <h2 className="tfr-section-title">{additionals.reviews.heading ?? 'In the chair'}</h2>
            <ul className="tfr-reviews">
              {additionals.reviews.items.map((rv: any, i: number) => {
                const rating = typeof rv.rating === 'number' ? Math.round(rv.rating) : null
                const showStars = rating !== null && rating >= 1 && rating <= 5
                return (
                  <li key={i}>
                    <blockquote>
                      <span className="tfr-quote-glyph" aria-hidden="true">"</span>
                      {rv.body ?? rv.quote}
                    </blockquote>
                    {showStars && (
                      <p className="tfr-review-stars" aria-label={`${rating} out of 5 stars`}>
                        <span aria-hidden="true">{'★'.repeat(rating!)}</span>
                      </p>
                    )}
                    <p className="tfr-review-attr">
                      {rv.author ?? rv.name}
                      {rv.location && <span> · {rv.location}</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* 12. Thank-you */}
        {additionals.show_thank_you !== false && additionals.thank_you_title && (
          <section className="tfr-section tfr-thanks" aria-label="Thank you">
            <p className="tfr-eyebrow"><span aria-hidden="true">✦</span> Outro <span aria-hidden="true">✦</span></p>
            <h2 className="tfr-section-title tfr-thanks-title">{additionals.thank_you_title}</h2>
            {additionals.thank_you_body && <p className="tfr-thanks-body">{additionals.thank_you_body}</p>}
            {/* Studio signature — borrowed from VT's outro. Uses the editable
                thank_you_signature when set, otherwise the business name. */}
            <p className="tfr-thanks-sign">— {(typeof additionals.thank_you_signature === 'string' && additionals.thank_you_signature.trim()) ? additionals.thank_you_signature.trim() : display}</p>
          </section>
        )}

        <Footer site={site} hours={hours} services={services} goBook={goBook} />
      </div>
    </>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function PolicyRow({ label, body }: { label: string; body?: string | null }) {
  if (!body) return null
  return (
    <div className="tfr-policy">
      <h3>{label}</h3>
      <p>{body}</p>
    </div>
  )
}

// Per-platform brand gradients. Each button's `background` reads like
// the destination it points at — Insta's iconic pink→orange→purple,
// Call's WhatsApp green, Email's mail blue, Directions' Maps green,
// Reserve's tenant-accent gradient.
// Glyph can be a lucide icon or one of the inline brand-glyph components
// above — both accept size/strokeWidth and paint with currentColor.
// ComponentType keeps the union unambiguously callable in JSX.
// Accepts both lucide icons (whose props type is broader — size?: string |
// number, plus ref/propTypes) and the inline brand-glyph components above.
// `any` props avoids the lucide vs custom-glyph propTypes variance clash
// while staying callable as <Icon size={…} strokeWidth={…} /> in JSX.
type SocialGlyph = ComponentType<any>
const SOCIAL_STYLES: Record<string, { Icon: SocialGlyph; gradient: string }> = {
  book:       { Icon: CalendarPlus,  gradient: 'linear-gradient(135deg, var(--tfr-accent), color-mix(in srgb, var(--tfr-accent) 55%, #fff))' },
  call:       { Icon: Phone,         gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  email:      { Icon: Mail,          gradient: 'linear-gradient(135deg, #4F8BFF, #2D5FCF)' },
  message:    { Icon: MessageSquare, gradient: 'linear-gradient(135deg, #34B7F1, #0A7CC4)' },
  instagram:  { Icon: Instagram,     gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 45%, #8134AF 100%)' },
  tiktok:     { Icon: TikTokGlyph,   gradient: 'linear-gradient(135deg, #25F4EE 0%, #1A1228 45%, #FE2C55 100%)' },
  youtube:    { Icon: Youtube,       gradient: 'linear-gradient(135deg, #FF0000, #C4302B)' },
  facebook:   { Icon: Facebook,      gradient: 'linear-gradient(135deg, #1877F2, #0B5FCC)' },
  pinterest:  { Icon: PinterestGlyph, gradient: 'linear-gradient(135deg, #E60023, #AD081B)' },
  whatsapp:   { Icon: WhatsAppGlyph, gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  directions: { Icon: MapPin,        gradient: 'linear-gradient(135deg, #34A853, #16713C)' },
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  // href resolution mirrors the canonical VT/Lush header buttons. safeHref
  // (applied uniformly in the render below) enforces the scheme allowlist;
  // message normalizes a bare number to sms: first via smsHref. Brand
  // socials (tiktok/youtube/facebook/pinterest/whatsapp) have no profile
  // fallback — they only render when the tenant sets a URL override.
  const btns: { key: string; href: string | null; label: string }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'message',    href: smsHref(header.message_button_url), label: 'Message' },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'tiktok',     href: header.tiktok_button_url     || null, label: 'TikTok' },
    { key: 'youtube',    href: header.youtube_button_url    || null, label: 'YouTube' },
    { key: 'facebook',   href: header.facebook_button_url   || null, label: 'Facebook' },
    { key: 'pinterest',  href: header.pinterest_button_url  || null, label: 'Pinterest' },
    { key: 'whatsapp',   href: header.whatsapp_button_url   || null, label: 'WhatsApp' },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions' },
  ]
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="tfr-social" aria-label="Contact">
      {visible.map(b => {
        // Reserve button isn't a real anchor — tab pill carries that
        // concept. Intercept the click so the header button drives
        // setActive + scroll into the tab rail.
        const onClick = b.key === 'book' && !header.book_button_url
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        const style = SOCIAL_STYLES[b.key]
        return (
          <a
            key={b.key}
            href={safeHref(b.href!)}
            className="tfr-social-btn"
            style={{ background: style?.gradient }}
            onClick={onClick}
          >
            {style?.Icon && <style.Icon size={14} strokeWidth={2.4} />}
            <span>{b.label}</span>
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
  return (
    <footer className="tfr-footer">
      {footer.show_quick_book !== false && services.length > 0 && (
        <div className="tfr-footer-cta-band">
          <button type="button" className="tfr-footer-book" onClick={goBook}>
            Reserve the chair
          </button>
        </div>
      )}

      <div className="tfr-footer-inner">
        <div className="tfr-footer-col tfr-footer-brand">
          <p className="tfr-eyebrow">The Studio</p>
          <p className="tfr-footer-name">{name}</p>
          {footer.subtext && <p className="tfr-footer-subtext">{footer.subtext}</p>}
        </div>

        {footer.show_hours !== false && hours.length > 0 && (
          <div className="tfr-footer-col tfr-footer-col--hours">
            <p className="tfr-eyebrow">Hours</p>
            <ul className="tfr-footer-hours">
              {hours.map((h: any) => (
                <li key={h.id}>
                  <span>{h.day_name}</span>
                  <span>{h.is_open && h.open_time && h.close_time ? `${h.open_time}–${h.close_time}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {footer.show_contact_links !== false && (p?.public_phone || p?.public_email) && (
          <div className="tfr-footer-col">
            <p className="tfr-eyebrow">Contact</p>
            <ul className="tfr-footer-contact">
              {p?.public_phone && <li><a href={`tel:${p.public_phone}`}>{p.public_phone}</a></li>}
              {p?.public_email && <li><a href={`mailto:${p.public_email}`}>{p.public_email}</a></li>}
            </ul>
          </div>
        )}
      </div>

      {footer.show_powered_by !== false && (
        <div className="tfr-footer-credit-band">
          <p>Powered by BookReady</p>
        </div>
      )}
    </footer>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const TFR_CSS = `
.tfr-template {
  ${tokensToCss()}
  --tfr-bg: #0F0A1A;
  --tfr-fg: #F0EFF5;
  --tfr-fg-muted: rgba(240, 239, 245, 0.62);
  --tfr-rule: rgba(240, 239, 245, 0.10);
  --tfr-card: #1A1228;
  /* --tfr-accent injected via inline style (tenant pick or pink default) */
  --tfr-display: 'Bricolage Grotesque', 'Outfit', 'Manrope', system-ui, sans-serif;
  --tfr-script: 'Dancing Script', 'Pacifico', cursive;
  --tfr-serif: 'DM Serif Text', 'Playfair Display', Georgia, serif;
  --tfr-body: 'Inter', system-ui, -apple-system, sans-serif;
  /* Neon halo — used on every Dancing Script title (section titles,
     tagline, layered heading, thanks, highlights). White text with a
     colored halo around it (no white inner = no stroke effect, per
     feedback). Multi-layer = real bloom, not a flat single shadow. */
  --tfr-neon-shadow:
    0 0 6px var(--tfr-accent),
    0 0 14px var(--tfr-accent),
    0 0 30px var(--tfr-accent),
    0 0 56px color-mix(in srgb, var(--tfr-accent) 80%, transparent);
  /* Tighter variant for smaller script type — same halo character,
     less spread. */
  --tfr-neon-shadow-tight:
    0 0 4px var(--tfr-accent),
    0 0 10px var(--tfr-accent),
    0 0 22px var(--tfr-accent);

  background: var(--tfr-bg);
  color: var(--tfr-fg);
  font-family: var(--tfr-body);
  font-size: var(--brk-font-body);
  line-height: 1.55;
  letter-spacing: 0.01em;
  min-height: 100vh;
}
.tfr-template * { box-sizing: border-box; }
.tfr-template img { max-width: 100%; display: block; }
.tfr-template a { color: inherit; text-decoration: none; }

/* Eyebrow — tracked uppercase accent with subtle neon glow. */
.tfr-eyebrow {
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  margin: 0 0 var(--brk-space-md);
}
.tfr-eyebrow > span[aria-hidden] {
  display: inline-block;
  margin: 0 6px;
  font-size: 9px;
  opacity: 0.85;
}

/* Section titles — Dancing Script in WHITE with full neon halo. */
.tfr-section-title {
  font-family: var(--tfr-script);
  font-size: clamp(38px, 5.5vw, 64px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  margin: 0 0 var(--brk-space-xl);
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  padding: 0.05em 0;
}

/* Announce bar — tracked uppercase muted, with sparkle bookends. */
.tfr-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px var(--brk-space-md);
  border-bottom: 1px solid var(--tfr-rule);
  font-family: var(--tfr-body);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
}
.tfr-announce-spark {
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
  font-size: 10px;
}

/* Header — cover image runs full width with an accent wash overlay,
   content sits in container-narrow lifted into the cover. */
.tfr-header { padding: 0 0 var(--brk-space-3xl); position: relative; }
.tfr-cover-wrap { position: relative; }
.tfr-cover {
  width: 100%;
  height: clamp(320px, 55vw, 580px);
  object-fit: cover;
  filter: brightness(0.58) saturate(1.12);
}
/* Subtle neon-poster wash from accent at top → bg at bottom */
.tfr-cover-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--tfr-accent) 8%, transparent) 50%,
    var(--tfr-bg) 100%
  );
  pointer-events: none;
}
.tfr-header-inner {
  position: relative;
  z-index: 1;
  max-width: var(--brk-container-narrow);
  margin: -140px auto 0;
  padding: 0 var(--brk-space-md);
  text-align: left;
}
.tfr-header:not(:has(.tfr-cover-wrap)) .tfr-header-inner {
  margin-top: var(--brk-space-2xl);
}
.tfr-avatar {
  width: 124px;
  height: 124px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid var(--tfr-accent);
  box-shadow:
    0 0 0 4px var(--tfr-bg),
    0 0 0 5px color-mix(in srgb, var(--tfr-accent) 60%, transparent),
    0 0 28px color-mix(in srgb, var(--tfr-accent) 55%, transparent),
    0 0 60px color-mix(in srgb, var(--tfr-accent) 30%, transparent);
  margin: 0 0 var(--brk-space-md);
}
/* Hero name — plain white Bricolage. No script, no neon, no
   animation. The brand anchor; the script/neon language lives in the
   section titles + taglines below. */
.tfr-name {
  font-family: var(--tfr-display);
  font-size: clamp(44px, 8vw, 88px);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 0.96;
  margin: 0 0 var(--brk-space-sm);
  color: var(--tfr-fg);
}
.tfr-business-type {
  font-family: var(--tfr-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
  margin: 0 0 var(--brk-space-sm);
}
/* Tagline — Dancing Script in WHITE with tight neon halo. */
.tfr-tagline {
  font-family: var(--tfr-script);
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  margin: 0 0 var(--brk-space-xl);
  max-width: 28ch;
  padding: 0.05em 0;
}

/* Social — pill buttons with per-platform brand gradients + lucide
   icons. Each button gets a different visual identity (Instagram pink/
   orange/purple, Call green, Email blue, Directions Maps green,
   Reserve accent gradient), so the row reads as a contact toolbox
   rather than a homogeneous list. */
.tfr-social {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--brk-space-lg);
}
.tfr-social-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  transition: transform 160ms ease, box-shadow 220ms ease;
  /* background-image set per-button via inline style */
}
.tfr-social-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--tfr-accent) 35%, transparent),
    0 6px 16px rgba(0, 0, 0, 0.35);
}
.tfr-social-btn svg {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* Tab rail — sticky band of outlined pills. The active tab stays the
   same shape but lights up via text-neon-glow + a small "marquee
   marker" bar attached underneath, instead of the old fill-with-pink
   approach. Reads as a row of label tags with the active one switched
   on, more theater-marquee than club-button-panel. */
.tfr-tab-rail {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--tfr-bg);
  border-top: 1px solid var(--tfr-rule);
  border-bottom: 1px solid var(--tfr-rule);
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 16px 0 24px;
}
.tfr-tab-rail::-webkit-scrollbar { display: none; }
.tfr-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: 0 var(--brk-space-md);
  gap: 8px;
}
.tfr-tab-pill {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 20%, transparent);
  border-radius: 999px;
  padding: 11px 24px;
  margin: 0;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, text-shadow 220ms ease;
  white-space: nowrap;
}
.tfr-tab-pill:hover {
  color: var(--tfr-fg);
  border-color: color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-tab-pill.is-active {
  color: var(--tfr-fg);
  border-color: var(--tfr-accent);
  text-shadow:
    0 0 6px var(--tfr-accent),
    0 0 16px color-mix(in srgb, var(--tfr-accent) 65%, transparent);
}
/* Marquee marker — a small horizontal accent bar attached below the
   active pill with a soft glow halo. Reads as a marker light pointing
   up to the active tab. */
.tfr-tab-pill.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: var(--tfr-accent);
  border-radius: 2px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 80%, transparent);
}
.tfr-tab-pill:focus-visible {
  outline: 2px solid var(--tfr-accent);
  outline-offset: 2px;
}

/* Tab panels — display:none on inactive (preserves form state). */
.tfr-tab-panel { display: none; }
.tfr-tab-panel.is-active { display: block; }

/* Section frame — editorial padding, container-narrow. */
.tfr-section {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  border-top: 1px solid var(--tfr-rule);
}
.tfr-tab-panel > .tfr-section:first-child { border-top: none; }
.tfr-book { padding-top: var(--brk-space-3xl); }

.tfr-empty {
  font-family: var(--tfr-body);
  font-size: 14px;
  color: var(--tfr-fg-muted);
  margin: 0;
}

/* Grid — soft rounded cards in a 3-col layout (2 on mobile). */
.tfr-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 720px) {
  .tfr-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
}
.tfr-grid-cell {
  background: var(--tfr-card);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--tfr-rule);
  transition: border-color 200ms ease, box-shadow 250ms ease;
}
.tfr-grid-cell:hover {
  border-color: var(--tfr-accent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--tfr-accent) 25%, transparent);
}
.tfr-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Before/After grid — 1 col mobile, 2 col desktop */
.tfr-grid-2 { grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 720px) {
  .tfr-grid-2 { grid-template-columns: repeat(2, 1fr); }
}
.tfr-ba {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--tfr-rule);
  background: var(--tfr-card);
  padding: 6px;
}
.tfr-ba > img { aspect-ratio: 1; border-radius: 8px; }

/* About — three-up staggered hero gallery. Each cell gets a slightly
   different aspect-ratio + vertical offset so they don't read as a
   strict grid. Equal-width columns keep the rhythm. */
.tfr-about-images {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  align-items: start;
  margin: 0 0 var(--brk-space-2xl);
}
.tfr-about-img {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--tfr-rule);
  background: var(--tfr-card);
  aspect-ratio: 3/4;
}
.tfr-about-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tfr-about-img--placeholder {
  background: linear-gradient(
    135deg,
    var(--tfr-card),
    color-mix(in srgb, var(--tfr-accent) 6%, var(--tfr-card))
  );
}
/* Staggered heights via aspect-ratio + offset. Tall→short→tall, with
   the middle column lifted to break the strict row alignment. */
.tfr-about-images > *:nth-child(1) { aspect-ratio: 4/5; margin-top: 0; }
.tfr-about-images > *:nth-child(2) { aspect-ratio: 3/5; margin-top: 28px; }
.tfr-about-images > *:nth-child(3) { aspect-ratio: 2/3; margin-top: -14px; }
/* Mobile keeps 3 cols side-by-side per feedback. Reduce the gap +
   stagger magnitudes so it fits without crowding. */
@media (max-width: 640px) {
  .tfr-about-images { gap: 6px; }
  .tfr-about-images > *:nth-child(1) { margin-top: 0; }
  .tfr-about-images > *:nth-child(2) { margin-top: 14px; }
  .tfr-about-images > *:nth-child(3) { margin-top: -6px; }
}

/* Layered title — backdrop DM Serif eyebrow at low opacity with the
   Dancing Script heading overlaid centered. The two type families and
   contrasting sizes give the section a museum-placard-meets-neon-sign
   feel that the simpler section-title can't carry. */
.tfr-layered-title {
  position: relative;
  display: inline-block;
  margin: 0 0 var(--brk-space-2xl);
  line-height: 1;
  max-width: 100%;
}
.tfr-layered-eyebrow {
  display: block;
  font-family: var(--tfr-serif);
  font-size: clamp(80px, 14vw, 140px);
  line-height: 1;
  opacity: 0.14;
  margin: 0;
  letter-spacing: -0.015em;
  color: var(--tfr-fg);
  white-space: nowrap;
  /* Strip any inherited script styling — this is a serif backdrop only. */
  text-shadow: none;
}
.tfr-layered-heading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--tfr-script);
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  margin: 0;
  white-space: nowrap;
  padding: 0.05em 0;
  pointer-events: none;
}

/* Card kicker — small tracked uppercase label above each advice /
   timeline item. Editor surfaces a single shared kicker per list
   (e.g., "NOTE", "STEP"). Rendered above the item's title. */
.tfr-card-kicker {
  display: inline-block;
  font-family: var(--tfr-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
  margin: 0 0 8px;
}

.tfr-about-body {
  font-size: 18px;
  line-height: 1.65;
  max-width: 58ch;
  margin: 0 0 var(--brk-space-2xl);
  color: var(--tfr-fg);
}
/* About highlights — accent-stick cards stacked vertically. Each card
   has a glowing 3px neon spine on the left edge + Dancing Script title
   in accent + muted body. Distinct from Blackline's two-column
   hairline-divided pattern. */
.tfr-highlights {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}
.tfr-highlights > li {
  position: relative;
  background: var(--tfr-card);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 22%, var(--tfr-rule));
  border-radius: 14px;
  padding: var(--brk-space-lg) var(--brk-space-xl) var(--brk-space-lg) calc(var(--brk-space-xl) + 12px);
}
/* The glowing neon spine on the left edge of each card. */
.tfr-highlights > li::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 22px;
  bottom: 22px;
  width: 3px;
  border-radius: 2px;
  background: var(--tfr-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--tfr-accent) 60%, transparent);
}
.tfr-highlights h3 {
  font-family: var(--tfr-script);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  margin: 0 0 8px;
  padding: 0.05em 0;
}
.tfr-highlights p { margin: 0; color: var(--tfr-fg-muted); line-height: 1.55; }

/* Policies — tagged ticket layout. Each policy is a horizontal pill
   with a filled accent-color "tag" on the left carrying the policy
   label, and the body sitting in the white-on-card right side. Reads
   like a ticket stub or a tagged folder, very distinct from
   Blackline's editorial label-column-then-body pattern. */
.tfr-policy-stack {
  display: grid;
  gap: 14px;
}
.tfr-policy {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, var(--tfr-rule));
  border-radius: 14px;
  overflow: hidden;
  background: var(--tfr-card);
}
@media (min-width: 720px) {
  .tfr-policy { grid-template-columns: minmax(160px, max-content) 1fr; }
}
.tfr-policy h3 {
  background: color-mix(in srgb, var(--tfr-accent) 14%, transparent);
  color: var(--tfr-fg);
  padding: 18px 24px;
  margin: 0;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  white-space: nowrap;
  /* Hairline accent divider between the tag and body. */
  border-right: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, transparent);
}
.tfr-policy p {
  padding: 18px 24px;
  margin: 0;
  color: var(--tfr-fg);
  line-height: 1.55;
  display: flex;
  align-items: center;
}

/* Notes — sticky-note style cards with subtle tilt. Each note feels
   like a post-it on a board. Two-up on desktop with alternating tilt
   so they don't read as a strict grid. Distinct from Blackline's
   stacked hairline-divided pattern. */
.tfr-note-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 20px;
}
@media (min-width: 720px) {
  .tfr-note-list { grid-template-columns: repeat(2, 1fr); gap: 28px; }
}
.tfr-note-list > li {
  position: relative;
  background: var(--tfr-card);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, var(--tfr-rule));
  border-radius: 14px;
  padding: var(--brk-space-lg) var(--brk-space-xl);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
  transition: transform 220ms ease, box-shadow 250ms ease;
}
.tfr-note-list > li:nth-child(odd)  { transform: rotate(-0.8deg); }
.tfr-note-list > li:nth-child(even) { transform: rotate(0.9deg); }
.tfr-note-list > li:hover {
  transform: rotate(0deg) translateY(-3px);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--tfr-accent) 18%, transparent);
}
.tfr-note-list h3 {
  font-family: var(--tfr-display);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--tfr-fg);
}
.tfr-note-list p { margin: 0; color: var(--tfr-fg-muted); line-height: 1.55; }
@media (prefers-reduced-motion: reduce) {
  .tfr-note-list > li,
  .tfr-note-list > li:hover { transform: none; }
}

/* Timeline — vertical neon spine with circular node "buttons" punching
   through. The spine is a glowing accent line; each step number sits
   in an accent-bordered circle anchored to the spine. Distinct from
   Blackline's number-column + hairline-rule pattern. */
.tfr-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}
/* The vertical accent spine running down the left side of the list.
   Fades in/out at the ends so it doesn't terminate flush against the
   container edges. */
.tfr-timeline::before {
  content: '';
  position: absolute;
  left: 21px;
  top: 28px;
  bottom: 28px;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--tfr-accent) 8%,
    var(--tfr-accent) 92%,
    transparent 100%
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-timeline > li {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 20px;
  padding: 0 0 var(--brk-space-2xl);
  align-items: start;
  position: relative;
}
.tfr-timeline > li:last-child { padding-bottom: 0; }
/* Step numbers as circular nodes — bg matches page so the spine
   appears to punch through behind them. Accent border + glow. */
.tfr-timeline-num {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--tfr-bg);
  border: 2px solid var(--tfr-accent);
  color: var(--tfr-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--tfr-display);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 14px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  text-shadow: 0 0 6px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-timeline > li > div { padding-top: 6px; }
.tfr-timeline h3 {
  font-family: var(--tfr-display);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--tfr-fg);
}
.tfr-timeline p { margin: 0; color: var(--tfr-fg-muted); line-height: 1.55; }

/* FAQ */
.tfr-faq-stack { border-top: 1px solid var(--tfr-rule); }
.tfr-faq {
  border-bottom: 1px solid var(--tfr-rule);
  padding: var(--brk-space-lg) 0;
}
.tfr-faq summary {
  font-family: var(--tfr-display);
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--brk-space-md);
}
.tfr-faq summary::-webkit-details-marker { display: none; }
.tfr-faq summary::after {
  content: '+';
  font-family: var(--tfr-display);
  font-size: 24px;
  font-weight: 400;
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  line-height: 1;
  transition: transform 200ms ease;
}
.tfr-faq[open] summary::after { content: '−'; }
.tfr-faq p {
  margin: var(--brk-space-md) 0 0;
  color: var(--tfr-fg-muted);
  line-height: 1.65;
}

/* Reviews — tilted polaroid-style cards on a dark wall. Each card
   gets a soft accent border + glow halo, slight rotation (alternating
   -1/+1 degrees), and a giant Dancing Script quote glyph as a corner
   watermark. Hover lifts the card and unskews it. Distinct from
   Blackline's editorial column-with-rule treatment. */
.tfr-reviews {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 28px;
}
@media (min-width: 720px) {
  .tfr-reviews { grid-template-columns: repeat(2, 1fr); gap: 32px; }
}
.tfr-reviews > li {
  position: relative;
  background: var(--tfr-card);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 28%, var(--tfr-rule));
  border-radius: 18px;
  padding: var(--brk-space-xl);
  box-shadow:
    0 0 28px color-mix(in srgb, var(--tfr-accent) 14%, transparent),
    0 12px 24px rgba(0, 0, 0, 0.32);
  transition: transform 220ms ease, box-shadow 250ms ease;
}
.tfr-reviews > li:nth-child(odd)  { transform: rotate(-1.2deg); }
.tfr-reviews > li:nth-child(even) { transform: rotate(1.2deg); }
.tfr-reviews > li:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow:
    0 0 40px color-mix(in srgb, var(--tfr-accent) 28%, transparent),
    0 16px 32px rgba(0, 0, 0, 0.4);
}
/* Giant accent quote glyph as corner watermark — Dancing Script,
   stacked behind the body copy via low opacity + absolute position. */
.tfr-reviews > li::before {
  content: '\\201C';
  position: absolute;
  top: -28px;
  right: 20px;
  font-family: var(--tfr-script);
  font-size: 140px;
  line-height: 1;
  color: var(--tfr-accent);
  opacity: 0.5;
  text-shadow: 0 0 28px color-mix(in srgb, var(--tfr-accent) 60%, transparent);
  pointer-events: none;
}
.tfr-reviews blockquote {
  font-family: var(--tfr-display);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.005em;
  margin: 0 0 var(--brk-space-md);
  color: var(--tfr-fg);
  position: relative;
  z-index: 1;
}
/* Hide the inline glyph from the markup — the corner watermark is
   the new quote treatment. */
.tfr-quote-glyph { display: none; }
/* Star rating — accent glyphs with the same neon halo as the rest of
   the review card. Sits above the attribution, layered over the corner
   quote watermark. */
.tfr-review-stars {
  margin: 0 0 8px;
  font-size: 15px;
  letter-spacing: 0.12em;
  line-height: 1;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 45%, transparent);
  position: relative;
  z-index: 1;
}
.tfr-review-attr {
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 30%, transparent);
  margin: 0;
  position: relative;
  z-index: 1;
}
@media (prefers-reduced-motion: reduce) {
  .tfr-reviews > li,
  .tfr-reviews > li:hover {
    transform: none;
  }
}

/* Thanks — framed as a hung neon sign. Per feedback: explicit
   horizontal margin (not flush against the viewport edges), no outer
   glow, sparkles without their punched backgrounds. The border alone
   carries the "neon tube" feel; the glow was reading muddy. */
.tfr-thanks {
  position: relative;
  max-width: min(680px, calc(100% - 64px));
  margin: var(--brk-space-3xl) auto;
  padding: var(--brk-space-3xl) clamp(28px, 5vw, 56px) var(--brk-space-2xl);
  text-align: center;
  border: 2px solid var(--tfr-accent);
  border-radius: 22px;
  border-top: 2px solid var(--tfr-accent);
}
/* Sparkles sit ON the border line — no background-punch, no halo.
   The accent glyph alone is the corner decoration. */
.tfr-thanks::before,
.tfr-thanks::after {
  content: '✦';
  position: absolute;
  font-size: 22px;
  color: var(--tfr-accent);
  background: transparent;
  padding: 0;
  line-height: 1;
}
.tfr-thanks::before { top: -12px; left: 28px; }
.tfr-thanks::after  { bottom: -12px; right: 28px; }

.tfr-thanks-title {
  font-family: var(--tfr-script);
  font-size: clamp(40px, 7vw, 80px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.0;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  padding: 0.05em 0;
  margin: 0 0 var(--brk-space-md);
}
.tfr-thanks-body {
  max-width: 48ch;
  margin: 0 auto;
  color: var(--tfr-fg-muted);
  line-height: 1.65;
}
.tfr-thanks-sign {
  margin: var(--brk-space-lg) 0 0;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
}

/* ── Footer ── 3-band: CTA + cols + credit */
.tfr-footer {
  margin-top: var(--brk-space-3xl);
  border-top: 1px solid var(--tfr-rule);
}
.tfr-footer-cta-band {
  padding: var(--brk-space-2xl) var(--brk-space-md);
  text-align: center;
  border-bottom: 1px solid var(--tfr-rule);
}
.tfr-footer-inner {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--brk-space-2xl);
}
@media (min-width: 720px) {
  .tfr-footer-inner {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0;
  }
  .tfr-footer-col { padding: 0 var(--brk-space-2xl); }
  .tfr-footer-col:first-child { padding-left: 0; }
  .tfr-footer-col:last-child  { padding-right: 0; }
  .tfr-footer-col + .tfr-footer-col {
    border-left: 1px solid var(--tfr-rule);
  }
}
.tfr-footer-col {
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-md);
}
.tfr-footer-brand { gap: var(--brk-space-sm); }
.tfr-footer-col--hours { min-width: 260px; }
.tfr-footer-name {
  font-family: var(--tfr-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.018em;
  margin: 0;
}
.tfr-footer-subtext {
  margin: 0;
  color: var(--tfr-fg-muted);
  max-width: 32ch;
  line-height: 1.55;
}
.tfr-footer-hours,
.tfr-footer-contact {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-xs);
}
.tfr-footer-hours li {
  display: flex;
  justify-content: space-between;
  gap: var(--brk-space-md);
  font-size: 13px;
  color: var(--tfr-fg-muted);
  font-variant-numeric: tabular-nums;
}
.tfr-footer-hours li > span:last-child {
  font-family: var(--tfr-display);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--tfr-fg);
}
.tfr-footer-contact { font-size: 14px; }
.tfr-footer-contact a {
  color: var(--tfr-fg);
  transition: color 160ms ease, text-shadow 200ms ease;
}
.tfr-footer-contact a:hover {
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
}

/* Neon pill CTA — used in the footer CTA band. */
.tfr-footer-book {
  display: inline-flex;
  align-items: center;
  padding: 18px 44px;
  font-family: var(--tfr-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  background: var(--tfr-accent);
  color: var(--tfr-bg);
  border: 1px solid var(--tfr-accent);
  border-radius: 999px;
  cursor: pointer;
  transition: box-shadow 220ms ease, transform 120ms ease;
  box-shadow: 0 0 20px color-mix(in srgb, var(--tfr-accent) 35%, transparent);
}
.tfr-footer-book:hover {
  box-shadow: 0 0 32px color-mix(in srgb, var(--tfr-accent) 65%, transparent);
}
.tfr-footer-book:active { transform: scale(0.98); }

.tfr-footer-credit-band {
  padding: var(--brk-space-md);
  border-top: 1px solid var(--tfr-rule);
  text-align: center;
}
.tfr-footer-credit-band p {
  font-family: var(--tfr-body);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tfr-template *,
  .tfr-template *::before,
  .tfr-template *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`
