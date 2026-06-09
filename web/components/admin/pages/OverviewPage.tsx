'use client'

import { AdminShell } from '../AdminShell'
import { AnnouncementsAdminSection } from '../AnnouncementsAdminSection'
import DashboardSummary from '../DashboardSummary'
import OperatorFocus from '../OperatorFocus'
import { useAdmin } from '../AdminProvider'

/**
 * /admin (Overview) — announcements at the top (operator's primary
 * broadcast surface) → Phase-1 platform overview (KPIs + MRR + growth +
 * recent activity feed) → #153 Operator focus (today's signups,
 * trialing, abandoned).
 *
 * The denser per-tenant operational view lives on /admin/activity; this
 * page is the daily glance.
 */
export default function OverviewPage() {
  const { summary } = useAdmin()
  return (
    <AdminShell tab="overview">
      <AnnouncementsAdminSection />
      <DashboardSummary data={summary.data} loading={summary.loading} error={summary.error} />
      <OperatorFocus data={summary.data} />
    </AdminShell>
  )
}
