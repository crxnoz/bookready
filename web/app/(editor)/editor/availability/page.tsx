'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, Repeat } from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import AvailabilityEditor from '@/components/editor/AvailabilityEditor'
import CalendarOverridesEditor from '@/components/editor/CalendarOverridesEditor'
import { cn } from '@/lib/cn'

/**
 * /editor/availability — two-tab availability surface.
 *
 *   ?tab=weekly  (default)  legacy weekly schedule + booking rules
 *   ?tab=calendar           Availability 2.0 Phase 1 Smart Calendar
 *
 * The Smart Calendar layers per-date overrides on top of the weekly
 * schedule via App\Services\AvailabilityOverrideResolver. Weekly remains
 * the fallback for any date the owner hasn't overridden — by design,
 * per the Availability 2.0 spec.
 */
export default function AvailabilityPage() {
  return (
    <EditorShell
      title="Availability"
      subtitle="Weekly hours, per-date overrides, and how clients book with you."
    >
      <Suspense fallback={null}>
        <TabSwitcher />
      </Suspense>
    </EditorShell>
  )
}

function TabSwitcher() {
  const params = useSearchParams()
  const tab = params?.get('tab') === 'calendar' ? 'calendar' : 'weekly'
  return (
    <>
      <nav className="flex items-center gap-1 mb-5 border-b border-[rgba(18,18,18,0.10)]">
        <TabLink href="/editor/availability?tab=weekly"   active={tab === 'weekly'}   icon={Repeat}        label="Weekly schedule" />
        <TabLink href="/editor/availability?tab=calendar" active={tab === 'calendar'} icon={CalendarDays}  label="Smart Calendar" badge="New" />
      </nav>
      {tab === 'calendar' ? <CalendarOverridesEditor /> : <AvailabilityEditor />}
    </>
  )
}

function TabLink({
  href, active, icon: Icon, label, badge,
}: {
  href:   string
  active: boolean
  icon:   React.ElementType
  label:  string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap',
        active
          ? 'text-near-black border-near-black'
          : 'text-muted-text border-transparent hover:text-near-black',
      )}
    >
      <Icon size={12} />
      {label}
      {badge && (
        <span className="text-[8px] font-bold tracking-[0.06em] uppercase bg-blush border border-[rgba(18,18,18,0.10)] text-near-black px-1 py-0.5 ml-1">
          {badge}
        </span>
      )}
    </Link>
  )
}
