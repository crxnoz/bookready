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
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import BlacklineBooking from './BlacklineBooking'

// ── Contact-href helper ──────────────────────────────────────────────────────
// Mirrors Velvet Theory: normalize a bare phone/email/sms value to a scheme,
// then run it through safeHref's allowlist. Used by the Message button (sms),
// which has no profile fallback.
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
  // Loosely-typed view of the policy bag so owner-extra fields the
  // BusinessPolicy interface doesn't enumerate (late_policy, refund_policy,
  // guest_policy) still resolve at runtime. Gallery/Results read straight from
  // `site` inside their shared sections, so no local copies are kept.
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
  // Map each tab to its website_sections.sort_order so the rail honors the
  // order set in the editor. Tabs without a resolved order sink to the end.
  const orderByTab: Record<string, number> = {}
  for (const s of (site.template?.sections ?? [])) {
    const tid = SECTION_KEY_TO_TAB[s.section_key]
    if (tid) orderByTab[tid] = s.sort_order
  }

  // Book is always shown (the booking flow is the template's whole point);
  // other tabs respect editor toggles. Stable-sorted by editor sort_order.
  const visibleTabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  // Resolved tab labels keyed by TabId — reused as each tabbed section's
  // eyebrow so editing a tab name in the editor renames its eyebrow too.
  const tabLabel = allTabs.reduce((acc, t) => { acc[t.id] = t.label; return acc }, {} as Record<TabId, string>)

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      <style>{BLACKLINE_CSS}</style>
      <style>{SECTIONS_CSS}</style>
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
            {/* Hardcoded "The Shop" eyebrow removed — wasn't editable and
                read as confusing copy in the editor preview. The hero
                already carries the cover + business name + business type. */}
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

        {/* 4. Gallery / Work — migrated to the shared GallerySection. Heading
            keeps Blackline's old "Gallery" copy; eyebrow is the live tab label
            (so renaming the tab renames the eyebrow). The .blackline-template
            .brk-gallery* skin below re-applies Blackline's sharp, hairline
            edge-to-edge grid (zero radius, flat tiles, brass gutters). */}
        {enabledByTab.gallery && (
          <div className={`blackline-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              heading={settings.gallery?.heading || (tabs.gallery_label ?? 'Gallery')}
              eyebrow={tabLabel.gallery}
              displayName={display}
              variant="grid"
              emptyText="No gallery items yet."
              ariaLabel={tabs.gallery_label ?? 'Gallery'}
            />
          </div>
        )}

        {/* 5. Results / Before & After — migrated to the shared
            BeforeAfterSection. Blackline's old render was a flat paired diptych
            with NO center separator and NO Before/After label tags, so both are
            omitted here. The .blackline-template .brk-ba* skin below restores
            the sharp 1px-brass-gutter pair (zero radius, flat panes). */}
        {enabledByTab.results && (
          <div className={`blackline-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              heading={settings.results?.heading || (tabs.results_label ?? 'Results')}
              eyebrow={tabLabel.results}
              emptyText="No results yet."
              ariaLabel={tabs.results_label ?? 'Results'}
            />
          </div>
        )}

        {/* 6. About / The Shop */}
        {enabledByTab.about && (
          <div className={`blackline-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="blackline-section blackline-about" aria-label={tabs.about_label ?? 'About'}>
              <p className="blackline-eyebrow">{tabLabel.about ?? 'About'}</p>
              <h2 className="blackline-section-title">{about.heading ?? 'The Shop'}</h2>
              {/* Optional hero image — first slot of about.images. Renders
                  only when set so the manifest control gracefully degrades. */}
              {Array.isArray(about.images) && about.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="blackline-about-img" src={about.images[0]} alt="" loading="lazy" />
              )}
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

        {/* 7. Policy / House Rules — migrated to the shared PolicySection.
            Rows reproduce Blackline's old field set + labels (Deposit /
            Cancellation / Late arrival / No-show / Refund / Guest);
            custom_groups map to the shared {heading, items[{title, content}]}
            shape (content falls back to the legacy `body` field). marker="none"
            keeps Blackline's flat, marker-less divided ledger. The
            .blackline-template .brk-policy* skin below restores the brass
            uppercase label / 200px column / hairline-divided rows. */}
        {enabledByTab.policy && (
          <div className={`blackline-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <PolicySection
              rows={[
                { label: 'Deposit',      body: policies.deposit_policy },
                { label: 'Cancellation', body: policies.cancellation_policy },
                { label: 'Late arrival', body: policies.late_policy },
                { label: 'No-show',      body: policies.no_show_policy },
                { label: 'Refund',       body: policies.refund_policy },
                { label: 'Guest',        body: policies.guest_policy },
              ]}
              customGroups={(Array.isArray(policies.custom_groups) ? policies.custom_groups : []).map((g: any) => ({
                heading: g.heading,
                items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                  title: it.title,
                  content: it.content ?? it.body,
                })),
              }))}
              heading={settings.policy?.heading || (tabs.policy_label ?? 'Policy')}
              eyebrow={tabLabel.policy}
              marker="none"
              emptyText="No house rules yet."
              ariaLabel={tabs.policy_label ?? 'House Rules'}
            />
          </div>
        )}

        {/* 8. Advice / Notes — migrated to the shared InstructionsSection.
            Blackline's advice was a plain divided list with NO per-item
            marker, so showMark={false} (numbered defaults false). The
            .blackline-template .brk-instruction* skin below re-applies the
            Space Grotesk titles + muted bodies + hairline brass rules. */}
        {enabledByTab.advice && (
          <div className={`blackline-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Advice'}
              eyebrow={tabLabel.advice}
              cardKicker={settings.advice?.card_kicker}
              showMark={false}
              emptyText="No notes yet."
              ariaLabel={tabs.advice_label ?? 'Notes'}
            />
          </div>
        )}

        {/* 9. Timeline / Process — migrated to the shared InstructionsSection.
            numbered → zero-padded ordinals (01, 02…). The skin below restyles
            the shared 40px serif ordinal back to Blackline's compact brass
            Space Grotesk number in its 56px column. */}
        {enabledByTab.timeline && (
          <div className={`blackline-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <InstructionsSection
              items={timeline}
              heading={settings.timeline?.heading ?? 'Timeline'}
              eyebrow={tabLabel.timeline}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="No timeline yet."
              ariaLabel={tabs.timeline_label ?? 'Process'}
            />
          </div>
        )}

        {/* 10. FAQ (always visible below tabs) — migrated to the shared,
            theme-tokenized platform component. Blackline's palette is
            bridged onto the canonical --brk-* tokens above; the
            .blackline-* skin at the end of BLACKLINE_CSS re-applies the
            sharp dividers + brass +/− marker. */}
        {additionals.faq?.enabled !== false && (
          <FaqSection
            items={additionals.faq?.items}
            heading={additionals.faq?.heading ?? 'Questions'}
            eyebrow="FAQ"
          />
        )}

        {/* 11. Reviews — shared component. Blackline's flat divided 2-col
            grid (no cards, brass ★) is reproduced by the skin. */}
        {additionals.reviews?.enabled !== false && (
          <ReviewsSection
            items={additionals.reviews?.items}
            heading={additionals.reviews?.heading ?? 'On the chair'}
            eyebrow="Reviews"
            starGlyph="★"
          />
        )}

        {/* 12. Thank-you — shared component. Plain centered block; the
            shared gate (show !== false && title) matches the old inline
            condition. Signature falls back to the business name. */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow={settings.additionals?.thank_you_eyebrow || 'Outro'}
        />

        {/* Footer — shared 3-band component. Mirrors the old local Footer
            exactly: businessName = override || display, eyebrow labels
            The Shop / Hours / Contact, CTA "Reserve the chair", credit
            band is "Powered by BookReady" only (no copyright prefix →
            copyrightName omitted). The sharp brass CTA is restored by the
            skin. */}
        <SiteFooter
          businessName={(settings.footer?.business_name_override ?? '').trim() || display}
          subtext={settings.footer?.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          ctaLabel="Reserve the chair"
          brandLabel={settings.footer?.brand_label || 'The Studio'}
          hoursLabel="Hours"
          contactLabel="Contact"
          show={{
            quickBook: settings.footer?.show_quick_book,
            hours: settings.footer?.show_hours,
            contact: settings.footer?.show_contact_links,
            poweredBy: settings.footer?.show_powered_by,
          }}
        />
      </div>
    </>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  const btns: { key: string; href: string | null; label: string }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'message',    href: safeContactHref(header.message_button_url, 'sms'), label: 'Message' },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'tiktok',     href: safeHref(header.tiktok_button_url)    ?? null, label: 'TikTok' },
    { key: 'youtube',    href: safeHref(header.youtube_button_url)   ?? null, label: 'YouTube' },
    { key: 'facebook',   href: safeHref(header.facebook_button_url)  ?? null, label: 'Facebook' },
    { key: 'pinterest',  href: safeHref(header.pinterest_button_url) ?? null, label: 'Pinterest' },
    { key: 'whatsapp',   href: safeHref(header.whatsapp_button_url)  ?? null, label: 'WhatsApp' },
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

  /* Bridge Blackline's palette + fonts onto the canonical --brk-* tokens
     the shared section components (@bkrdy/platform/sections) are styled
     against. Blackline binds --blackline-bg/-fg/-fg-muted/-rule via an
     INLINE style on the root div (computed from theme.accent_color, which
     Blackline treats as the CANVAS), so these aliases let the runtime
     canvas flow straight through to the shared sections. The brass accent
     is constant. The .blackline-* skin at the end of this file then
     re-applies Blackline's industrial signatures over the shared base. */
  --brk-color-bg: var(--blackline-bg);
  --brk-color-surface: var(--blackline-bg);
  --brk-color-text: var(--blackline-fg);
  --brk-color-muted: var(--blackline-fg-muted);
  --brk-color-rule: var(--blackline-rule);
  --brk-color-accent: var(--blackline-accent);
  --brk-color-on-accent: var(--blackline-bg);
  --brk-family-display: var(--blackline-display);
  --brk-family-body: var(--blackline-body);

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
  gap: 8px;
  margin-top: var(--brk-space-lg);
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
  border: 1px solid var(--blackline-rule);
  transition: color 160ms ease, border-color 160ms ease;
}
.blackline-social-btn:hover {
  color: var(--blackline-accent);
  border-color: var(--blackline-accent);
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

/* Gallery + Results + Policies now render via the shared GallerySection /
   BeforeAfterSection / PolicySection (@bkrdy/platform/sections). Their
   Blackline skin lives in the SKIN block at the end of this file
   (.blackline-template .brk-gallery* / .brk-ba* / .brk-policy*). The old
   .blackline-grid* / .blackline-ba* / .blackline-policy* / .blackline-empty
   rules were deleted in that migration. */

/* About */
.blackline-about-body {
  font-size: 18px;
  line-height: 1.65;
  max-width: 60ch;
  margin: 0 0 var(--brk-space-2xl);
  color: var(--blackline-fg);
}
/* About hero image — flat, sharp-cornered, full-width within the column
   to match Blackline's industrial vocabulary (no rounded card chrome). */
.blackline-about-img {
  display: block;
  width: 100%;
  max-width: 720px;
  height: auto;
  margin: 0 0 var(--brk-space-2xl);
  border: 1px solid var(--blackline-rule);
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

/* Advice notes + Timeline now render via the shared InstructionsSection
   (@bkrdy/platform/sections). Their Blackline skin lives in the SKIN block
   at the end of this file (.blackline-template .brk-instruction*). The old
   .blackline-note-list / .blackline-timeline / .blackline-timeline-num rules
   were deleted in that migration. */

@media (prefers-reduced-motion: reduce) {
  .blackline-template *,
  .blackline-template *::before,
  .blackline-template *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

/* ════════════════════════════════════════════════════════════════════
   BLACKLINE SKIN over the shared platform sections (@bkrdy/platform/sections)
   ────────────────────────────────────────────────────────────────────
   The FAQ / Reviews / Thank-you / Footer now render the canonical
   .brk-* markup. These overrides (scoped under .blackline-template, AFTER
   SECTIONS_CSS) re-apply Blackline's industrial signatures over the
   shared base: sharp corners (zero radius), flat surfaces (no card
   chrome), hairline brass rules, Space Grotesk titles, and the constant
   brass accent. All colors/fonts come from the bridged tokens. The old
   .blackline-faq/.blackline-reviews/.blackline-thanks/.blackline-footer
   rules above are now dead (left inert).
   ════════════════════════════════════════════════════════════════════ */

/* Blackline runs a tighter editorial single column (shared default is
   wider) and is LEFT-aligned, not centered. */
.blackline-template .brk-section { max-width: var(--brk-container-narrow); }
.blackline-template .brk-section-head { text-align: left; margin-left: 0; max-width: none; }

/* Section title — Space Grotesk, restrained tracking, sharp (no neon). */
.blackline-template .brk-section-title {
  font-family: var(--blackline-display);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.08;
  color: var(--blackline-fg);
}
/* Eyebrow — tracked uppercase brass, matching .blackline-eyebrow. */
.blackline-template .brk-eyebrow {
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--blackline-accent);
}

/* ── FAQ skin — sharp hairline dividers + brass +/− marker, display-font
   summary on a space-between row. Matches .blackline-faq. ── */
.blackline-template .brk-faq summary {
  font-family: var(--blackline-display);
  font-size: 18px;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--brk-space-md);
  padding: var(--brk-space-lg) 0;
}
/* Replace the shared absolutely-positioned +/− with Blackline's inline
   brass marker (the flex summary above handles placement). */
.blackline-template .brk-faq summary::after {
  position: static;
  transform: none;
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 400;
  color: var(--blackline-accent);
  line-height: 1;
}
.blackline-template .brk-faq[open] summary::after { content: '\\2212'; }
.blackline-template .brk-faq p {
  padding: var(--brk-space-md) 0 var(--brk-space-lg);
  line-height: 1.65;
}

/* ── Reviews skin — Blackline's flat divided 2-col grid (NOT cards):
   transparent cells, zero radius, hairline brass dividers, brass stars,
   display-font blockquote. No quote watermark. Matches .blackline-reviews. ── */
.blackline-template .brk-reviews { gap: 0; }
@media (min-width: 720px) {
  .blackline-template .brk-reviews { grid-template-columns: repeat(2, 1fr); gap: 0; }
}
/* On the shared component the 821px breakpoint promotes 2 cols; force
   single col below Blackline's own 720px breakpoint so the dividers read
   correctly on tablet/mobile. */
@media (max-width: 719px) {
  .blackline-template .brk-reviews { grid-template-columns: 1fr; }
}
.blackline-template .brk-review {
  background: transparent;
  border: 0;
  border-radius: 0;
  border-top: 1px solid var(--blackline-rule);
  padding: var(--brk-space-xl) 0;
}
.blackline-template .brk-review:nth-last-child(-n+1) {
  border-bottom: 1px solid var(--blackline-rule);
}
@media (min-width: 720px) {
  .blackline-template .brk-review:nth-child(odd) { padding-right: var(--brk-space-xl); }
  .blackline-template .brk-review:nth-child(even) {
    padding-left: var(--brk-space-xl);
    border-left: 1px solid var(--blackline-rule);
  }
}
/* Blackline had no big quote watermark — hide the shared ornament. */
.blackline-template .brk-review-quote { display: none; }
.blackline-template .brk-review-stars {
  font-size: 13px;
  letter-spacing: 4px;
  line-height: 1;
  color: var(--blackline-accent);
  margin: 0 0 var(--brk-space-sm);
}
.blackline-template .brk-review blockquote {
  font-family: var(--blackline-display);
  font-style: normal;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--blackline-fg);
}
.blackline-template .brk-review-attr {
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
}

