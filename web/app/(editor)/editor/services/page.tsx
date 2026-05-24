import EditorShell from '@/components/editor/EditorShell'
import ServicesEditor from '@/components/editor/ServicesEditor'

export default function ServicesPage() {
  return (
    <EditorShell
      title="Services"
      subtitle="What you offer, how much it costs, and how long it takes."
    >
      <ServicesEditor />
    </EditorShell>
  )
}
