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

import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import BlacklineBooking from './BlacklineBooking'

interface Props {
  site: PublicSite
  slug: string
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
            <SocialButtons header={header} profile={p} />
          </div>
        </header>

        {/* 3. Booking */}
        <section className="blackline-section blackline-book" aria-label={tabs.book_label ?? 'Reserve'}>
          <p className="blackline-eyebrow">Reserve</p>
          <h2 className="blackline-section-title">{tabs.book_label ?? 'Book a chair'}</h2>
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

        {/* 4. Gallery */}
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

        {/* 5. Results */}
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

        {/* 6. About */}
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

        {/* 7. Policies */}
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

        {/* 8. Advice */}
        <section className="blackline-section" aria-label={tabs.advice_label ?? 'Advice'}>
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

        {/* 9. Timeline */}
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
          </section>
        )}

        <Footer site={site} hours={hours} services={services} />
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

function SocialButtons({ header, profile }: { header: any; profile: any }) {
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
      {visible.map(b => (
        <a key={b.key} href={safeHref(b.href!)} className="blackline-social-btn">
          {b.label}
        </a>
      ))}
    </nav>
  )
}

function Footer({ site, hours, services }: { site: PublicSite; hours: any[]; services: any[] }) {
  const settings: any = site.template?.settings ?? {}
  const footer:   any = settings.footer ?? {}
  const p           = site.profile
  const name        = footer.business_name_override ?? p?.business_name ?? site.business_name ?? site.slug
  return (
    <footer className="blackline-footer">
      <div className="blackline-footer-inner">
        <div className="blackline-footer-brand">
          <p className="blackline-eyebrow">The Shop</p>
          <p className="blackline-footer-name">{name}</p>
          {footer.subtext && <p className="blackline-footer-subtext">{footer.subtext}</p>}
        </div>

        {footer.show_hours !== false && hours.length > 0 && (
          <div className="blackline-footer-col">
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

        {footer.show_quick_book !== false && services.length > 0 && (
          <div className="blackline-footer-col blackline-footer-cta-col">
            <a className="blackline-footer-book" href="#book">Quick book</a>
          </div>
        )}
      </div>

      {footer.show_powered_by !== false && (
        <p className="blackline-footer-credit">Powered by BookReady</p>
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

/* Section frame — generous editorial padding, container-narrow. */
.blackline-section {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  border-top: 1px solid var(--blackline-rule);
}
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

/* Footer */
.blackline-footer {
  border-top: 1px solid var(--blackline-rule);
  padding: var(--brk-space-3xl) var(--brk-space-md) var(--brk-space-xl);
  margin-top: var(--brk-space-3xl);
}
.blackline-footer-inner {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--brk-space-2xl);
}
@media (min-width: 720px) {
  .blackline-footer-inner { grid-template-columns: 2fr 1fr 1fr 1fr; }
}
.blackline-footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-sm);
}
.blackline-footer-name {
  font-family: var(--blackline-display);
  font-size: 24px;
  font-weight: 500;
  margin: 0;
}
.blackline-footer-subtext {
  margin: 0;
  color: var(--blackline-fg-muted);
  max-width: 36ch;
}
.blackline-footer-col {
  display: flex;
  flex-direction: column;
  gap: var(--brk-space-sm);
}
.blackline-footer-cta-col { justify-content: flex-end; align-items: flex-start; }
.blackline-footer-hours, .blackline-footer-contact {
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
  font-size: 13px;
  color: var(--blackline-fg-muted);
}
.blackline-footer-hours li > span:last-child {
  font-family: var(--blackline-display);
  letter-spacing: 0.04em;
  color: var(--blackline-fg);
}
.blackline-footer-contact a { color: var(--blackline-fg); transition: color 160ms ease; }
.blackline-footer-contact a:hover { color: var(--blackline-accent); }

.blackline-footer-book {
  display: inline-block;
  padding: 14px 24px;
  font-family: var(--blackline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  background: var(--blackline-accent);
  color: var(--blackline-bg);
  transition: opacity 160ms ease;
}
.blackline-footer-book:hover { opacity: 0.86; }

.blackline-footer-credit {
  font-family: var(--blackline-body);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--blackline-fg-muted);
  text-align: center;
  margin: var(--brk-space-2xl) 0 0;
  padding-top: var(--brk-space-lg);
  border-top: 1px solid var(--blackline-rule);
  max-width: var(--brk-container-narrow);
  margin-left: auto;
  margin-right: auto;
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
