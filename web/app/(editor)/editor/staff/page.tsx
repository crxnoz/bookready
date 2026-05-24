import EditorShell from '@/components/editor/EditorShell'
import StaffEditor from '@/components/editor/StaffEditor'

export default function StaffPage() {
  return (
    <EditorShell
      title="Staff"
      subtitle="Team members shown on your booking site."
    >
      <StaffEditor />
    </EditorShell>
  )
}
