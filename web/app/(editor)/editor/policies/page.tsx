import { redirect } from 'next/navigation'

export default function PoliciesPage() {
  redirect('/editor/website?tab=policies')
}
