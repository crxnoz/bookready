import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import IconBox from './IconBox'

/**
 * The BookReady navigation / feature card — the canonical "group of related
 * actions" card from the Website section: icon-in-box + title + description +
 * an action (a chevron by default). Sharp (radius 0), token-driven.
 *
 *   tone="dark" → near-black surface, for contrast / premium emphasis
 *                 (e.g. After Hours, a featured action).
 *
 * Renders as a Link (href), a <button> (onClick), or a static <div>.
 */
interface NavCardProps {
  icon:         React.ElementType
  title:        string
  description?: string
  href?:        string
  onClick?:     () => void
  /** Right-aligned status chip beside the title (e.g. a <StatusBadge>). */
  status?:      React.ReactNode
  /** Override the trailing action (defaults to a chevron when interactive). */
  action?:      React.ReactNode
  tone?:        'light' | 'dark'
  className?:   string
}

export default function NavCard({
  icon, title, description, href, onClick, status, action, tone = 'light', className,
}: NavCardProps) {
  const interactive = !! href || !! onClick
  const dark = tone === 'dark'

  const body = (
    <>
      <IconBox icon={icon} size="md" tone={tone} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-sm font-bold tracking-tight', dark ? 'text-white' : 'text-near-black')}>{title}</p>
          {status}
        </div>
        {description && (
          <p className={cn('text-xs mt-0.5', dark ? 'text-white/60' : 'text-muted-text')}>{description}</p>
        )}
      </div>
      {action !== undefined
        ? action
        : interactive && (
            <ChevronRight size={16} className={cn('mt-0.5 flex-shrink-0', dark ? 'text-white/50' : 'text-muted-text')} />
          )}
    </>
  )

  const base = cn(
    'flex items-start gap-3 border p-4 text-left w-full transition-colors',
    dark
      ? 'bg-near-black border-near-black hover:bg-near-black/90'
      : 'bg-white border-hairline-soft hover:border-near-black/30',
    className,
  )

  if (href)    return <Link href={href} className={base}>{body}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={base}>{body}</button>
  return <div className={base}>{body}</div>
}
