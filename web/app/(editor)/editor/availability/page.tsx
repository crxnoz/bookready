'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, Users } from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import AvailabilityEditor from '@/components/editor/AvailabilityEditor'
import CalendarOverridesEditor from '@/components/editor/CalendarOverridesEditor'
import ReleaseStrategyPanel from '@/components/editor/ReleaseStrategyPanel'
import CapacityPanel from '@/components/editor/CapacityPanel'
import WaitlistEditor from '@/components/editor/WaitlistEditor'
import AvailabilityRequestsEditor from '@/components/editor/AvailabilityRequestsEditor'
import AfterHoursPanel from '@/components/editor/AfterHoursPanel'
import SqueezeInsPanel from '@/components/editor/SqueezeInsPanel'
import SubTabNav from '@/components/editor/SubTabNav'
import NavCard from '@/components/ui/NavCard'

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
  badge?: string
}

const TABS: TabDef[] = [
  { id: 'calendar',    label: 'Smart Calendar' },
  { id: 'drops',       label: 'Date Drops' },
  { id: 'capacity',    label: 'Capacity' },
  { id: 'after-hours', label: 'After Hours' },
  { id: 'squeeze-ins', label: 'Squeeze-Ins' },
  { id: 'waitlist',    label: 'Waitlist' },
  { id: 'requests',    label: 'Requests' },
  { id: 'advanced',    label: 'Advanced' },
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
    <div>
      <SubTabNav
        items={TABS}
        activeId={tab}
        hrefFor={id => `/editor/availability?tab=${id}`}
      />

      {tab === 'calendar' && <CalendarOverridesEditor />}
      {tab === 'drops'    && <ReleaseStrategyPanel />}
      {tab === 'capacity' && <CapacityPanel />}
      {tab === 'after-hours' && <AfterHoursPanel />}
      {tab === 'squeeze-ins' && <SqueezeInsPanel />}
      {tab === 'waitlist' && <WaitlistEditor />}
      {tab === 'requests' && <AvailabilityRequestsEditor />}
      {tab === 'advanced' && <AdvancedTab />}
    </div>
  )
}

/**
 * Advanced — power-user surface. The legacy weekly schedule (still the
 * fallback for any date with no override) plus pointers to the other
 * advanced controls that live on their own pages.
 */
function AdvancedTab() {
  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4">
      <div className="border border-hairline-soft bg-cream/50 p-4 text-sm text-muted-text">
        The <strong className="text-near-black">Smart Calendar</strong> is your primary scheduling
        tool. The weekly schedule below is the fallback for any date you haven&apos;t customized —
        edit it if you keep regular hours, or ignore it and drive everything from the calendar.
      </div>
      <AvailabilityEditor />
      <div className="grid gap-3 sm:grid-cols-2">
        <NavCard
          icon={Users}
          title="Staff availability"
          description="Per-staff hours, days off, and blocked dates."
          href="/editor/staff"
        />
        <NavCard
          icon={CalendarDays}
          title="Service availability"
          description="Which services are bookable and their durations."
          href="/editor/services"
        />
      </div>
    </div>
  )
}
