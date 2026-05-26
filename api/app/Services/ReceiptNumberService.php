<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 15 — issues human-friendly receipt numbers (R-000001, R-000002…).
 *
 * Must be called inside tenant scope (the counter lives on the per-
 * tenant payment_settings row). Uses a SELECT FOR UPDATE inside a DB
 * transaction so simultaneous webhook deliveries can't collide on the
 * same number.
 *
 * Idempotent — calling ::issue() on an appointment that already has
 * a receipt_number returns the existing number without bumping the
 * counter. That matters because Stripe will retry webhooks and we
 * don't want to burn numbers on retries.
 */
class ReceiptNumberService
{
    private const PREFIX = 'R-';
    private const WIDTH  = 6;

    /**
     * Issue (or return) the receipt number for an appointment.
     * Returns the receipt string, or null when the schema isn't ready
     * yet (legacy tenants pre-migration).
     */
    public static function issue(int $appointmentId): ?string
    {
        if (! Schema::hasColumn('appointments', 'receipt_number')) return null;

        // Fast path — already issued, skip the transaction entirely.
        $existing = DB::table('appointments')
            ->where('id', $appointmentId)
            ->value('receipt_number');
        if (! empty($existing)) return $existing;

        if (! Schema::hasTable('payment_settings') ||
            ! Schema::hasColumn('payment_settings', 'next_receipt_number')) {
            return null;
        }

        try {
            return DB::transaction(function () use ($appointmentId) {
                // Re-check inside the transaction — another concurrent
                // webhook may have just stamped this same appointment
                // between our fast-path read and the lock acquisition.
                $current = DB::table('appointments')
                    ->where('id', $appointmentId)
                    ->lockForUpdate()
                    ->value('receipt_number');
                if (! empty($current)) return $current;

                $row = DB::table('payment_settings')
                    ->lockForUpdate()
                    ->first();

                // No payment_settings row yet — create it. This shouldn't
                // happen in production (the row is seeded on Connect
                // setup) but we defend so we don't 500 a paid webhook.
                if (! $row) {
                    DB::table('payment_settings')->insert([
                        'currency'            => 'USD',
                        'next_receipt_number' => 1,
                        'created_at'          => now(),
                        'updated_at'          => now(),
                    ]);
                    $row = DB::table('payment_settings')->lockForUpdate()->first();
                }

                $next   = max(1, (int) ($row->next_receipt_number ?? 1));
                $number = self::PREFIX . str_pad((string) $next, self::WIDTH, '0', STR_PAD_LEFT);

                DB::table('payment_settings')
                    ->where('id', $row->id)
                    ->update([
                        'next_receipt_number' => $next + 1,
                        'updated_at'          => now(),
                    ]);

                DB::table('appointments')
                    ->where('id', $appointmentId)
                    ->update([
                        'receipt_number' => $number,
                        'updated_at'     => now(),
                    ]);

                return $number;
            });
        } catch (\Throwable $e) {
            // Don't let receipt issuance break payment confirmation —
            // we'd rather have a paid appointment without a number than
            // a failed webhook + an unpaid appointment.
            Log::warning('[BookReady] ReceiptNumberService::issue failed', [
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            return null;
        }
    }
}