/* ── Thank-you skin — plain centered block (no frame, no neon). Space
   Grotesk title, muted body, brass uppercase signature. Matches
   .blackline-thanks. ── */
.blackline-template .brk-thanks-title {
  font-family: var(--blackline-display);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.08;
  color: var(--blackline-fg);
}
.blackline-template .brk-thanks-body {
  max-width: 56ch;
  line-height: 1.65;
  color: var(--blackline-fg-muted);
}
.blackline-template .brk-thanks-sign {
  font-family: var(--blackline-body);
  font-style: normal;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--blackline-accent);
}

/* ── Footer skin — sharp-cornered brass CTA + flat columns (no dividers),
   matching .blackline-footer*. ── */
.blackline-template .brk-footer { background: transparent; }
.blackline-template .brk-footer-inner { max-width: var(--brk-container-narrow); }
/* Per Blackline's design, columns sit on bare canvas — drop the shared
   inter-column divider. */
@media (min-width: 720px) {
  .blackline-template .brk-footer-col + .brk-footer-col { border-left: 0; }
}
/* Sharp brass CTA — zero radius, opacity hover (not brightness). */
.blackline-template .brk-footer-book {
  border-radius: 0;
  padding: 18px 44px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.28em;
  transition: opacity 160ms ease;
}
.blackline-template .brk-footer-book:hover { filter: none; opacity: 0.86; }
.blackline-template .brk-footer-name {
  font-family: var(--blackline-display);
  font-weight: 500;
  font-size: 28px;
  letter-spacing: -0.015em;
}
/* Hours value in display font with light tracking, matching the old
   .blackline-footer-hours li > span:last-child treatment. */
