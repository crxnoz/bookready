import { cn } from '@/lib/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          // size
          size === 'sm' && 'text-xs px-4 py-2',
          size === 'md' && 'text-sm px-5 py-2.5',
          size === 'lg' && 'text-sm px-7 py-3.5 tracking-[0.08em]',
          // variant
          variant === 'primary' &&
            'bg-near-black text-white hover:bg-[#2a2a2a] active:bg-[#111]',
          variant === 'secondary' &&
            'bg-cream text-near-black border border-[rgba(18,18,18,0.15)] hover:bg-[#f0ede8]',
          variant === 'ghost' &&
            'bg-transparent text-near-black hover:bg-[rgba(18,18,18,0.05)]',
          variant === 'destructive' &&
            'bg-red-600 text-white hover:bg-red-700',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
export default Button
