'use client'

/**
 * Blackline — sleek industrial-modern barbershop template.
 *
 * Visual vocabulary:
 *   - Heavy canvas (Onyx default, switchable to Charcoal/Walnut/Bone)
 *   - Brass hardware accent (#B8966B) constant across variants
 *   - Space Grotesk for display, Inter for body
 *   - Hairline brass rules, sharp corners (no border-radius)
 *   - Tracked uppercase eyebrows ("THE SHOP", "RESERVE", etc.)
 *   - Single-column editorial rhythm; the booking section reads as a
 *     chapter, not an embed
 *
 * All 12 required sections render. Empty data shows a friendly empty
 * state, not nothing. Styling is restrained — the brass accent does
 * most of the work; everything else is type + spacing + rule.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import BlacklineBooking from './BlacklineBooking'

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

// Map website_sections.section_key → TabId. Accepts both canonical and
// legacy keys (before_after, steps, before_appointment) so older tenants
// who haven't been touched since the M3 rename still resolve correctly.
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

export default function BlacklineTemplate({ site, slug }: Props) {
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

  // Resolve canvas color — tenant-picked or Onyx default.
  const canvas = settings?.theme?.accent_color || '#0A0A0A'
  const onCanvas = canvas === '#E8E2D7' ? '#0A0A0A' : '#E8E2D7'
  const onCanvasMuted = canvas === '#E8E2D7'
    ? 'rgba(10,10,10,0.62)'
    : 'rgba(232,226,215,0.62)'
  const rule = canvas === '#E8E2D7'
    ? 'rgba(10,10,10,0.14)'
    : 'rgba(232,226,215,0.14)'

  // ── Tab state ──
  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)

  // Build enabledByTab from website_sections (default to all enabled when
  // sections list is missing entirely — fresh tenants).
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
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Work' },
    { id: 'results',  label: tabs.results_label  ?? 'Before / After' },
    { id: 'about',    label: tabs.about_label    ?? 'The Shop' },
    { id: 'policy',   label: tabs.policy_label   ?? 'House Rules' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Notes' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Process' },
  ]
  // Book is always shown (the booking flow is the template's whole point);
  // other tabs respect editor toggles.
  const visibleTabs = allTabs.filter(t => t.id === 'book' || enabledByTab[t.id])

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      <style>{BLACKLINE_CSS}</style>
      <div
        className="blackline-template"
        style={{
          ['--blackline-bg' as any]: canvas,
          ['--blackline-fg' as any]: onCanvas,
          ['--blackline-fg-muted' as any]: onCanvasMuted,
          ['--blackline-rule' as any]: rule,
        }}
      >

        {/* 1. Announcement bar */}
        {header.show_announcement && header.announcement_text && (
          <div className="blackline-announce">{header.announcement_text}</div>
        )}

        {/* 2. Header / Hero */}
        <header className="blackline-header">
          {header.cover_image_url && (
            <img className="blackline-cover" src={header.cover_image_url} alt="" />
          )}
          <div className="blackline-header-inner">
            <p className="blackline-eyebrow">The Shop</p>
            <h1 className="blackline-name">{display}</h1>
            {p?.business_type && (
              <p className="blackline-business-type">{p.business_type}</p>
            )}
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail ── */}
        <div className="blackline-tab-rail" ref={tabRailRef}>
          <div className="blackline-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`blackline-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab panels — all rendered, only is-active visible (so tab
            switching preserves form state inside the booking flow) ── */}

        {/* 3. Reserve / Book — eyebrow + title removed, booking flow's
            own step labels carry that work now (matches VT). */}
        <div className={`blackline-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="blackline-section blackline-book" aria-label={tabs.book_label ?? 'Reserve'}>
            <BlacklineBooking
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
          <div className={`blackline-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <section className="blackline-section" aria-label={tabs.gallery_label ?? 'Gallery'}>
              <p className="blackline-eyebrow">Work</p>
              <h2 className="blackline-section-title">{tabs.gallery_label ?? 'Gallery'}</h2>
              {gallery.length === 0 ? (
                <p className="blackline-empty">No gallery items yet.</p>
              ) : (
                <ul className="blackline-grid">
                  {gallery.map(g => (
                    <li key={g.id}>
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
          <div className={`blackline-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <section className="blackline-section" aria-label={tabs.results_label ?? 'Results'}>
              <p className="blackline-eyebrow">Before / After</p>
              <h2 className="blackline-section-title">{tabs.results_label ?? 'Results'}</h2>
              {results.length === 0 ? (
                <p className="blackline-empty">No results yet.</p>
              ) : (
                <ul className="blackline-grid blackline-grid-2">
                  {results.map(r => (
                    <li key={r.id} className="blackline-ba">
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
          <div className={`blackline-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="blackline-section blackline-about" aria-label={tabs.about_label ?? 'About'}>
              {about.eyebrow && <p className="blackline-eyebrow">{about.eyebrow}</p>}
              <h2 className="blackline-section-title">{about.heading ?? 'The Shop'}</h2>
              {about.body && <p className="blackline-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="blackline-highlights">
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
          <div className={`blackline-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <section className="blackline-section" aria-label={tabs.policy_label ?? 'House Rules'}>
              <p className="blackline-eyebrow">House Rules</p>
              <h2 className="blackline-section-title">{tabs.policy_label ?? 'Policy'}</h2>
              <div className="blackline-policy-stack">
                <PolicyRow label="Deposit"      body={policies.deposit_policy} />
                <PolicyRow label="Cancellation" body={policies.cancellation_policy} />
                <PolicyRow label="Late arrival" body={policies.late_policy} />
                <PolicyRow label="No-show"      body={policies.no_show_policy} />
                <PolicyRow label="Refund"       body={policies.refund_policy} />
                <PolicyRow label="Guest"        body={policies.guest_policy} />
                {Array.isArray(policies.custom_groups) && policies.custom_groups.map((g: any, i: number) => (
                  <PolicyRow key={`c${i}`} label={g.heading} body={g.body} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 8. Advice / Notes */}
        {enabledByTab.advice && (
          <div className={`blackline-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <section className="blackline-section" aria-label={tabs.advice_label ?? 'Notes'}>
              <p className="blackline-eyebrow">Notes</p>
              <h2 className="blackline-section-title">{settings.advice?.heading ?? 'Advice'}</h2>
              {advice.length === 0 ? (
                <p className="blackline-empty">No notes yet.</p>
              ) : (
                <ul className="blackline-note-list">
                  {advice.map((it: any, i: number) => (
                    <li key={i}>
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
          <div className={`blackline-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <section className="blackline-section" aria-label={tabs.timeline_label ?? 'Process'}>
              <p className="blackline-eyebrow">Process</p>
              <h2 className="blackline-section-title">{settings.timeline?.heading ?? 'Timeline'}</h2>
              {timeline.length === 0 ? (
                <p className="blackline-empty">No timeline yet.</p>
              ) : (
                <ol className="blackline-timeline">
                  {timeline.map((it: any, i: number) => (
                    <li key={i}>
                      <span className="blackline-timeline-num">{String(i + 1).padStart(2, '0')}</span>
                      <div>
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

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false
          && Array.isArray(additionals.faq?.items)
          && additionals.faq.items.length > 0 && (
          <section className="blackline-section" aria-label="FAQ">
            <p className="blackline-eyebrow">FAQ</p>
            <h2 className="blackline-section-title">{additionals.faq.heading ?? 'Questions'}</h2>
            <div className="blackline-faq-stack">
              {additionals.faq.items.map((f: any, i: number) => (
                <details key={i} className="blackline-faq">
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
          <section className="blackline-section" aria-label="Reviews">
            <p className="blackline-eyebrow">Reviews</p>
            <h2 className="blackline-section-title">{additionals.reviews.heading ?? 'On the chair'}</h2>
            <ul className="blackline-reviews">
              {additionals.reviews.items.map((rv: any, i: number) => (
                <li key={i}>
                  <blockquote>{rv.body ?? rv.quote}</blockquote>
                  <p className="blackline-review-attr">
                    {rv.author ?? rv.name}
                    {rv.location && <span> · {rv.location}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 12. Thank-you */}
        {additionals.show_thank_you !== false && additionals.thank_you_title && (
          <section className="blackline-section blackline-thanks" aria-label="Thank you">
            <p className="blackline-eyebrow">Outro</p>
            <h2 className="blackline-section-title">{additionals.thank_you_title}</h2>
            {additionals.thank_you_body && <p>{additionals.thank_you_body}</p>}
            {/* Studio signature — borrowed from VT's outro pattern. */}
            <p className="blackline-thanks-sign">— {display}</p>
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
    <div className="blackline-policy">
      <h3>{label}</h3>
      <p>{body}</p>
    </div>
  )
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  const btns: { key: string; href: string | null; label: string }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions' },
  ]
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="blackline-social" aria-label="Contact">
      {visible.map(b => {
        // The Reserve button isn't a real anchor — there's no element with
        // id="book" in the DOM. The tab pill IS the canonical "switch to
        // Book" trigger. Intercept the click so the header button drives
        // setActive + scroll into the tab rail.
        const onClick = b.key === 'book' && !header.book_button_url
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        return (
          <a key={b.key} href={safeHref(b.href!)} className="blackline-social-btn" onClick={onClick}>
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
  return (
    <footer className="blackline-footer">
      {footer.show_quick_book !== false && services.length > 0 && (
        <div className="blackline-footer-cta-band">
          <button type="button" className="blackline-footer-book" onClick={goBook}>
            Reserve the chair
          </button>
        </div>
      )}

      <div className="blackline-footer-inner">
        <div className="blackline-footer-col blackline-footer-brand">
          <p className="blackline-eyebrow">The Shop</p>
          <p className="blackline-footer-name">{name}</p>
          {footer.subtext && <p className="blackline-footer-subtext">{footer.subtext}</p>}
        </div>

        {footer.show_hours !== false && hours.length > 0 && (
          <div className="blackline-footer-col blackline-footer-col--hours">
            <p className="blackline-eyebrow">Hours</p>
            <ul className="blackline-footer-hours">
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
          <div className="blackline-footer-col">
            <p className="blackline-eyebrow">Contact</p>
            <ul className="blackline-footer-contact">
              {p?.public_phone && <li><a href={`tel:${p.public_phone}`}>{p.public_phone}</a></li>}
              {p?.public_email && <li><a href={`mailto:${p.public_email}`}>{p.public_email}</a></li>}
            </ul>
          </div>
        )}
      </div>

      {footer.show_powered_by !== false && (
        <div className="blackline-footer-credit-band">
          <p>Powered by BookReady</p>
        </div>
      )}
    </footer>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const BLACKLINE_CSS = `
.blackline-template {
  ${tokensToCss()}
  --blackline-bg: #0A0A0A;
  --blackline-fg: #E8E2D7;
  --blackline-fg-muted: rgba(232,226,215,0.62);
  --blackline-rule: rgba(232,226,215,0.14);
  --blackline-accent: #B8966B;
  --blackline-display: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  --blackline-body: 'Inter', system-ui, -apple-system, sans-serif;

  background: var(--blackline-bg);
  color: var(--blackline-fg);
  font-family: var(--blackline-body);
  font-size: var(--brk-font-body);
  line-height: 1.55;
  letter-spacing: 0.01em;
  min-height: 100vh;
}
.blackline-template * { box-sizing: border-box; }
.blackline-template img { max-width: 100%; display: block; }
.blackline-template a { color: inherit; text-decoration: none; }

/* Eyebrow — tracked uppercase brass label used above every section title. */
.blackline-eyebrow {
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--blackline-accent);
  margin: 0 0 var(--brk-space-md);
}

/* Section titles — Space Grotesk, large, restrained tracking. */
.blackline-section-title {
  font-family: var(--blackline-display);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.08;
  margin: 0 0 var(--brk-space-xl);
  color: var(--blackline-fg);
}

/* Announce bar — hairline brass top + bottom, tracked uppercase. */
.blackline-announce {
  text-align: center;
  padding: 14px var(--brk-space-md);
  border-top: 1px solid var(--blackline-rule);
  border-bottom: 1px solid var(--blackline-rule);
  font-family: var(--blackline-body);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
}

/* Header — cover image runs to the edge, content stays inside container. */
.blackline-header { padding: 0 0 var(--brk-space-3xl); }
.blackline-cover {
  width: 100%;
  height: clamp(280px, 50vw, 540px);
  object-fit: cover;
  border-bottom: 1px solid var(--blackline-rule);
  filter: brightness(0.86);
}
.blackline-header-inner {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-2xl) var(--brk-space-md) 0;
  text-align: left;
}
.blackline-name {
  font-family: var(--blackline-display);
  font-size: clamp(40px, 7vw, 84px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 0.96;
  margin: 0 0 var(--brk-space-sm);
}
.blackline-business-type {
  font-family: var(--blackline-body);
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
  margin: 0 0 var(--brk-space-xl);
}

.blackline-social {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: var(--brk-space-lg);
  border-top: 1px solid var(--blackline-rule);
  border-bottom: 1px solid var(--blackline-rule);
}
.blackline-social-btn {
  flex: 0 0 auto;
  padding: 16px 24px;
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--blackline-fg);
  border-right: 1px solid var(--blackline-rule);
  transition: color 160ms ease;
}
.blackline-social-btn:last-child { border-right: none; }
.blackline-social-btn:hover { color: var(--blackline-accent); }
/* Mobile — buttons wrap onto multiple rows. Add top borders to every
   button so each wrapped row has a clean visual separator. Drop the
   outer top border on .blackline-social so the first row's buttons
   provide the top edge instead. */
@media (max-width: 720px) {
  .blackline-social { border-top: none; }
  .blackline-social-btn { border-top: 1px solid var(--blackline-rule); }
}

/* ── Tab rail ── */
/* Sticky brass-edged rail beneath the hero. Horizontal scroll on narrow
   viewports keeps every tab reachable without crowding desktop. */
.blackline-tab-rail {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--blackline-bg);
  border-top: 1px solid var(--blackline-rule);
  border-bottom: 1px solid var(--blackline-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.blackline-tab-rail::-webkit-scrollbar { display: none; }

.blackline-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: 0 var(--brk-space-md);
  gap: 0;
}

.blackline-tab-pill {
  flex: 0 0 auto;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 18px 22px;
  margin: 0;
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
  white-space: nowrap;
}
.blackline-tab-pill:hover { color: var(--blackline-fg); }
.blackline-tab-pill.is-active {
  color: var(--blackline-accent);
  border-bottom-color: var(--blackline-accent);
}
.blackline-tab-pill:focus-visible {
  outline: 2px solid var(--blackline-accent);
  outline-offset: -2px;
}

/* Tab panels — keep all in DOM (preserves booking form state across tab
   switches), but only is-active is visible. */
.blackline-tab-panel { display: none; }
.blackline-tab-panel.is-active { display: block; }

/* Section frame — generous editorial padding, container-narrow.
   Inside a tab panel, the first section drops its top border so the
   tab rail's hairline doesn't double up with the section's. */
.blackline-section {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  border-top: 1px solid var(--blackline-rule);
}
.blackline-tab-panel > .blackline-section:first-child { border-top: none; }
.blackline-book { padding-top: var(--brk-space-3xl); }

.blackline-empty {
  font-family: var(--blackline-body);
  font-size: 14px;
  color: var(--blackline-fg-muted);
  margin: 0;
}

/* Gallery / Results grid */
.blackline-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(2, 1fr);
  background: var(--blackline-rule);
}
@media (min-width: 720px) {
  .blackline-grid { grid-template-columns: repeat(3, 1fr); }
}
.blackline-grid > li {
  background: var(--blackline-bg);
  aspect-ratio: 1;
  overflow: hidden;
}
.blackline-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(0.05);
}
.blackline-grid-2 { grid-template-columns: 1fr; gap: var(--brk-space-md); background: transparent; }
@media (min-width: 720px) {
  .blackline-grid-2 { grid-template-columns: repeat(2, 1fr); }
}
.blackline-ba {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--blackline-rule);
}
.blackline-ba > img { aspect-ratio: 1; }

/* About */
.blackline-about-body {
  font-size: 18px;
  line-height: 1.65;
  max-width: 60ch;
  margin: 0 0 var(--brk-space-2xl);
  color: var(--blackline-fg);
}
.blackline-highlights {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0;
}
@media (min-width: 720px) {
  .blackline-highlights { grid-template-columns: repeat(2, 1fr); }
}
.blackline-highlights > li {
  padding: var(--brk-space-xl) 0;
  border-top: 1px solid var(--blackline-rule);
}
.blackline-highlights > li:last-child { border-bottom: 1px solid var(--blackline-rule); }
@media (min-width: 720px) {
  .blackline-highlights > li:nth-child(odd) { padding-right: var(--brk-space-xl); }
  .blackline-highlights > li:nth-child(even) { padding-left: var(--brk-space-xl); border-left: 1px solid var(--blackline-rule); }
}
.blackline-highlights h3 {
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 var(--brk-space-xs);
}
.blackline-highlights p { margin: 0; color: var(--blackline-fg-muted); }

/* Policies */
.blackline-policy-stack {
  border-top: 1px solid var(--blackline-rule);
}
.blackline-policy {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--brk-space-sm);
  padding: var(--brk-space-xl) 0;
  border-bottom: 1px solid var(--blackline-rule);
}
@media (min-width: 720px) {
  .blackline-policy { grid-template-columns: 200px 1fr; gap: var(--brk-space-2xl); }
}
.blackline-policy h3 {
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--blackline-accent);
  margin: 0;
}
.blackline-policy p {
  margin: 0;
  color: var(--blackline-fg);
  line-height: 1.65;
}

/* Advice notes */
.blackline-note-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.blackline-note-list > li {
  padding: var(--brk-space-xl) 0;
  border-top: 1px solid var(--blackline-rule);
}
.blackline-note-list > li:last-child { border-bottom: 1px solid var(--blackline-rule); }
.blackline-note-list h3 {
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--brk-space-xs);
}
.blackline-note-list p { margin: 0; color: var(--blackline-fg-muted); }

/* Timeline */
.blackline-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: timeline;
}
.blackline-timeline > li {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: var(--brk-space-lg);
  padding: var(--brk-space-xl) 0;
  border-top: 1px solid var(--blackline-rule);
  align-items: baseline;
}
.blackline-timeline > li:last-child { border-bottom: 1px solid var(--blackline-rule); }
.blackline-timeline-num {
  font-family: var(--blackline-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: var(--blackline-accent);
}
.blackline-timeline h3 {
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--brk-space-xs);
}
.blackline-timeline p { margin: 0; color: var(--blackline-fg-muted); }

/* FAQ */
.blackline-faq-stack { border-top: 1px solid var(--blackline-rule); }
.blackline-faq {
  border-bottom: 1px solid var(--blackline-rule);
  padding: var(--brk-space-lg) 0;
}
.blackline-faq summary {
  font-family: var(--blackline-display);
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--brk-space-md);
}
.blackline-faq summary::-webkit-details-marker { display: none; }
.blackline-faq summary::after {
  content: '+';
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 400;
  color: var(--blackline-accent);
  line-height: 1;
}
.blackline-faq[open] summary::after { content: '−'; }
.blackline-faq p {
  margin: var(--brk-space-md) 0 0;
  color: var(--blackline-fg-muted);
  line-height: 1.65;
}

/* Reviews */
.blackline-reviews {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0;
}
@media (min-width: 720px) {
  .blackline-reviews { grid-template-columns: repeat(2, 1fr); }
}
.blackline-reviews > li {
  padding: var(--brk-space-xl) 0;
  border-top: 1px solid var(--blackline-rule);
}
.blackline-reviews > li:nth-last-child(-n+1) { border-bottom: 1px solid var(--blackline-rule); }
@media (min-width: 720px) {
  .blackline-reviews > li:nth-child(odd) { padding-right: var(--brk-space-xl); }
  .blackline-reviews > li:nth-child(even) {
    padding-left: var(--brk-space-xl);
    border-left: 1px solid var(--blackline-rule);
  }
}
.blackline-reviews blockquote {
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  margin: 0 0 var(--brk-space-md);
  color: var(--blackline-fg);
}
.blackline-review-attr {
  font-family: var(--blackline-body);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
  margin: 0;
}

/* Thanks */
.blackline-thanks { text-align: center; padding-block: var(--brk-space-3xl); }
.blackline-thanks p {
  max-width: 56ch;
  margin: 0 auto;
  color: var(--blackline-fg-muted);
  line-height: 1.65;
}
.blackline-thanks-sign {
  margin-top: var(--brk-space-lg) !important;
  font-family: var(--blackline-body);
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--blackline-accent) !important;
}

/* ── Footer ── */
/* Banded layout: brass CTA band → informational columns → credit band.
   Each band spans full width; the columns inside content-band live in
   the standard container-narrow. Hairline brass between bands and
   between columns gives the editorial structure. */
.blackline-footer {
  margin-top: var(--brk-space-3xl);
  border-top: 1px solid var(--blackline-rule);
}

/* CTA band — bold brass action centered above the columns. Replaces the
   old "Quick Book pill jammed into a narrow right column" arrangement
   which read as a layout afterthought. */
.blackline-footer-cta-band {
  padding: var(--brk-space-2xl) var(--brk-space-md);
  text-align: center;
  border-bottom: 1px solid var(--blackline-rule);
}

/* Informational columns. auto-fit so 1, 2, or 3 visible columns always
   share the container width evenly without leaving phantom gaps.
   Hairline brass left-border between adjacent columns gives the band
   structure without relying on each column having identical content
   heights. */
.blackline-footer-inner {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--brk-space-2xl);
}
@media (min-width: 720px) {
  .blackline-footer-inner {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0;
  }
  /* Every column gets symmetric horizontal padding so middle columns
     have breathing room on BOTH sides of the brass dividers. First
     column drops its left pad (sits at the container edge); last column
     drops its right pad. */
  .blackline-footer-col {
    padding: 0 var(--brk-space-2xl);
  }
  .blackline-footer-col:first-child { padding-left: 0; }
  .blackline-footer-col:last-child  { padding-right: 0; }
  /* Per feedback — drop the divider between columns. Columns now sit
     on bare canvas with just the symmetric padding for separation. */
}
.blackline-footer-col {
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-md);
}
.blackline-footer-brand { gap: var(--brk-space-sm); }
/* Hours column needs more breathing room than the others — day-name +
   time-string + side padding doesn't fit comfortably in a 200px track.
   Setting an intrinsic min-width pushes its grid track wider; the other
   1fr tracks share whatever space remains. */
.blackline-footer-col--hours { min-width: 260px; }
.blackline-footer-name {
  font-family: var(--blackline-display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.015em;
  margin: 0;
}
.blackline-footer-subtext {
  margin: 0;
  color: var(--blackline-fg-muted);
  max-width: 32ch;
  line-height: 1.55;
}

/* Hours + contact lists */
.blackline-footer-hours,
.blackline-footer-contact {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-xs);
}
.blackline-footer-hours li {
  display: flex;
  justify-content: space-between;
  gap: var(--brk-space-md);
  font-size: 13px;
  color: var(--blackline-fg-muted);
  font-variant-numeric: tabular-nums;
}
.blackline-footer-hours li > span:last-child {
  font-family: var(--blackline-display);
  letter-spacing: 0.04em;
  color: var(--blackline-fg);
}
.blackline-footer-contact { font-size: 14px; }
.blackline-footer-contact a {
  color: var(--blackline-fg);
  transition: color 160ms ease;
}
.blackline-footer-contact a:hover { color: var(--blackline-accent); }

/* Brass CTA button — sized for the band (large hit area, generous padding). */
.blackline-footer-book {
  display: inline-flex;
  align-items: center;
  padding: 18px 44px;
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  background: var(--blackline-accent);
  color: var(--blackline-bg);
  border: 1px solid var(--blackline-accent);
  cursor: pointer;
  transition: opacity 160ms ease;
}
.blackline-footer-book:hover { opacity: 0.86; }

/* Credit band — final hairline-bordered strip with the Powered By line. */
.blackline-footer-credit-band {
  padding: var(--brk-space-md);
  border-top: 1px solid var(--blackline-rule);
  text-align: center;
}
.blackline-footer-credit-band p {
  font-family: var(--blackline-body);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .blackline-template *,
  .blackline-template *::before,
  .blackline-template *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`
