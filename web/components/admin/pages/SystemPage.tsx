'use client'

import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import DashboardSystemHealth from '../DashboardSystemHealth'

/**
 * /admin/system — operational probes (API errors, queue, last deploy,
 * mailer). Each independently guarded so one degraded probe doesn't
 * blank the rest.
 */
export default function SystemPage() {
  const { health } = useAdmin()
  return (
    <AdminShell tab="system">
      <DashboardSystemHealth data={health.data} loading={health.loading} error={health.error} />
    </AdminShell>
  )
}
