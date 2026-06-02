import EditorShell from '@/components/editor/EditorShell'
import BillingHub from '@/components/editor/BillingHub'

export default function BillingPage() {
  return (
    <EditorShell pageHeader={false}>
      <BillingHub />
    </EditorShell>
  )
}
