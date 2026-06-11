'use client'

import { cn } from '@/lib/cn'
import { ReactNode, useRef } from 'react'

/**
 * Sharp segmented picker (radius 0). A horizontal row of bordered tiles,
 * exactly one active — the editor's replacement for hand-rolled
 * pick-one button rows.
 *
 * Accessibility: `role="radiogroup"` with one `role="radio"` per tile.
 * Roving tabindex — the active tile is the only tab stop; arrow keys
 * (Left/Up, Right/Down) move selection, Home/End jump to the edges.
 *
 *   <SegmentedControl
 *     ariaLabel="Release strategy"
 *     options={[{ value: 'weekly', label: 'Weekly', icon: <CalendarDays className="h-4 w-4" /> }]}
 *     value={strategy}
 *     onChange={setStrategy}
 *   />
 */

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  hint?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}): JSX.Element {
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activeIndex = options.findIndex((opt) => opt.value === value)
  // If `value` matches no option, fall back to the first tile as the tab stop
  // so the group never becomes keyboard-unreachable.
  const tabStopIndex = activeIndex === -1 ? 0 : activeIndex

  const select = (index: number) => {
    const opt = options[index]
    if (!opt) return
    onChange(opt.value)
    tileRefs.current[index]?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        select((index - 1 + options.length) % options.length)
        break
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        select((index + 1) % options.length)
        break
      case 'Home':
        e.preventDefault()
        select(0)
        break
      case 'End':
        e.preventDefault()
        select(options.length - 1)
        break
    }
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              tileRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === tabStopIndex ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'border transition-colors',
              // size — md stacks icon above label; sm runs icon before label
              size === 'md'
                ? 'flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 text-sm'
                : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs',
              active
                ? 'bg-near-black text-white border-near-black'
                : 'bg-white border-hairline text-near-black hover:bg-cream',
            )}
          >
            {opt.icon}
            <span className="font-semibold">{opt.label}</span>
            {opt.hint && (
              <span className={cn('text-2xs', active ? 'text-white/70' : 'text-muted-text')}>
                {opt.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
