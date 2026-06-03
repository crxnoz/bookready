/**
 * SiteFooter — shared, theme-tokenized 3-band footer.
 *
 *   1. CTA band   — "Reserve" button (calls onBook), gated by show.quickBook
 *                   + at least one bookable service.
 *   2. Content band — Brand / Hours / Contact columns (auto-fit dividers).
 *   3. Credit band — optional "© {year} {name}" + "Powered by BookReady".
 *
 * Every template ships this same structure (verified across all 5); the look
 * comes from the canonical tokens + the template's own scoped `.brk-footer*`
 * skin. The book CTA is a callback (templates drive tab state / scroll), not
 * an anchor.
 */
export interface FooterHoursRow {
  day_name?: string
  is_open?: boolean
  open_time?: string | null
  close_time?: string | null
  day_of_week?: number
  id?: number
}

export interface SiteFooterProps {
  businessName: string
  subtext?: string | null
  hours?: FooterHoursRow[]
  phone?: string | null
  email?: string | null
  /** Bookable-service count — the CTA only shows when > 0. */
  servicesCount?: number
  onBook: () => void
  /** Each flag hides its band/column only when explicitly false. */
  show?: {
    quickBook?: boolean
    hours?: boolean
    contact?: boolean
    poweredBy?: boolean
  }
  ctaLabel?: string
  brandLabel?: string
  hoursLabel?: string
  contactLabel?: string
  /** When set, the credit band shows "© {year} {name}" before the badge. */
  copyrightName?: string | null
  /** Current year — pass from the caller (templates are client components). */
  year?: number
}

function fmt12(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const hr = h % 12 || 12
  return `${hr}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function SiteFooter({
  businessName,
  subtext,
  hours,
  phone,
  email,
  servicesCount = 0,
  onBook,
  show,
  ctaLabel = 'Reserve your appointment',
  brandLabel = 'The Studio',
  hoursLabel = 'Hours',
  contactLabel = 'Contact',
  copyrightName,
  year,
}: SiteFooterProps) {
  const s = show ?? {}
  // Monday-first, Sunday-last (matches the per-template ordering).
  const sorted = (hours ?? []).filter(h => h.day_of_week !== 0)
    .concat((hours ?? []).filter(h => h.day_of_week === 0))
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null

  return (
    <footer className="brk-footer">
      {s.quickBook !== false && servicesCount > 0 && (
        <div className="brk-footer-cta-band">
          <button type="button" className="brk-footer-book" onClick={onBook}>
            {ctaLabel}
          </button>
        </div>
      )}

      <div className="brk-footer-inner">
        <div className="brk-footer-col brk-footer-brand">
          <p className="brk-eyebrow">{brandLabel}</p>
          <p className="brk-footer-name">{businessName}</p>
          {(subtext ?? '').trim() && <p className="brk-footer-subtext">{subtext}</p>}
        </div>

        {s.hours !== false && sorted.length > 0 && (
          <div className="brk-footer-col brk-footer-col--hours">
            <p className="brk-eyebrow">{hoursLabel}</p>
            <dl className="brk-footer-hours">
              {sorted.map(h => (
                <div key={h.day_of_week ?? h.id} className="brk-footer-hours-row">
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

        {s.contact !== false && (phone || email) && (
          <div className="brk-footer-col">
            <p className="brk-eyebrow">{contactLabel}</p>
            <ul className="brk-footer-contact">
              {telHref && <li><a href={telHref}>{phone}</a></li>}
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
            </ul>
          </div>
        )}
      </div>

      {s.poweredBy !== false && (
        <div className="brk-footer-credit-band">
          <p>
            {copyrightName ? `© ${year ?? ''} ${copyrightName} · ` : ''}
            Powered by BookReady
          </p>
        </div>
      )}
    </footer>
  )
}

export default SiteFooter
