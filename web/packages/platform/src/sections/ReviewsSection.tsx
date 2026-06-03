/**
 * ReviewsSection — shared, theme-tokenized testimonials grid.
 *
 * Same card structure + data contract across every template; the rating
 * mark is a `starGlyph` prop (templates use ★ / ✦ / ♦ etc.) and the quote
 * ornament + card chrome come from the consuming template's tokens (+ its
 * own scoped `.brk-review*` skin for signature flourishes).
 */
export interface ReviewItem {
  body?: string | null
  author?: string | null
  location?: string | null
  rating?: number | null
  /** Legacy aliases. */
  quote?: string | null
  name?: string | null
}

export interface ReviewsSectionProps {
  items: ReviewItem[] | null | undefined
  heading?: string
  eyebrow?: string
  /** Glyph repeated for the rating row. Default ★. */
  starGlyph?: string
  ariaLabel?: string
}

export function ReviewsSection({
  items,
  heading = 'What clients say',
  eyebrow = 'Reviews',
  starGlyph = '★',
  ariaLabel = 'Reviews',
}: ReviewsSectionProps) {
  const valid = (items ?? []).filter(
    r => (r.body ?? r.quote ?? '').trim() && (r.author ?? r.name ?? '').trim(),
  )
  if (valid.length === 0) return null

  return (
    <section className="brk-section brk-reviews-section" aria-label={ariaLabel}>
      <header className="brk-section-head">
        <p className="brk-eyebrow">{eyebrow}</p>
        <h2 className="brk-section-title">{heading}</h2>
      </header>
      <ul className="brk-reviews">
        {valid.map((r, i) => {
          const rating = typeof r.rating === 'number'
            ? Math.max(0, Math.min(5, Math.round(r.rating)))
            : 0
          return (
            <li key={i} className="brk-review">
              <span className="brk-review-quote" aria-hidden="true">&#8220;</span>
              {rating > 0 && (
                <div className="brk-review-stars" aria-label={`${rating} of 5`}>
                  {starGlyph.repeat(rating)}
                </div>
              )}
              <blockquote>{r.body ?? r.quote}</blockquote>
              <p className="brk-review-attr">
                {r.author ?? r.name}
                {r.location && <span> &middot; {r.location}</span>}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ReviewsSection
