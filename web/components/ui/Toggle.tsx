import { cn } from '@/lib/cn'

/**
 * Sharp switch (radius 0). A square knob slides in a square track.
 * `role="switch"`. The one toggle primitive — replaces the bespoke
 * toggles across the editor.
 */

interface ToggleProps {
  checked:    boolean
  onChange:   (next: boolean) => void
  disabled?:  boolean
  label?:     string
  'aria-label'?: string
  className?: string
}

export default function Toggle({ checked, onChange, disabled, label, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label'] ?? label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-10 shrink-0 items-center border transition-colors',
        checked ? 'bg-near-black border-near-black' : 'bg-white border-hairline-strong',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'block h-3.5 w-3.5 transition-transform',
          checked ? 'translate-x-[22px] bg-white' : 'translate-x-[2px] bg-near-black',
        )}
      />
    </button>
  )
}
