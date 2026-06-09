<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Cancel appointments stuck in payment_status = 'pending_payment'.
 *
 * Why this exists: the public booking flow creates an appointment row
 * BEFORE the customer's card is charged so the slot is held during
 * Stripe checkout. If the customer abandons (closes the tab, payment
 * times out, network drops) the row stays pending_payment forever:
 *   - the time slot is blocked from real bookings
 *   - the owner sees a phantom "booking request" in Needs Attention
 *   - the appointment never resolves to confirmed or cancelled
 *
 * Webhooks handle the happy "payment failed / canceled" paths, but a
 * customer who just walks away never triggers those. This command is
 * the safety net.
 *
 * Default window: 15 minutes. Stripe sessions and embedded checkouts
 * both expire well inside this. Anything older is a genuine abandon.
 *
 * Idempotency: the WHERE clause itself prevents double-cancellation,
 * and we only ever transition pending_payment → cancelled.
 *
 * Cron: run every 5 minutes via the prod server crontab, same pattern
 * as appointments:send-reminders.
 */
class ExpirePendingPayments extends Command
{
    protected $signature   = 'appointments:expire-pending-payments {--minutes=15 : Cancel pending_payment rows older than this} {--dry : List what would be cancelled, don\'t touch the DB}';
    protected $description = 'Cancel abandoned-checkout appointments that have been stuck in pending_payment past the grace window.';

    public function handle(): int
    {
        $minutes = max(1, (int) $this->option('minutes'));
        $dry     = (bool) $this->option('dry');
        $cutoff  = Carbon::now()->subMinutes($minutes);

        $totalCancelled  = 0;
        $tenantsChecked  = 0;

        foreach (Tenant::cursor() as $tenant) {
            $tenantsChecked++;
            try {
                tenancy()->initialize($tenant);

                // Old tenants might predate the payment_status column. Skip.
                if (! Schema::hasColumn('appointments', 'payment_status')) {
                    tenancy()->end();
                    continue;
                }

                $rows = DB::table('appointments')
                    ->where('payment_status', 'pending_payment')
                    ->where('created_at', '<', $cutoff)
                    ->select(['id', 'customer_name', 'appointment_date', 'created_at'])
                    ->get();

                if ($rows->isEmpty()) {
                    tenancy()->end();
                    continue;
                }

                if ($dry) {
                    foreach ($rows as $r) {
                        $this->line(sprintf(
                            '  [dry] %s #%d %s on %s (created %s)',
                            $tenant->id, $r->id, $r->customer_name, $r->appointment_date, $r->created_at,
                        ));
                    }
                    $totalCancelled += $rows->count();
                    tenancy()->end();
                    continue;
                }

                $ids = $rows->pluck('id')->all();
                $affected = DB::table('appointments')
                    ->whereIn('id', $ids)
                    // Re-check the payment_status in the UPDATE to avoid a TOCTOU
                    // race with the webhook racing in between SELECT and UPDATE.
                    ->where('payment_status', 'pending_payment')
                    ->update([
                        'status'         => 'cancelled',
                        'payment_status' => 'failed',
                        'updated_at'     => now(),
                    ]);

                if ($affected > 0) {
                    Log::info('Expired pending_payment appointments', [
                        'tenant_id' => $tenant->id,
                        'count'     => $affected,
                        'window_minutes' => $minutes,
                    ]);
                    $totalCancelled += $affected;
                    $this->line(sprintf('  %s — cancelled %d', $tenant->id, $affected));
                }

                tenancy()->end();
            } catch (\Throwable $e) {
                Log::error('ExpirePendingPayments error', [
                    'tenant_id' => $tenant->id,
                    'error'     => $e->getMessage(),
                ]);
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        $this->info(sprintf(
            '%s. Tenants checked: %d. %s cancelled: %d. Window: %d min.',
            $dry ? 'Dry run' : 'Done',
            $tenantsChecked,
            $dry ? 'Would cancel' : 'Cancelled',
            $totalCancelled,
            $minutes,
        ));

        return self::SUCCESS;
    }
}
