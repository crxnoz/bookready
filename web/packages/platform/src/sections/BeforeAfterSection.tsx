/**
 * BeforeAfterSection — shared, theme-tokenized results diptych.
 *
 * Renders the canonical `.brk-section` + `.brk-ba-*` markup styled by
 * SECTIONS_CSS against the canonical theme tokens. Items are bucketed by
 * `group_id` exactly like GallerySection (groups sorted by sort_order, an
 * "More" trailing bucket for ungrouped items when other groups exist).
 *
 * Each result is a before/after pair with an optional center separator glyph
 * (only when `separator` is given) and optional corner "Before"/"After"
 * labels (gated by `labels`). The look is Opaline's neutral base (3/4 panes,
 * hairline borders, italic caption); templates skin via `.brk-ba*`.
 *
 * Returns null when there are no items, unless an `emptyText` is given.
 */
export interface BeforeAfterItem {
  id: number
  before_image_url: string
  after_image_url: string
  title?: string | null
  caption?: string | null
  before_alt_text?: string | null
  after_alt_text?: string | null
  category?: string | null
  sort_order?: number
  group_id?: number | null
}

export interface Group {
  id: number
  heading: string
  sort_order: number
}

export interface BeforeAfterSectionProps {
  items: BeforeAfterItem[] | null | undefined
  groups?: Group[] | null
  heading?: string
  eyebrow?: string
  /** Center glyph between panes (e.g. ◆ / →). Omitted when not provided. */
  separator?: string
  /** Show the corner "Before"/"After" caption tags. */
  labels?: boolean
  /** Placeholder shown (with the header) when there are no items. */
  emptyText?: string
  ariaLabel?: string
}

interface BaBucket {
  key: string
  heading: string | null
  items: BeforeAfterItem[]
}

export function BeforeAfterSection({
  items,
  groups,
  heading = 'Before & After',
  eyebrow = 'Results',
  separator,
  labels = false,
  emptyText,
  ariaLabel,
}: BeforeAfterSectionProps) {
  const all = (items ?? []).filter(
    it => (it.before_image_url ?? '').trim() && (it.after_image_url ?? '').trim(),
  )
  if (all.length === 0 && !emptyText) return null

  const sortItems = (a: BeforeAfterItem, b: BeforeAfterItem) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id

  const sortedGroups = [...(groups ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id,
  )

  const buckets: BaBucket[] = []
  for (const g of sortedGroups) {
    const groupItems = all.filter(it => it.group_id === g.id).sort(sortItems)
    if (groupItems.length > 0) {
      buckets.push({ key: `g${g.id}`, heading: g.heading, items: groupItems })
    }
  }
  const groupIds = new Set(sortedGroups.map(g => g.id))
  const ungrouped = all
    .filter(it => it.group_id == null || !groupIds.has(it.group_id))
    .sort(sortItems)
  if (ungrouped.length > 0) {
    buckets.push({
      key: 'more',
      heading: buckets.length > 0 ? 'More' : null,
      items: ungrouped,
    })
  }

  return (
    <section className="brk-section brk-ba-section" aria-label={ariaLabel ?? heading}>
      <header className="brk-section-head">
        {eyebrow && <p className="brk-eyebrow">{eyebrow}</p>}
        {heading && <h2 className="brk-section-title">{heading}</h2>}
      </header>
      {buckets.length === 0 ? (
        <p className="brk-empty">{emptyText}</p>
      ) : (
        buckets.map(bucket => (
          <div key={bucket.key} className="brk-ba-group">
            {bucket.heading && <h3 className="brk-ba-group-heading">{bucket.heading}</h3>}
            <div className="brk-ba-stack">
              {bucket.items.map(it => (
                <article key={it.id} className="brk-ba">
                  <div className="brk-ba-pair">
                    <figure className="brk-ba-pane brk-ba-before">
                      {labels && <figcaption className="brk-ba-label">Before</figcaption>}
                      <img
                        src={it.before_image_url}
                        alt={it.before_alt_text ?? it.title ?? 'Before'}
                        loading="lazy"
                      />
                    </figure>
                    {separator && <span className="brk-ba-sep" aria-hidden="true">{separator}</span>}
                    <figure className="brk-ba-pane brk-ba-after">
                      {labels && <figcaption className="brk-ba-label">After</figcaption>}
                      <img
                        src={it.after_image_url}
                        alt={it.after_alt_text ?? it.title ?? 'After'}
                        loading="lazy"
                      />
                    </figure>
                  </div>
                  {(it.caption ?? '').trim() && <p className="brk-ba-caption">{it.caption}</p>}
                </article>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

export default BeforeAfterSection
