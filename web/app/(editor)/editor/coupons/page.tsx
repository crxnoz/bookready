'use client'

import EditorShell from '@/components/editor/EditorShell'
import CouponsEditor from '@/components/editor/CouponsEditor'

/**
 * Coupons hub — lives under Bookings (per editorNav). Owners create
 * discount codes; customers redeem them on the public booking page via
 * the "Have a code?" widget.
 */
export default function CouponsPage() {
  return (
    <EditorShell
      title="Coupons"
      subtitle="Create discount codes customers can apply at booking."
    >
      <CouponsEditor />
    </EditorShell>
  )
}
