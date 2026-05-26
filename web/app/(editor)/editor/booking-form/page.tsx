import EditorShell from '@/components/editor/EditorShell'
import BookingFormEditor from '@/components/editor/BookingFormEditor'

export default function BookingFormPage() {
  return (
    <EditorShell
      title="Booking Form"
      subtitle="Custom questions clients answer when they book. Shown below customer info on your public booking form."
    >
      <BookingFormEditor />
    </EditorShell>
  )
}
