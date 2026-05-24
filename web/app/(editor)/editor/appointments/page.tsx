import EditorShell from '@/components/editor/EditorShell'
import AppointmentsEditor from '@/components/editor/AppointmentsEditor'

export default function AppointmentsPage() {
  return (
    <EditorShell
      title="Appointments"
      subtitle="View, create, and manage every booking. Confirm, decline, or update status."
    >
      <AppointmentsEditor />
    </EditorShell>
  )
}
