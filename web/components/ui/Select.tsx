import { cn } from '@/lib/cn'
import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Sharp native select styled to match Input. Replaces hand-rolled
 * `<select>`s scattered across the editor.
 */

interface SelectOption { value: string; label: string }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  hint?:     string
  options?:  SelectOption[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-eyebrow font-bold text-near-black uppercase tracking-eyebrow">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none bg-white border px-4 py-2.5 pr-9 text-sm text-near-black',
              'focus:outline-none focus:ring-2 focus:ring-near-black/10 focus:border-near-black/30',
              'transition-colors duration-150',
              error ? 'border-danger' : 'border-hairline-strong',
              className,
            )}
            {...props}
          >
            {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-text"
            aria-hidden
          />
        </div>
        {hint && !error && <p className="text-xs text-muted-text">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
export default Select
