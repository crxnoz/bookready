'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CalendarDays, Repeat, Rocket, Users, Clock, Inbox, Moon, Zap,
} from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import AvailabilityEditor from '@/components/editor/AvailabilityEditor'
import CalendarOverridesEditor from '@/components/editor/CalendarOverridesEditor'
import ReleaseStrategyPanel from '@/components/editor/ReleaseStrategyPanel'
import CapacityPanel from '@/components/editor/CapacityPanel'
import WaitlistEditor from '@/components/editor/WaitlistEditor'
import AvailabilityRequestsEditor from '@/components/editor/AvailabilityRequestsEditor'
import AfterHoursPanel from '@/components/editor/AfterHoursPanel'
import SqueezeInsPanel from '@/components/editor/SqueezeInsPanel'
import { cn } from '@/lib/cn'

/**
 * /editor/availability — Availability 2.0 hub.
 *
 * The Smart Calendar is the primary scheduling surface; the weekly
 * schedule becomes a fallback under "Advanced". Each capability from the
 * Availability 2.0 spec gets its own sub-tab:
 *
 *   ?tab=calendar  (default)  Smart Calendar — per-date overrides
 *   ?tab=drops                Date Drops — scheduled release strategy
 *   ?tab=capacity             Capacity — daily caps (shop + per-staff)
 *   ?tab=waitlist             Waitlist — cancellation queue
 *   ?tab=advanced             Weekly schedule + booking rules (fallback)
 *
 * §4 After Hours, §5 Availability Requests, §6 Squeeze-Ins slot in here
 * as additional tabs as they ship.
 */

type TabId =
  | 'calendar' | 'drops' | 'capacity' | 'after-hours' | 'squeeze-ins' | 'waitlist' | 'requests' | 'advanced'

interface TabDef {
  id:    TabId
  label: string
  icon:  React.ElementType
  badge?: string
}

const TABS: TabDef[] = [
  { id: 'calendar', label: 'Smart Calendar', icon: CalendarDays },
  { id: 'drops',    label: 'Date Drops',     icon: Rocket },
  { id: 'capacity', label: 'Capacity',       icon: Users },
  { id: 'after-hours', label: 'After Hours', icon: Moon },
  { id: 'squeeze-ins', label: 'Squeeze-Ins', icon: Zap },
  { id: 'waitlist', label: 'Waitlist',       icon: Clock },
  { id: 'requests', label: 'Requests',       icon: Inbox },
  { id: 'advanced', label: 'Advanced',       icon: Repeat },
]

export default function AvailabilityPage() {
  return (
    <EditorShell
      title="Availability"
      subtitle="Your calendar, release timing, capacity, and how clients book with you."
    >
      <Suspense fallback={null}>
        <Hub />
      </Suspense>
    </EditorShell>
  )
}

function Hub() {
  const params = useSearchParams()
  const raw = params?.get('tab') ?? 'calendar'
  const tab: TabId = (TABS.some(t => t.id === raw) ? raw : 'calendar') as TabId

  return (
    <>
      <nav className="flex items-center gap-1 mb-5 border-b border-hairline-soft overflow-x-auto">
        {TABS.map(t => (
          <TabLink
            key={t.id}
            href={`/editor/availability?tab=${t.id}`}
            active={tab === t.id}
            icon={t.icon}
            label={t.label}
            badge={t.badge}
          />
        ))}
      </nav>

      {tab === 'calendar' && <CalendarOverridesEditor />}
      {tab === 'drops'    && <ReleaseStrategyPanel />}
      {tab === 'capacity' && <CapacityPanel />}
      {tab === 'after-hours' && <AfterHoursPanel />}
      {tab === 'squeeze-ins' && <SqueezeInsPanel />}
      {tab === 'waitlist' && <WaitlistEditor />}
      {tab === 'requests' && <AvailabilityRequestsEditor />}
      {tab === 'advanced' && <AdvancedTab />}
    </>
  )
}

/**
 * Advanced — power-user surface. The legacy weekly schedule (still the
 * fallback for any date with no override) plus pointers to the other
 * advanced controls that live on their own pages.
 */
function AdvancedTab() {
  return (
    <div>
      <div className=" border border-hairline-soft bg-cream/50 p-4 mb-5 text-sm text-muted-text">
        The <strong className="text-near-black">Smart Calendar</strong> is your primary scheduling
        tool. The weekly schedule below is the fallback for any date you haven&apos;t customized —
        edit it if you keep regular hours, or ignore it and drive everything from the calendar.
      </div>
      <AvailabilityEditor />
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link href="/editor/staff" className=" border border-hairline-soft bg-white p-4 hover:border-near-black/30 transition-colors">
          <div className="flex items-center gap-2 text-near-black font-medium text-sm"><Users size={15} /> Staff availability</div>
          <p className="text-xs text-muted-text mt-1">Per-staff hours, days off, and blocked dates.</p>
        </Link>
        <Link href="/editor/services" className=" border border-hairline-soft bg-white p-4 hover:border-near-black/30 transition-colors">
          <div className="flex items-center gap-2 text-near-black font-medium text-sm"><CalendarDays size={15} /> Service availability</div>
          <p className="text-xs text-muted-text mt-1">Which services are bookable and their durations.</p>
        </Link>
      </div>
    </div>
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
        'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap',
        active
          ? 'text-near-black border-near-black'
          : 'text-muted-text border-transparent hover:text-near-black',
      )}
    >
      <Icon size={12} />
      {label}
      {badge && (
        <span className="text-eyebrow font-bold tracking-[0.06em] uppercase bg-blush border border-hairline-soft text-near-black px-1 py-0.5 ml-1">
          {badge}
        </span>
      )}
    </Link>
  )
}
