'use client'

import EditorShell from '@/components/editor/EditorShell'
import { ComingSoonPanel } from '@/components/editor/ComingSoonPanel'
import { Clock, Users, Bell, Sparkles } from 'lucide-react'

export default function WaitlistPage() {
  return (
    <EditorShell
      title="Waitlist"
      subtitle="A standby queue for fully-booked dates, coming soon."
    >
      <div className="w-full p-3 sm:p-5 md:p-6">
        <ComingSoonPanel
          eyebrow="Coming Soon"
          title="Waitlist"
          intro="When your week is fully booked, clients can join a waitlist for their preferred date. The moment a slot opens, BookReady notifies the next person in line so you never have empty time."
          features={[
            {
              icon:        Users,
              tone:        'accent',
              title:       'Self-serve sign-up',
              description: 'Clients pick the date + service they want and add themselves to the queue from your public booking page.',
              bullets: [
                'One-tap join, no account required',
                'Pick a specific time, day, or "any time" window',
                'Optionally pick a preferred staff member',
              ],
            },
            {
              icon:        Bell,
              title:       'Auto-notify on cancellations',
              description: 'When a slot frees up, the next match in the queue gets an email + a time-limited claim link.',
              bullets: [
                'First come, first served, no manual outreach',
                'Skip past clients who do not respond in time',
                'Owner override to hand-pick from the queue',
              ],
            },
            {
              icon:        Clock,
              title:       'Owner view',
              description: 'See the waitlist per date in one place, alongside the appointments calendar.',
              bullets: [
                'Drag a waitlist entry into a real slot',
                'Bulk-message the queue for a flash opening',
                'Track conversion: signups to confirmed bookings',
              ],
            },
            {
              icon:        Sparkles,
              title:       'VIP priority',
              description: 'Bump VIP clients to the top of the queue automatically.',
              bullets: [
                'Uses the existing VIP tag from Customers',
                'Optional "priority for new clients" mode',
                'Configurable per service',
              ],
            },
          ]}
        />
      </div>
    </EditorShell>
  )
}
