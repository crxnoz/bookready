'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * LightboxOverlay — fullscreen image viewer for the shared sections.
 *
 * Opened by GallerySection (tap a tile) and BeforeAfterSection (tap the
 * before pane, or the expand chip on a revealed after pane). Renders a fixed
 * dark overlay with the current image centered and object-contained. Esc or
 * a backdrop click closes (clicking the image does not); with more than one
 * item, chevron buttons + ArrowLeft/ArrowRight cycle through the set. Body
 * scroll is locked while open (same stash-and-restore pattern as the editor
 * Modal), focus moves to the close button on mount and returns to the opener
 * on unmount. An optional caption strip renders below the image when the
 * current item has alt text. Styled by SECTIONS_CSS via .brk-lightbox-*
 * (not Tailwind — this renders inside public templates).
 */
export interface LightboxItem {
  url: string
  alt?: string | null
}

export interface LightboxOverlayProps {
  items: LightboxItem[]
  startIndex: number
  onClose: () => void
}

export function LightboxOverlay({ items, startIndex, onClose }: LightboxOverlayProps) {
  const count = items.length
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0)),
  )
  const closeRef = useRef<HTMLButtonElement>(null)

  // Scroll lock + focus management. Mirrors web/components/ui/Modal.tsx:
  // stash the previous overflow values, force hidden, restore on cleanup —
  // plus return focus to whatever opened the lightbox.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
      opener?.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (count < 2) return
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + count) % count)
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % count)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [count, onClose])

  if (count === 0) return null
  const current = items[Math.min(index, count - 1)]
  const caption = (current.alt ?? '').trim()

  return (
    <div className="brk-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button
        ref={closeRef}
        type="button"
        className="brk-lightbox-close"
        aria-label="Close image viewer"
        onClick={e => { e.stopPropagation(); onClose() }}
      >
        <X size={22} aria-hidden="true" />
      </button>
      {count > 1 && (
        <button
          type="button"
          className="brk-lightbox-nav brk-lightbox-prev"
          aria-label="Previous image"
          onClick={e => { e.stopPropagation(); setIndex(i => (i - 1 + count) % count) }}
        >
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
      )}
      <figure className="brk-lightbox-stage" onClick={e => e.stopPropagation()}>
        <img className="brk-lightbox-img" src={current.url} alt={current.alt ?? ''} />
        {caption && <figcaption className="brk-lightbox-caption">{caption}</figcaption>}
      </figure>
      {count > 1 && (
        <button
          type="button"
          className="brk-lightbox-nav brk-lightbox-next"
          aria-label="Next image"
          onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % count) }}
        >
          <ChevronRight size={26} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default LightboxOverlay
