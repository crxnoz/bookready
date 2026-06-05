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
