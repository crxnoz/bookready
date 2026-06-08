import { cn } from '@/lib/cn'
import { ChevronDown, ChevronUp } from 'lucide-react'
import IconBox from '@/components/ui/IconBox'

/**
 * Shared section primitives for the Availability hub. Extracted from the
 * Advanced tab so every tab (Smart Calendar, Date Drops, Capacity, After
 * Hours, Squeeze-Ins, Waitlist, Requests, Advanced) renders with the same
 * full-width, icon-in-box, collapsible-section language.
 *
 *   <TabShell>
 *     <TabIntro>One line describing the tab.</TabIntro>
 *     <CollapsibleSection icon={Clock} title="…" subtitle="…" open onToggle>
 *       …content…
 *     </CollapsibleSection>
 *   </TabShell>
 *
 * Use <Section> (non-collapsible) for surfaces that shouldn't fold — e.g.
 * the calendar grid — and <SectionHeader> for an inline icon-box heading.
 */

// IconBox lives in ui/ now (shared with NavCard). Re-exported so existing
// callers importing it from here keep working.
export { default as IconBox } from '@/components/ui/IconBox'

/** Full-width tab container. Matches the Advanced tab's outer wrapper. */
export function TabShell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn('pb-8', className)}>{children}</div>
}

/** One-line intro under the page header (full-width, bottom hairline). */
export function TabIntro({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-hairline-soft">
      <p className="text-xs text-muted-text">{children}</p>
    </div>
  )
}

/**
 * Inline icon-box heading — the editor's section-anchor signature. Use at the
 * top of a list/working area (Staff, Services, Bookings overview, …) to anchor
 * the content with an icon box + title + optional live subtitle, plus an
 * optional right-aligned action (e.g. a primary "Add" button).
 */
export function SectionHeader({
  icon, title, subtitle, action,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <IconBox icon={icon} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-near-black tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/**
 * Non-collapsible section — same chrome as CollapsibleSection (full-width,
 * icon-box heading, hairline divider) but always open. For the calendar
 * grid and other surfaces that shouldn't fold.
 */
export function Section({
  icon, title, subtitle, action, children, tone = 'light',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <div className={cn('border-b', dark ? 'bg-near-black border-near-black' : 'border-hairline-soft')}>
      <div className="flex items-center gap-3 px-5 py-4">
        <IconBox icon={icon} size="sm" tone={tone} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-bold', dark ? 'text-white' : 'text-near-black')}>{title}</p>
          {subtitle && <p className={cn('text-xs mt-0.5', dark ? 'text-white/60' : 'text-muted-text')}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  )
}

/** Collapsible section — the availability signature (icon box + chevron). */
export function CollapsibleSection({
  icon, title, subtitle, open, onToggle, children, tone = 'light',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <div className={cn('border-b', dark ? 'bg-near-black border-near-black' : 'border-hairline-soft')}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-4 text-left transition-colors',
          dark ? 'hover:bg-white/5' : 'hover:bg-[rgba(18,18,18,0.02)]',
        )}
      >
        <IconBox icon={icon} size="sm" tone={tone} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-bold', dark ? 'text-white' : 'text-near-black')}>{title}</p>
          {subtitle && !open && (
            <p className={cn('text-xs mt-0.5 truncate', dark ? 'text-white/60' : 'text-muted-text')}>{subtitle}</p>
          )}
        </div>
        {open
          ? <ChevronUp size={15} className={cn('flex-shrink-0', dark ? 'text-white/60' : 'text-muted-text')} />
          : <ChevronDown size={15} className={cn('flex-shrink-0', dark ? 'text-white/60' : 'text-muted-text')} />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  )
}
