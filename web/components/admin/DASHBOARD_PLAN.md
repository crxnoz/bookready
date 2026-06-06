# Platform Admin Dashboard — Build Plan

The page lives at `/admin` and is what the BookReady operator
(`carrenoluis318@gmail.com`, `users.is_admin = true`) sees across all
tenants. This doc captures the agreed-on plan so we can pick it up
cleanly when build starts.

**Status**: planned, not started.

---

## Scope decisions (locked)

| Question | Answer |
|---|---|
| Who is this for? | Platform admin (`/admin`), NOT the per-tenant `/editor` dashboard. |
| Real-time updates? | 5-minute cache, refresh-on-load. No websockets. |
| Insights / nudges? | Yes — ship Phase 3 with rule-based observations. |
| Rollout? | Build all 3 phases up front, ship as one block. (Updated 2026-06-06: parked for now, decision to be revisited when build starts.) |

---

## Baseline — what `/admin` already has

- `GET /admin/stats` — tenant count, plan distribution
- `GET /admin/tenants`, `DELETE /admin/tenants/{id}` — list + purge
- `GET/POST/PATCH/DELETE /admin/announcements` — platform-wide notices
  (the `GET` list is unauthenticated so every owner's dashboard polls it)
- Gated by `users.is_admin` + middleware `App\Http\Middleware\EnsureAdmin`
- Frontend: `web/app/admin/page.tsx` + `web/components/admin/AdminPage.tsx`

What's NOT there: MRR, churn, growth over time, cross-tenant booking
volume, activity insights, system health.

---

## Target IA (top to bottom)

```
1.  Greeting + system health badge
2.  KPI bar (4 cards)         — tenant count · MRR · new this week · churn %
3.  MRR chart                 — last 12 weeks, stacked-area by plan
4.  Tenant growth chart       — last 90 days, signups vs cancellations
5.  Tenant activity heatmap   — every tenant as a colored tile
6.  Top tenants (bar)         — last 30 days by booking volume
7.  Platform booking volume   — daily appointments across ALL tenants
8.  Recent activity feed      — signups · upgrades · cancellations
9.  Insights (rule-based)     — churn risk · expiring trials · conversion
10. System health card        — API errors · queue depth · deploy · mailer
11. Tenant table (extended)   — search + filter + analytics cols + drill-in
```

---

## Widget catalog

| # | Widget | Answers | Data source | Cache |
|---|---|---|---|---|
| 1 | Greeting + Health badge | "Anything on fire?" | Aggregate of #10 | live |
| 2 | KPI bar | "How are we doing?" | central `tenants`, `subscriptions`, `users` | 5min |
| 3 | MRR chart | "Are we growing?" | Stripe subscriptions + plan price catalog | 1hr |
| 4 | Tenant growth | "Signups vs cancels trend" | `tenants.created_at` + `subscriptions` flips | 1hr |
| 5 | Activity heatmap | "Which tenants are dormant?" | per-tenant appointment counts (30d) | nightly snapshot |
| 6 | Top tenants | "Who's busy?" | per-tenant appointment counts | nightly |
| 7 | Platform booking volume | "Is the platform getting used?" | sum across tenants | nightly |
| 8 | Activity feed | "What happened today?" | timestamps from tenants + subscriptions + first appointments | 5min |
| 9 | Insights | "What needs attention?" | Derived from the same aggregates | nightly |
| 10 | System health | "Anything broken?" | logs + Horizon + deploy stamp + Resend API | varied (1min–5min) |
| 11 | Tenant table | "Drill into one tenant" | central `tenants` joined with snapshot aggregates | 5min |

---

## Build phases

### Phase 1 — Daily-briefing MVP (~3-4 days)

Ship value fast. After this, the admin has a real briefing page.

- Widgets: #1 (basic health), #2 (KPI bar), #3 (MRR chart), #4 (growth chart), #8 (activity feed)
- Backend: one endpoint `GET /admin/dashboard/summary`, `Cache::remember(..., 300)`
- Frontend: replace the current `AdminPage` body with the new layout; keep the announcements panel intact
- Recharts for the MRR stacked-area + growth line

### Phase 2 — Cross-tenant operational view (~3-4 days)

This is where the hard query work lives — see "Cross-tenant gotcha" below.

- Widgets: #5 (activity heatmap), #6 (top tenants), #7 (platform booking volume), #11 (extended tenant table)
- Backend: nightly Artisan command `php artisan admin:snapshot` writes to a NEW central table `platform_dashboard_snapshots` (one row per day with all cross-tenant aggregates as JSON). New endpoint `GET /admin/dashboard/trends` reads from that table.
- Tile heatmap is pure CSS grid (no chart lib). 47 tenants → 7×7 grid, tooltips on hover, click → tenant detail.

### Phase 3 — Insights + System health + Drill-in (~2-3 days)

- Widget #9 — insights rules:
  - Tenants with no bookings in 30 days → churn risk
  - Trials expiring this week → outreach list
  - Trial→paid conversion rate this month vs last
  - Fastest-growing tenants by booking velocity
  - Plan-upgrade opportunities (tenant on Solo hitting Studio thresholds)
- Widget #10 — system health:
  - API errors via Laravel logs query (last 24h)
  - Queue depth via Horizon table count, or direct `jobs` table if Horizon not in
  - Last deploy: deploy script writes `/var/log/last-deploy.json` with timestamp + commit
  - Resend mailer: Resend API `/emails` recent count + bounce rate
- Per-tenant detail page (`/admin/tenants/{slug}`): bookings over time chart, MRR contribution, last 10 events, "switch to this tenant" button for support

---

## Tech notes (the parts that bite you)

### Cross-tenant aggregates

Each tenant lives in its own MySQL DB (`tenant_<slug>`). Computing platform-wide booking volume means looping every tenant, `tenancy()->initialize()`, running the count, `tenancy()->end()`. With 47 tenants that's 47 connection switches per dashboard load — never compute live.

**Solution**: nightly snapshot job. `php artisan admin:snapshot` runs at 3am, writes one row to `platform_dashboard_snapshots` on the central DB with all cross-tenant aggregates as JSON. Dashboard reads from the snapshot table. Trends are 1-day-resolution which is fine for the use case.

### MRR calculation

Stripe is the source of truth. Pull active subscriptions, sum monthly-equivalent amounts. Cache 1hr; bust on Stripe webhook events (`customer.subscription.created/updated/deleted`).

### Chart library

Recharts. ~30kb gzipped, React-native, fine for the admin bundle (which 95% of users never load).

### Activity heatmap tile grid

Pure CSS grid. No chart library. 36×36px tiles, color-coded by activity tier (`alive` / `slowing` / `dormant` / `churned`), title attribute = tenant name + last booking time. Click = navigate to `/admin/tenants/{slug}`.

### System health sub-queries

Four sub-queries, each cached differently:
- API errors: scan Laravel log file for last 24h, count `ERROR` entries. 1min cache.
- Queue depth: `SELECT COUNT(*) FROM jobs`. Live.
- Deploy stamp: read `/var/log/last-deploy.json` written by the deploy script. Static until next deploy. (NEW — the existing deploy block needs a single `echo "..." > /var/log/last-deploy.json` added.)
- Mailer: Resend API `/emails?limit=1` to confirm 200 + recent count. 5min cache.

---

## Endpoints to add

| Method | Path | Returns | Cache |
|---|---|---|---|
| GET | `/admin/dashboard/summary` | Phase 1: KPI bar, MRR, growth, activity feed (composed) | 5min |
| GET | `/admin/dashboard/trends` | Phase 2: heatmap data, top tenants, platform booking volume | reads from snapshot table |
| GET | `/admin/dashboard/insights` | Phase 3: insights array (5-7 observations) | nightly |
| GET | `/admin/dashboard/health` | Phase 3: 4 health metrics | varied |
| GET | `/admin/tenants/{slug}` | Phase 3: tenant detail page payload | 5min |

---

## Files to add / modify

```
api/
  app/
    Http/
      Controllers/
        Api/
          Admin/
            DashboardController.php          [new]   summary/trends/insights/health
            TenantDetailController.php       [new]   per-tenant drill-in
    Console/
      Commands/
        SnapshotDashboardCommand.php         [new]   nightly cross-tenant aggregator
    Support/
      DashboardAggregator.php                [new]   helper for cross-tenant counts
  routes/
    api.php                                  [edit]  add the 5 new routes
  database/
    migrations/
      [date]_create_platform_dashboard_snapshots_table.php  [new]
  console/
    Kernel.php                               [edit]  schedule snapshot at 3am

web/
  app/admin/
    page.tsx                                 [edit]  if route guard changes
    tenants/[slug]/
      page.tsx                               [new]   per-tenant detail
  components/admin/
    AdminPage.tsx                            [edit]  swap body for new dashboard
    DashboardKpiBar.tsx                      [new]
    DashboardMrrChart.tsx                    [new]
    DashboardGrowthChart.tsx                 [new]
    DashboardActivityHeatmap.tsx             [new]
    DashboardTopTenants.tsx                  [new]
    DashboardBookingVolume.tsx               [new]
    DashboardActivityFeed.tsx                [new]
    DashboardInsights.tsx                    [new]
    DashboardSystemHealth.tsx                [new]
    DashboardTenantTable.tsx                 [new] / [refactor of existing]
    DASHBOARD_PLAN.md                        [this file]
  lib/api.ts                                 [edit]  add the 5 new API call helpers
```

---

## Open questions (parking lot, decide at build time)

- **Insights persistence**: do we want insights dismissible (per-admin state), or recompute every day fresh? Lean toward "fresh every day, no dismiss" for simplicity.
- **Tenant detail page**: full page (`/admin/tenants/{slug}`) or modal/drawer? Lean full page so it's bookmarkable + supports back-button.
- **Snapshot retention**: how long to keep `platform_dashboard_snapshots` rows? 90 days is probably enough for trend charts; older rows can be pruned monthly.
- **Active vs trialing tenants**: count both in the "Tenants" KPI, OR separate cards? Lean toward separate (most operators care about the trial-pipeline number).
- **Plan price catalog**: hardcoded constants or pulled from Stripe? Hardcoded for now, sync from Stripe when we have >3 plans.

---

## When build starts

1. Read this doc.
2. Re-confirm phase rollout choice (might want Phase 1 first now that there's more context).
3. Start at Phase 1: scaffold the snapshot command + summary endpoint + skeleton AdminPage layout, ship Phase 1 widgets, deploy, evaluate, decide on Phase 2 timing.

Last updated: 2026-06-06.
