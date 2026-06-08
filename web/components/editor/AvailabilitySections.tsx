import { cn } from '@/lib/cn'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

/** Icon inside a bordered cream box — the availability section signature. */
export function IconBox({ icon: Icon, size = 'md' }: { icon: React.ElementType; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
      )}
    >
      <Icon size={size === 'sm' ? 13 : 15} className="text-muted-text" />
    </div>
  )
}

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

/** Inline icon-box heading for content that lives in a non-collapsible Section. */
export function SectionHeader({
  icon, title, subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <IconBox icon={icon} size="md" />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-near-black tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

/**
 * Non-collapsible section — same chrome as CollapsibleSection (full-width,
 * icon-box heading, hairline divider) but always open. For the calendar
 * grid and other surfaces that shouldn't fold.
 */
export function Section({
  icon, title, subtitle, action, children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-hairline-soft">
      <div className="flex items-center gap-3 px-5 py-4">
        <IconBox icon={icon} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-near-black">{title}</p>
          {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  )
}

/** Collapsible section — the availability signature (icon box + chevron). */
export function CollapsibleSection({
  icon, title, subtitle, open, onToggle, children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-hairline-soft">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(18,18,18,0.02)] transition-colors"
      >
        <IconBox icon={icon} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-near-black">{title}</p>
          {subtitle && !open && (
            <p className="text-xs text-muted-text mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {open
          ? <ChevronUp size={15} className="text-muted-text flex-shrink-0" />
          : <ChevronDown size={15} className="text-muted-text flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  )
}
