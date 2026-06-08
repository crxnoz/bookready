import { cn } from '@/lib/cn'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-eyebrow font-bold text-near-black uppercase tracking-eyebrow"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white border px-4 py-2.5 text-sm text-near-black placeholder:text-faint-text resize-none',
            'focus:outline-none focus:ring-2 focus:ring-near-black/10 focus:border-near-black/30',
            'transition-colors duration-150',
            error
              ? 'border-danger'
              : 'border-hairline-strong',
            className,
          )}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
export default Textarea