.blackline-template .brk-footer-hours-row dd {
  font-family: var(--blackline-display);
  letter-spacing: 0.04em;
  color: var(--blackline-fg);
}
.blackline-template .brk-footer-credit-band p { letter-spacing: 0.2em; }

/* ── Advice + Timeline skin (shared InstructionsSection) ──
   Blackline is FLAT, SHARP, brass. The shared divided list already matches
   Blackline's old note-list closely (hairline rules via the bridged
   --brk-color-rule). These overrides re-apply Blackline's exact type +
   spacing and convert the shared 40px serif ordinal into Blackline's compact
   brass Space Grotesk number. No neon, no circular node, no card chrome. */

/* Left-aligned, muted, flat empty state (the shared default is centered
   italic serif). Matches the old .blackline-empty. */
.blackline-template .brk-instructions-section .brk-empty {
  text-align: left;
  font-style: normal;
  font-family: var(--blackline-body);
  font-size: 14px;
  color: var(--blackline-fg-muted);
  padding: 0;
}

/* Full-width divided rows — drop the shared 720px cap so the list spans the
   narrow container like Blackline's note-list / timeline did. */
.blackline-template .brk-instructions { max-width: none; }

/* Row rhythm — Blackline's --brk-space-xl vertical padding + hairline rules
   (rules already come from the shared base via --brk-color-rule). */
