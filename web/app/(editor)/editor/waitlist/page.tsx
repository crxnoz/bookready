'use client'

import EditorShell from '@/components/editor/EditorShell'
import WaitlistEditor from '@/components/editor/WaitlistEditor'

/**
 * Standalone waitlist page. The waitlist also appears as a tab in the
 * Availability hub (/editor/availability?tab=waitlist); both render the
 * same WaitlistEditor component. This URL is kept stable for the Bookings
 * nav + any existing bookmarks.
 */
export default function WaitlistPage() {
  return (
    <EditorShell
      title="Waitlist"
      subtitle="People waiting for a slot to open — automatically offered cancellations."
    >
      <div className="w-full p-3 sm:p-5 md:p-6">
        <WaitlistEditor />
      </div>
    </EditorShell>
  )
}
