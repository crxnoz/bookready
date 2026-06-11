'use client'

import EditorShell from '@/components/editor/EditorShell'
import AppointmentsEditor from '@/components/editor/AppointmentsEditor'
import { useRole } from '@/components/app/RoleContext'

export default function AppointmentsPage() {
  // Wave D — staff see "My schedule" (their own bookings only); owners get
  // the full appointments view.
  const { isStaff } = useRole()
  return (
    <EditorShell
      title={isStaff ? 'My schedule' : 'Appointments'}
      subtitle={
        isStaff
          ? 'Your upcoming and past appointments. Mark complete, no-show, cancel, or reschedule.'
          : 'View, create, and manage every booking. Confirm, decline, or update status.'
      }
    >
      <AppointmentsEditor />
    </EditorShell>
  )
}
