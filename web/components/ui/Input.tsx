import { cn } from '@/lib/cn'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-near-black tracking-wide uppercase"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white border px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f]',
            'focus:outline-none focus:ring-2 focus:ring-near-black/10 focus:border-near-black/30',
            'transition-colors duration-150',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-[rgba(18,18,18,0.15)]',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-muted-text">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
