'use client'

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'

import { LightboxOverlay, type LightboxItem } from './LightboxOverlay'

/**
 * BeforeAfterSection — shared, theme-tokenized results diptych.
 *
 * Renders the canonical `.brk-section` + `.brk-ba-*` markup styled by
 * SECTIONS_CSS against the canonical theme tokens. Items are bucketed by
 * `group_id` exactly like GallerySection (groups sorted by sort_order, an
 * "More" trailing bucket for ungrouped items when other groups exist).
 *
 * Each result is a before/after pair with an optional center separator glyph
 * (only when `separator` is given) and corner "Before"/"After" labels (on by
 * default, hide via `labels={false}`). The "after" image starts BLURRED — a
 * tap (or keyboard activation) reveals it; tap again to hide. Templates skin
 * via `.brk-ba*` and may tune blur intensity via `.brk-ba-reveal img filter`.
 *
 * Tapping the before pane opens LightboxOverlay; a revealed after pane gains
 * a corner expand chip that does the same. A pair's lightbox set is
 * [before, after] so prev/next flips between the two shots. An editor-picked
 * `layout` ('2x1' side by side at every breakpoint | '1x2' stacked) forces
 * the pair columns over both the responsive default and any template skin
 * (triple-class override in SECTIONS_CSS); null keeps today's behavior.
 *
 * Returns null when there are no items, unless an `emptyText` is given.
 * Client component (the reveal + lightbox state is per-item).
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
  /** Forced pair columns from the editor's layout picker: '2x1' keeps the
   *  panes side by side at every breakpoint (separator visible), '1x2'
   *  stacks them (separator hidden). null keeps today's behavior. */
  layout?: '2x1' | '1x2' | null
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
  labels = true,
  layout,
  emptyText,
  ariaLabel,
}: BeforeAfterSectionProps) {
  // Tracks which "after" images the visitor has revealed. Toggle on
  // click/keyboard; default state is blurred for every item.
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  // Lightbox state — a pair opens as [before, after] so prev/next flips
  // between the two shots.
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null)
  const openLightbox = (it: BeforeAfterItem, index: number) =>
    setLightbox({
      items: [
        { url: it.before_image_url, alt: it.before_alt_text ?? it.title ?? 'Before' },
        { url: it.after_image_url, alt: it.after_alt_text ?? it.title ?? 'After' },
      ],
      index,
    })
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
                  <div className={`brk-ba-pair${layout ? ` brk-ba-pair--${layout}` : ''}`}>
                    <figure className="brk-ba-pane brk-ba-before">
                      {labels && <figcaption className="brk-ba-label">Before</figcaption>}
                      <button
                        type="button"
                        className="brk-gallery-zoom"
                        aria-label="View before image fullscreen"
                        onClick={() => openLightbox(it, 0)}
                      >
                        <img
                          src={it.before_image_url}
                          alt={it.before_alt_text ?? it.title ?? 'Before'}
                          loading="lazy"
                        />
                      </button>
                    </figure>
                    {/* With layout '2x1' the sep span must exist even when no
                        glyph was given — it occupies the center `auto` track
                        so the after pane lands in the third column. An empty
                        span collapses to zero width. */}
                    {(separator || layout === '2x1') && (
                      <span className="brk-ba-sep" aria-hidden="true">{separator}</span>
                    )}
                    <figure className="brk-ba-pane brk-ba-after">
                      {labels && <figcaption className="brk-ba-label">After</figcaption>}
                      <button
                        type="button"
                        className={`brk-ba-reveal${revealed.has(it.id) ? ' is-revealed' : ''}`}
                        onClick={() => toggle(it.id)}
                        aria-pressed={revealed.has(it.id)}
                        aria-label={revealed.has(it.id) ? 'Hide after image' : 'Reveal after image'}
                      >
                        <img
                          src={it.after_image_url}
                          alt={it.after_alt_text ?? it.title ?? 'After'}
                          loading="lazy"
                        />
                        <span className="brk-ba-reveal-hint" aria-hidden="true">Tap to reveal</span>
                      </button>
                      {revealed.has(it.id) && (
                        <button
                          type="button"
                          className="brk-ba-expand"
                          aria-label="View after image fullscreen"
                          onClick={() => openLightbox(it, 1)}
                        >
                          <Maximize2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </figure>
                  </div>
                  {(it.caption ?? '').trim() && <p className="brk-ba-caption">{it.caption}</p>}
                </article>
              ))}
            </div>
          </div>
        ))
      )}
      {lightbox && (
        <LightboxOverlay
          items={lightbox.items}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  )
}

export default BeforeAfterSection