.blackline-template .brk-instruction {
  padding: var(--brk-space-xl) 0;
  gap: var(--brk-space-lg);
}

/* Titles + bodies — Space Grotesk 22px / 500 title, muted body, matching the
   old .blackline-note-list / .blackline-timeline treatment. */
.blackline-template .brk-instruction-body h3 {
  font-family: var(--blackline-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 var(--brk-space-xs);
  color: var(--blackline-fg);
}
.blackline-template .brk-instruction-body p {
  color: var(--blackline-fg-muted);
  line-height: 1.65;
}

/* Advice (plain, no marker column) — single column, baseline rhythm above. */

/* Timeline (numbered) — Blackline's compact brass ordinal in a 56px column,
   baseline-aligned. Replaces the shared 40px serif number; sharp, no node. */
.blackline-template .brk-instructions--numbered .brk-instruction {
  grid-template-columns: 56px 1fr;
  gap: var(--brk-space-lg);
  padding: var(--brk-space-xl) 0;
  align-items: baseline;
}
.blackline-template .brk-instructions--numbered .brk-instruction-mark {
  font-family: var(--blackline-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.18em;
  line-height: 1.55;
  text-align: left;
  color: var(--blackline-accent);
  font-variant-numeric: normal;
}
.blackline-template .brk-instructions--numbered .brk-instruction-body h3 { font-size: 22px; }

/* ── Gallery skin (shared GallerySection) ──
   Blackline's signature gallery is a SHARP, FLAT, edge-to-edge grid: square
   tiles with zero radius, no card fill, hairline brass gutters formed by a
   1px grid gap over a brass-ruled background (the tile fill is the canvas, so
   only the gutters show as brass lines). 2 cols → 3 at 720px, matching the old
   .blackline-grid. The shared base's 4/5 rounded surface cards are fully
   overridden. Group headings go left-aligned Space Grotesk (Blackline is
   left-aligned, not centered). */
.blackline-template .brk-gallery-grid {
  gap: 1px;
  grid-template-columns: repeat(2, 1fr);
  background: var(--blackline-rule);
}
@media (min-width: 720px) {
  .blackline-template .brk-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 1px; }
}
.blackline-template .brk-gallery-item {
  border: 0;
  border-radius: 0;
  background: var(--blackline-bg);
  aspect-ratio: 1;
}
.blackline-template .brk-gallery-item img { filter: grayscale(0.05); }
.blackline-template .brk-gallery-group-heading {
  text-align: left;
  font-family: var(--blackline-display);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--blackline-fg);
}

