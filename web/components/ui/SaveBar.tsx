'use client'

import { cn } from '@/lib/cn'
import { Check, Loader2 } from 'lucide-react'
import Button from './Button'

/**
 * The ONE save bar. Sticky footer for explicit-save screens. Status triad
 * (error / saved / unsaved) + Save + Discard. Replaces the 4 duplicated
 * copies. Pair with useFormState:  <SaveBar {...f} onSave={f.save} onDiscard={f.discard} />
 */

interface SaveBarProps {
  dirty:      boolean
  saving:     boolean
  saved:      boolean
  error:      string | null
  onSave:     () => void
  onDiscard?: () => void
  className?: string
}

export default function SaveBar({ dirty, saving, saved, error, onSave, onDiscard, className }: SaveBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-hairline bg-white/95 px-4 py-3 backdrop-blur-0',
        className,
      )}
    >
      <p className="text-xs min-w-0 truncate">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : saved && !saving ? (
          <span className="inline-flex items-center gap-1 text-success"><Check size={13} /> Saved</span>
        ) : dirty ? (
          <span className="text-muted-text">Unsaved changes</span>
        ) : (
          <span className="text-muted-text">All changes saved</span>
        )}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {onDiscard && dirty && !saving && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
        )}
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving</span> : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
