'use client'

import { cn } from '@/lib/cn'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

/**
 * The ONE drawer. Record detail + contextual editing, opened from a row.
 * Right slide-in, sharp, one elevation, Esc + backdrop close, scroll-lock.
 * No back-link (it's an overlay, the page behind is the context).
 */

interface DrawerProps {
  open:      boolean
  onClose:   () => void
  title?:    string
  subtitle?: string
  children:  ReactNode
  footer?:   ReactNode
}

export default function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  return (
    <div
      className={cn('fixed inset-0 z-50', open ? '' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-near-black/40 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 bottom-0 w-full sm:max-w-lg bg-white border-l border-hairline shadow-xl',
          'flex flex-col transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4 shrink-0">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-near-black truncate">{title}</h2>}
              {subtitle && <p className="text-xs text-muted-text truncate">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted-text hover:text-near-black shrink-0">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-3.5 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}