/* ── Before / After skin (shared BeforeAfterSection) ──
   Blackline's old results were a flat square diptych: a 1fr/1fr pair with a
   single 1px brass gutter, zero radius, no labels, no separator (both omitted
   in the JSX). Reproduce the sharp paired panes over the shared base (which is
   a 3/4 rounded pair with an auto separator column + 18px gap). Keep the pair
   at 1fr/1fr on ALL viewports — the old grid never collapsed to a single
   column on mobile. */
.blackline-template .brk-ba-pair {
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--blackline-rule);
}
@media (max-width: 640px) {
  .blackline-template .brk-ba-pair { grid-template-columns: 1fr 1fr; }
}
.blackline-template .brk-ba-pane img {
  aspect-ratio: 1;
  border: 0;
  border-radius: 0;
}
/* Caption — Space Grotesk, muted, left-aligned (shared base is centered
   italic serif). */
.blackline-template .brk-ba-caption {
  text-align: left;
  font-family: var(--blackline-display);
  font-style: normal;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--blackline-fg-muted);
}
.blackline-template .brk-ba-group-heading {
  text-align: left;
  font-family: var(--blackline-display);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--blackline-fg);
}

/* ── Policy skin (shared PolicySection, marker="none") ──
   Blackline's house rules are a brass divided ledger: a tracked uppercase
   brass label in a fixed 200px column with the rule body beside it (stacked on
   narrow), hairline-divided rows, spanning the narrow container. The shared
   base is a single-column 720px-capped list with a big 26px serif title.
   Re-form the two-column label/body grid on the plain (marker-less) list and
   restyle the title back to Blackline's brass label. */
.blackline-template .brk-policy-list {
  max-width: none;
  border-top: 1px solid var(--blackline-rule);
}
.blackline-template .brk-policy-list--plain .brk-policy-row {
  grid-template-columns: 1fr;
  gap: var(--brk-space-sm);
  padding: var(--brk-space-xl) 0;
  border-bottom: 1px solid var(--blackline-rule);
  align-items: start;
}
@media (min-width: 720px) {
  .blackline-template .brk-policy-list--plain .brk-policy-row {
    grid-template-columns: 200px 1fr;
    gap: var(--brk-space-2xl);
  }
}
.blackline-template .brk-policy-title {
  margin: 0;
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--blackline-accent);
}
.blackline-template .brk-policy-text {
  color: var(--blackline-fg);
  line-height: 1.65;
}
.blackline-template .brk-policy-group-heading {
  text-align: left;
  font-family: var(--blackline-display);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--blackline-fg);
}
`
