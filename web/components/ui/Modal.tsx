'use client'

import { cn } from '@/lib/cn'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

/**
 * The ONE modal. Focused create/edit of a SHORT object, or a confirm/
 * decision. Centered on desktop, bottom-sheet on mobile (SHARP top — no
 * rounded lip). Esc + backdrop close, body-scroll lock, one elevation.
 * For browsing a rich record use <Drawer>, not this.
 */

interface ModalProps {
  open:       boolean
  onClose:    () => void
  title?:     string
  children:   ReactNode
  footer?:    ReactNode
  size?:      'sm' | 'md'
  closeOnBackdrop?: boolean
}

export default function Modal({ open, onClose, title, children, footer, size = 'md', closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-near-black/40 p-0 sm:p-4"
      onClick={() => closeOnBackdrop && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-full bg-white border border-hairline shadow-xl max-h-[92vh] flex flex-col',
          size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-md',
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5 shrink-0">
            <h2 className="text-sm font-semibold text-near-black">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted-text hover:text-near-black">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-3.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
