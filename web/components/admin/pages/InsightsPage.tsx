'use client'

import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import DashboardInsights from '../DashboardInsights'

/**
 * /admin/insights — rule-based triage list. Each rule fires only when it
 * has something to say.
 */
export default function InsightsPage() {
  const { insights } = useAdmin()
  return (
    <AdminShell tab="insights">
      <DashboardInsights data={insights.data} loading={insights.loading} error={insights.error} />
    </AdminShell>
  )
}
