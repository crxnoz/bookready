'use client'

import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import DashboardTrends from '../DashboardTrends'

/**
 * /admin/activity — the cross-tenant operational view: platform booking
 * volume, top tenants by 30-day bookings, and the every-tenant activity
 * heatmap. Reads the nightly snapshot.
 */
export default function ActivityPage() {
  const { trends } = useAdmin()
  return (
    <AdminShell tab="activity">
      <DashboardTrends trends={trends.data} loading={trends.loading} error={trends.error} />
    </AdminShell>
  )
}
