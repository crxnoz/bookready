'use client'

/**
 * Example Blank — minimal valid BookReady template.
 *
 * Renders every required section in the simplest possible way so creators
 * can see what data flows where. Fork, restyle, ship.
 *
 * What this template demonstrates:
 *   - Reading every required field from the PublicSite payload
 *   - Rendering the 12 required sections (header through footer)
 *   - Embedding the platform's booking flow (placeholder import path
 *     until @bkrdy/platform is published in Phase 1)
 *   - Scoping all styles under a single root class (.eb-template)
 *
 * What this template does NOT do (intentionally — yours should):
 *   - Look good. The styling is deliberately spartan.
 *   - Animate anything. Add motion via prefers-reduced-motion-gated rules.
 *   - Handle empty states gracefully past "render nothing". A real
 *     template should show friendly empty states + sample content hints.
 */

import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '../_shared/tokens'

interface Props {
  site: PublicSite
  slug: string
}

export default function ExampleBlankTemplate({ site }: Props) {
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

  return (
    <>
      <style>{EB_CSS}</style>
      <div className="eb-template">

        {/* 1. Announcement — header_fields: 'announcement' */}
        {header.show_announcement && header.announcement_text && (
          <div className="eb-announce">{header.announcement_text}</div>
        )}

        {/* 2. Header / hero — header_fields: cover_image, avatar_image, business_type, social_buttons */}
        <header className="eb-header">
          {header.cover_image_url && (
            <img className="eb-cover" src={header.cover_image_url} alt="" />
          )}
          <div className="eb-header-inner">
            {header.avatar_image_url && (
              <img className="eb-avatar" src={header.avatar_image_url} alt="" />
            )}
            <h1 className="eb-name">{display}</h1>
            {p?.business_type && <p className="eb-type">{p.business_type}</p>}
            {p?.tagline && <p className="eb-tagline">{p.tagline}</p>}
            <SocialButtons header={header} profile={p} />
          </div>
        </header>

        {/* 3. Booking — embed the platform flow.
            (M2c.3 will introduce CSS-var theming hooks; for now wrap
            in .lush-template for backward-compat with the current
            scoped rules. See AUTHORING.md "Required booking behavior".) */}
        <section className="eb-section" aria-label={tabs.book_label ?? 'Book'}>
          <h2>{tabs.book_label ?? 'Book'}</h2>
          <p className="eb-empty">
            Booking flow embed point. Wrap PlatformBookingFlow here when
            @bkrdy/platform is published. See AUTHORING.md.
          </p>
        </section>

        {/* 4. Gallery */}
        <section className="eb-section" aria-label={tabs.gallery_label ?? 'Gallery'}>
          <h2>{tabs.gallery_label ?? 'Gallery'}</h2>
          {gallery.length === 0 ? (
            <p className="eb-empty">No gallery items yet.</p>
          ) : (
            <ul className="eb-grid">
              {gallery.map(g => (
                <li key={g.id}><img src={g.image_url} alt={g.alt_text ?? ''} /></li>
              ))}
            </ul>
          )}
        </section>

        {/* 5. Results (before/after) */}
        <section className="eb-section" aria-label={tabs.results_label ?? 'Results'}>
          <h2>{tabs.results_label ?? 'Results'}</h2>
          {results.length === 0 ? (
            <p className="eb-empty">No results yet.</p>
          ) : (
            <ul className="eb-grid">
              {results.map(r => (
                <li key={r.id}>
                  <img src={r.before_image_url} alt={r.before_alt_text ?? ''} />
                  <img src={r.after_image_url}  alt={r.after_alt_text  ?? ''} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 6. About */}
        <section className="eb-section" aria-label={tabs.about_label ?? 'About'}>
          <h2>{about.heading ?? 'About'}</h2>
          {about.eyebrow && <p className="eb-eyebrow">{about.eyebrow}</p>}
          {about.body    && <p>{about.body}</p>}
        </section>

        {/* 7. Policies */}
        <section className="eb-section" aria-label={tabs.policy_label ?? 'Policies'}>
          <h2>{tabs.policy_label ?? 'Policies'}</h2>
          <PolicyRow label="Deposit"      body={policies.deposit_policy} />
          <PolicyRow label="Cancellation" body={policies.cancellation_policy} />
          <PolicyRow label="Late arrival" body={policies.late_policy} />
          <PolicyRow label="No-show"      body={policies.no_show_policy} />
          <PolicyRow label="Refund"       body={policies.refund_policy} />
          <PolicyRow label="Guest"        body={policies.guest_policy} />
          {Array.isArray(policies.custom_groups) && policies.custom_groups.map((g: any, i: number) => (
            <PolicyRow key={`c${i}`} label={g.heading} body={g.body} />
          ))}
        </section>

        {/* 8. Advice */}
        <section className="eb-section" aria-label={tabs.advice_label ?? 'Advice'}>
          <h2>{settings.advice?.heading ?? 'Advice'}</h2>
          {advice.length === 0 ? (
            <p className="eb-empty">No advice items yet.</p>
          ) : (
            <ul>{advice.map((it: any, i: number) => (
              <li key={i}><strong>{it.title}</strong> — {it.body}</li>
            ))}</ul>
          )}
        </section>

        {/* 9. Timeline */}
        <section className="eb-section" aria-label={tabs.timeline_label ?? 'Timeline'}>
          <h2>{settings.timeline?.heading ?? 'Timeline'}</h2>
          {timeline.length === 0 ? (
            <p className="eb-empty">No timeline steps yet.</p>
          ) : (
            <ol>{timeline.map((it: any, i: number) => (
              <li key={i}><strong>{it.title}</strong> — {it.body}</li>
            ))}</ol>
          )}
        </section>

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false
          && Array.isArray(additionals.faq?.items)
          && additionals.faq.items.length > 0 && (
          <section className="eb-section" aria-label="FAQ">
            <h2>{additionals.faq.heading ?? 'Frequently asked'}</h2>
            {additionals.faq.items.map((f: any, i: number) => (
              <details key={i}>
                <summary>{f.q ?? f.question}</summary>
                <p>{f.a ?? f.answer}</p>
              </details>
            ))}
          </section>
        )}

        {/* 11. Reviews */}
        {additionals.reviews?.enabled !== false
          && Array.isArray(additionals.reviews?.items)
          && additionals.reviews.items.length > 0 && (
          <section className="eb-section" aria-label="Reviews">
            <h2>{additionals.reviews.heading ?? 'What clients say'}</h2>
            {additionals.reviews.items.map((rv: any, i: number) => (
              <figure key={i}>
                <blockquote>{rv.body ?? rv.quote}</blockquote>
                <figcaption>{rv.author ?? rv.name}{rv.location && ` · ${rv.location}`}</figcaption>
              </figure>
            ))}
          </section>
        )}

        {/* 12. Thank-you outro */}
        {additionals.show_thank_you !== false && additionals.thank_you_title && (
          <section className="eb-section" aria-label="Thank you">
            <h2>{additionals.thank_you_title}</h2>
            {additionals.thank_you_body && <p>{additionals.thank_you_body}</p>}
          </section>
        )}

        {/* Footer — footer_fields: show_powered_by, show_hours, show_quick_book,
            show_contact_links, business_name_override, subtext */}
        <Footer site={site} hours={hours} services={services} />
      </div>
    </>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function PolicyRow({ label, body }: { label: string; body?: string | null }) {
  if (!body) return null
  return (
    <div className="eb-policy">
      <h3>{label}</h3>
      <p>{body}</p>
    </div>
  )
}

function SocialButtons({ header, profile }: { header: any; profile: any }) {
  // Demo: render the canonical 11-button cluster. A real template would
  // style these and respect the per-button show_* toggles.
  const btns: { key: string; href: string | null; label: string }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Book' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions' },
  ]
  return (
    <nav className="eb-social" aria-label="Contact">
      {btns.filter(b => header[`show_${b.key}_button`] !== false && b.href).map(b => (
        <a key={b.key} href={safeHref(b.href!)}>{b.label}</a>
      ))}
    </nav>
  )
}

function Footer({ site, hours, services }: { site: PublicSite; hours: any[]; services: any[] }) {
  const settings: any   = site.template?.settings ?? {}
  const footer:   any   = settings.footer ?? {}
  const p           = site.profile
  const name        = footer.business_name_override ?? p?.business_name ?? site.business_name ?? site.slug
  return (
    <footer className="eb-footer">
      <p className="eb-footer-name">{name}</p>
      {footer.subtext && <p className="eb-footer-subtext">{footer.subtext}</p>}

      {footer.show_hours !== false && hours.length > 0 && (
        <ul className="eb-footer-hours">
          {hours.map((h: any) => (
            <li key={h.id}>
              <span>{h.day_name}</span>
              <span>{h.is_open && h.open_time && h.close_time ? `${h.open_time}–${h.close_time}` : 'Closed'}</span>
            </li>
          ))}
        </ul>
      )}

      {footer.show_quick_book !== false && services.length > 0 && (
        <a className="eb-footer-book" href="#book">Quick book</a>
      )}

      {footer.show_contact_links !== false && (p?.public_phone || p?.public_email) && (
        <ul className="eb-footer-contact">
          {p?.public_phone && <li><a href={`tel:${p.public_phone}`}>{p.public_phone}</a></li>}
          {p?.public_email && <li><a href={`mailto:${p.public_email}`}>{p.public_email}</a></li>}
        </ul>
      )}

      {footer.show_powered_by !== false && (
        <p className="eb-footer-credit">Powered by BookReady</p>
      )}
    </footer>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const EB_CSS = `
.eb-template {
  ${tokensToCss()}
  background: #fff;
  color: #1a1a1a;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: var(--brk-font-body);
  line-height: 1.5;
}
.eb-template * { box-sizing: border-box; }
.eb-template img { max-width: 100%; display: block; }

.eb-announce {
  text-align: center;
  padding: var(--brk-space-sm) var(--brk-space-md);
  background: #f5f5f5;
  font-size: var(--brk-font-eyebrow);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.eb-header { padding: var(--brk-space-2xl) var(--brk-space-md); text-align: center; }
.eb-cover  { width: 100%; max-height: 360px; object-fit: cover; margin-bottom: var(--brk-space-lg); }
.eb-header-inner { max-width: var(--brk-container-narrow); margin: 0 auto; }
.eb-avatar { width: 88px; height: 88px; border-radius: var(--brk-radius-pill); margin: 0 auto var(--brk-space-md); object-fit: cover; }
.eb-name { font-size: var(--brk-font-h1); margin: 0 0 var(--brk-space-xs); }
.eb-type, .eb-tagline { margin: 0 0 var(--brk-space-sm); color: #666; }
.eb-social { display: flex; flex-wrap: wrap; gap: var(--brk-space-sm); justify-content: center; margin-top: var(--brk-space-lg); }
.eb-social a { padding: var(--brk-space-sm) var(--brk-space-md); border: 1px solid currentColor; text-decoration: none; color: inherit; font-size: var(--brk-font-body-sm); border-radius: var(--brk-radius-pill); }

.eb-section { max-width: var(--brk-container-standard); margin: 0 auto; padding: var(--brk-space-3xl) var(--brk-space-md); }
.eb-section h2 { font-size: var(--brk-font-h2); margin: 0 0 var(--brk-space-lg); }
.eb-eyebrow { font-size: var(--brk-font-eyebrow); letter-spacing: 0.16em; text-transform: uppercase; color: #666; margin: 0 0 var(--brk-space-sm); }
.eb-empty { color: #999; font-style: italic; }
.eb-grid { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--brk-space-md); grid-template-columns: repeat(2, 1fr); }
@media (min-width: 1025px) { .eb-grid { grid-template-columns: repeat(4, 1fr); } }

.eb-policy { margin-bottom: var(--brk-space-lg); }
.eb-policy h3 { margin: 0 0 var(--brk-space-xs); font-size: var(--brk-font-h3); }

.eb-footer { padding: var(--brk-space-2xl) var(--brk-space-md); text-align: center; border-top: 1px solid #e5e5e5; margin-top: var(--brk-space-3xl); }
.eb-footer-name    { font-weight: 600; margin: 0 0 var(--brk-space-xs); }
.eb-footer-subtext { color: #666; margin: 0 0 var(--brk-space-md); }
.eb-footer-hours, .eb-footer-contact { list-style: none; padding: 0; margin: 0 0 var(--brk-space-md); display: flex; flex-direction: column; gap: var(--brk-space-xs); align-items: center; }
.eb-footer-book    { display: inline-block; padding: var(--brk-space-sm) var(--brk-space-lg); border: 1px solid currentColor; text-decoration: none; color: inherit; margin-bottom: var(--brk-space-md); }
.eb-footer-credit  { font-size: var(--brk-font-body-sm); color: #999; }
`
