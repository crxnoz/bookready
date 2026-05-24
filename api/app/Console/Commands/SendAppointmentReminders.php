<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\NotificationSettingsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Send appointment reminder emails to clients.
 *
 * Runs on a 5-minute schedule. For each tenant that has reminders
 * enabled in notification_settings, finds appointments whose start
 * is roughly `reminder_hours_before` hours from now (±5 min window),
 * status not cancelled/completed/no_show, customer_email present, and
 * reminder_sent_at is null. Sends + marks.
 *
 * Idempotency: reminder_sent_at acts as the lock. Even if the cron
 * misfires or the command runs twice in the same minute, each
 * appointment can only get one reminder.
 */
class SendAppointmentReminders extends Command
{
    protected $signature   = 'appointments:send-reminders {--window=5 : Match window in minutes around the target reminder time}';
    protected $description = 'Send any appointment reminder emails that are due in the current window.';

    public function handle(): int
    {
        $windowMin = max(1, (int) $this->option('window'));
        $now       = Carbon::now();
        $sentTotal = 0;
        $tenantsChecked = 0;

        foreach (Tenant::cursor() as $tenant) {
            $tenantsChecked++;
            $ownerEmail = $tenant->owner?->email;

            try {
                tenancy()->initialize($tenant);

                // Old tenants might not have either of these — skip them safely.
                if (! Schema::hasTable('notification_settings') || ! Schema::hasColumn('appointments', 'reminder_sent_at')) {
                    tenancy()->end();
                    continue;
                }

                $notify = NotificationSettingsService::load();
                if (! ($notify['reminder_email_enabled'] ?? false)) {
                    tenancy()->end();
                    continue;
                }

                $hoursBefore = max(1, (int) ($notify['reminder_hours_before'] ?? 24));
                $target      = $now->copy()->addHours($hoursBefore);
                $windowStart = $target->copy()->subMinutes($windowMin);
                $windowEnd   = $target->copy()->addMinutes($windowMin);

                // Pull candidate rows. We're filtering against
                // appointment_date + start_time concatenated into a datetime
                // server-side for portability across MySQL/MariaDB.
                $rows = DB::table('appointments')
                    ->whereNotIn('status', ['cancelled', 'completed', 'no_show'])
                    ->whereNotNull('customer_email')
                    ->whereNull('reminder_sent_at')
                    // Pre-narrow by date to limit how many rows we hydrate.
                    ->whereIn('appointment_date', [
                        $windowStart->toDateString(),
                        $windowEnd->toDateString(),
                    ])
                    ->get();

                $businessName = null;

                foreach ($rows as $row) {
                    $apptStart = Carbon::parse(
                        $row->appointment_date . ' ' . substr($row->start_time, 0, 5),
                        config('app.timezone'),
                    );
                    if (! $apptStart->between($windowStart, $windowEnd)) continue;

                    $businessName = $businessName ?? (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);

                    $manageUrl = property_exists($row, 'manage_token') && $row->manage_token
                        ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $row->manage_token)
                        : null;

                    $appt = [
                        'id'               => (int) $row->id,
                        'customer_name'    => $row->customer_name,
                        'customer_email'   => $row->customer_email,
                        'service_name'     => $row->service_name,
                        'appointment_date' => $row->appointment_date,
                        'start_time'       => substr($row->start_time, 0, 5),
                        'end_time'         => substr($row->end_time,   0, 5),
                        'status'           => $row->status,
                        'manage_url'       => $manageUrl,
                    ];

                    // Mark FIRST so a re-run can't double-send if the mailer hangs.
                    DB::table('appointments')->where('id', $row->id)->update([
                        'reminder_sent_at' => now(),
                        'updated_at'       => now(),
                    ]);

                    AppointmentMailer::sendReminder($appt, $businessName, $hoursBefore);
                    $sentTotal++;
                }

                tenancy()->end();
            } catch (\Throwable $e) {
                Log::error('appointments:send-reminders failed for tenant', [
                    'tenant' => $tenant->id,
                    'error'  => $e->getMessage(),
                ]);
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        $this->info(sprintf('Checked %d tenant(s), sent %d reminder(s).', $tenantsChecked, $sentTotal));
        return self::SUCCESS;
    }
}
