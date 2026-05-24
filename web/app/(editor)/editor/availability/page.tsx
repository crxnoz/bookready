import EditorShell from '@/components/editor/EditorShell'
import AvailabilityEditor from '@/components/editor/AvailabilityEditor'

export default function AvailabilityPage() {
  return (
    <EditorShell
      title="Availability"
      subtitle="Weekly hours, booking rules, and how clients book with you."
    >
      <AvailabilityEditor />
    </EditorShell>
  )
}
