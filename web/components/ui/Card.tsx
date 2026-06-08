import { cn } from '@/lib/cn'
import { HTMLAttributes, forwardRef } from 'react'

/**
 * The base surface primitive. White on cream, one hairline border, SHARP
 * (radius 0), token-driven. Padding follows the Visual System §5.3 scale.
 * Roles (Stat/Management/Record/Info/Alert) compose on top of this.
 */

type CardPadding = 'none' | 'compact' | 'dense' | 'default'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

const PAD: Record<CardPadding, string> = {
  none:    '',
  compact: 'p-3',  // chips / tight cells
  dense:   'p-4',  // list rows
  default: 'p-5',  // standard card
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-white border border-hairline', PAD[padding], className)}
      {...props}
    >
      {children}
    </div>
  ),
)

Card.displayName = 'Card'
export default Card
