'use client'

import { useState } from 'react'

import { LightboxOverlay, type LightboxItem } from './LightboxOverlay'

/**
 * GallerySection — shared, theme-tokenized portfolio gallery.
 *
 * Renders the canonical `.brk-section` + `.brk-gallery-*` markup styled by
 * SECTIONS_CSS against the canonical theme tokens. Items are bucketed by
 * `group_id` into optional captioned groups (sorted by the matching
 * GalleryGroup's sort_order), with any ungrouped items collected into a
 * trailing bucket ("More" when other groups exist, otherwise heading-less).
 *
 * `variant="strips"` swaps the responsive grid for full-width rows. The look
 * is Opaline's neutral base (champagne hairline cards, 4/5 tiles); a template
 * adds signature flourishes via its own scoped `.brk-gallery*` skin. An
 * editor-picked `layout` ('1x6' | '2x3' | '3x2') forces the column count
 * over both the responsive default and any template skin (triple-class
 * override in SECTIONS_CSS); null keeps today's behavior.
 *
 * Every tile is a tap target that opens LightboxOverlay fullscreen — prev/
 * next walks the tile's bucket. Client component (lightbox state).
 *
 * Returns null when there are no items, unless an `emptyText` is given (then
 * the header + a `.brk-empty` hint render, e.g. inside a tab panel).
 */
export interface GalleryItem {
  id: number
  image_url: string
  title?: string | null
  caption?: string | null
  alt_text?: string | null
  category?: string | null
  sort_order?: number
  group_id?: number | null
}

export interface GalleryGroup {
  id: number
  heading: string
  sort_order: number
}

export interface GallerySectionProps {
  items: GalleryItem[] | null | undefined
  groups?: GalleryGroup[] | null
  heading?: string
  eyebrow?: string
  /** Business name — fallback alt text when an item has none. */
  displayName?: string
  /** 'grid' (default, responsive tiles) or 'strips' (full-width rows). */
  variant?: 'grid' | 'strips'
  /** Forced column count from the editor's layout picker — overrides the
   *  responsive default + template skins. null keeps today's behavior. */
  layout?: '1x6' | '2x3' | '3x2' | null
  /** Placeholder shown (with the header) when there are no items. */
  emptyText?: string
  ariaLabel?: string
}

interface GalleryBucket {
  key: string
  heading: string | null
  items: GalleryItem[]
}

export function GallerySection({
  items,
  groups,
  heading = 'Portfolio',
  eyebrow = 'Gallery',
  displayName,
  variant = 'grid',
  layout,
  emptyText,
  ariaLabel,
}: GallerySectionProps) {
  // Lightbox state — the open bucket's images plus which one is showing.
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null)

  const all = (items ?? []).filter(it => (it.image_url ?? '').trim())
  if (all.length === 0 && !emptyText) return null

  const sortItems = (a: GalleryItem, b: GalleryItem) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id

  const sortedGroups = [...(groups ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id,
  )

  const buckets: GalleryBucket[] = []
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

  const layoutClass = layout ? ` brk-gallery-grid--${layout}` : ''
  const gridClass = `brk-gallery-grid${variant === 'strips' ? ' brk-gallery-grid--strips' : ''}${layoutClass}`

  return (
    <section className="brk-section brk-gallery-section" aria-label={ariaLabel ?? heading}>
      <header className="brk-section-head">
        {eyebrow && <p className="brk-eyebrow">{eyebrow}</p>}
        {heading && <h2 className="brk-section-title">{heading}</h2>}
      </header>
      {buckets.length === 0 ? (
        <p className="brk-empty">{emptyText}</p>
      ) : (
        buckets.map(bucket => {
          // The lightbox set is the whole bucket, so prev/next walks the
          // tapped tile's group.
          const lightboxItems: LightboxItem[] = bucket.items.map(it => ({
            url: it.image_url,
            alt: it.alt_text ?? it.title ?? displayName ?? null,
          }))
          return (
            <div key={bucket.key} className="brk-gallery-group">
              {bucket.heading && <h3 className="brk-gallery-group-heading">{bucket.heading}</h3>}
              <div className={gridClass}>
                {bucket.items.map((it, idx) => {
                  const alt = it.alt_text ?? it.title ?? displayName ?? ''
                  return (
                    <figure key={it.id} className="brk-gallery-item">
                      <button
                        type="button"
                        className="brk-gallery-zoom"
                        aria-label={alt ? `View ${alt} fullscreen` : 'View image fullscreen'}
                        onClick={() => setLightbox({ items: lightboxItems, index: idx })}
                      >
                        <img src={it.image_url} alt={alt} loading="lazy" />
                      </button>
                    </figure>
                  )
                })}
              </div>
            </div>
          )
        })
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

export default GallerySection
