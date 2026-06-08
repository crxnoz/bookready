import { cn } from '@/lib/cn'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The ONE empty state. Sharp card, optional lucide icon, headline, one-line
 * guidance, optional single CTA. Used by every list/table so no screen
 * invents its own "No X yet" markup or the literal "None" loader.
 *
 * Keep copy filter-aware at the call site:
 *   title="No customers yet" vs "No customers match those filters"
 */

interface EmptyStateProps {
  icon?:        LucideIcon
  title:        string
  description?: string
  action?:      ReactNode
  className?:   string
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('bg-white border border-hairline p-8 text-center', className)}>
      {Icon && <Icon className="mx-auto mb-2 text-muted-text" size={28} strokeWidth={1.8} aria-hidden />}
      <h3 className="text-sm font-semibold text-near-black">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-text max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
