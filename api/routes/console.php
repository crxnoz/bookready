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
