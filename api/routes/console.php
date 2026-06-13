<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send appointment reminder emails every 5 minutes. The command itself
// is idempotent via appointments.reminder_sent_at, so a re-run inside
// the same window can't double-send.
Schedule::command('appointments:send-reminders --window=5')
    ->everyFiveMinutes()
    ->withoutOverlapping(10)
    ->runInBackground();

// #125 — Daily support / lead digest at 14:00 UTC (~9-10am ET). Surfaces
// new marketing_leads (which otherwise notify no one) + nudges the
// hello@mybookready.com inbox check. Silent on a zero-lead day so it
// never becomes ignorable noise.
Schedule::command('support:digest')
    ->dailyAt('14:00')
    ->withoutOverlapping(10)
    ->runInBackground();

// Admin dashboard cross-tenant snapshot at 03:00 UTC (low-traffic). Walks
// every tenant DB once and writes one central row the /admin dashboard's
// Phase-2 trends endpoint reads, so the page never pays the N-connection
// cost at request time. Idempotent (upserts on snapshot_date).
Schedule::command('admin:snapshot')
    ->dailyAt('03:00')
    ->withoutOverlapping(20)
    ->runInBackground();

// Scheduler-liveness heartbeat. The system cron fires `schedule:run` every
// minute; if THAT stops firing, nothing scheduled (snapshots, reminders,
// digests) runs and the platform silently degrades. This callback writes
// a timestamp every minute; the System Health probe reads it and flags
// warn/bad if it goes stale. Self-test for the scheduler itself.
Schedule::call(function () {
    @file_put_contents(
        storage_path('app/scheduler-tick.json'),
        json_encode(['at' => now()->toIso8601String()]),
    );
})->everyMinute()->name('scheduler-tick')->withoutOverlapping();

// Immediate alert when any health probe goes BAD. Runs every 5 min; the
// command itself enforces a 6h-per-probe cooldown so the same condition
// can't flood the inbox. Warn-level probes are NOT alerted here — they
// land in the daily digest below.
Schedule::command('admin:health-alert')
    ->everyFiveMinutes()
    ->withoutOverlapping(5)
    ->runInBackground();

// Daily system-health digest at 09:00 UTC (~5am ET). Lists everything
// currently warn OR bad, plus a "core signals" footer (scheduler tick,
// last deploy, snapshot freshness). Silent on totally-clean days so a
// quiet week never adds noise — use --force to send anyway.
Schedule::command('admin:health-digest')
    ->dailyAt('09:00')
    ->withoutOverlapping(10)
    ->runInBackground();

// Append one row per trendable probe to system_health_snapshots every
// 15 min — powers the 24h sparklines on /admin/system. Prunes >90d so
// the table stays a few MB max. Skips on overlap.
Schedule::command('admin:health-tick')
    ->everyFifteenMinutes()
    ->withoutOverlapping(5)
    ->runInBackground();

// Daily activity digest at 14:00 UTC (~10am ET). Headline KPIs + top
// movers + anomalies. Silent on flat days so a genuinely quiet week
// never adds noise — use --force to send anyway. Reuses the same
// trends payload the dashboard reads.
Schedule::command('admin:activity-digest')
    ->dailyAt('14:00')
    ->withoutOverlapping(10)
    ->runInBackground();

// Signup-reorder — daily reaper for pre-trial tenants. Warns at day 14,
// deletes at day 21. Runs at 04:00 UTC (~midnight ET) so the email
// lands the next morning. Skipping with --force isn't needed; the
// command already idempotently no-ops on days when no tenant is due.
Schedule::command('signup:reap-pre-trial')
    ->dailyAt('04:00')
    ->withoutOverlapping(10)
    ->runInBackground();
