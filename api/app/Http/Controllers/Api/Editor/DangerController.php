<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Owner-initiated destructive / archival operations.
 *
 *  - GET  /editor/danger/export/{type}   stream CSV of appointments|customers
 *  - POST /editor/danger/delete-account  permanently delete the tenant
 *
 * Lives at /editor/* so it's already behind auth:sanctum. The delete path
 * adds a password + slug double-confirmation layer on top.
 */
class DangerController extends Controller
{
    private const ALLOWED_EXPORTS = ['appointments', 'customers'];

    /**
     * Streamed CSV download. Doing it as a StreamedResponse avoids
     * buffering 10,000 rows in memory if a tenant has a lot of history.
     */
    public function export(Request $request, string $type): StreamedResponse|JsonResponse
    {
        if (! in_array($type, self::ALLOWED_EXPORTS, true)) {
            return response()->json(['message' => 'Unknown export type'], 404);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        // Pre-fetch all rows under tenancy scope. We dump to a buffered array
        // first so we can safely tenancy()->end() before streaming to the
        // browser (otherwise the tenant connection is held open for the
        // whole download).
        tenancy()->initialize($tenant);

        $rows = [];
        $columns = [];

        if ($type === 'appointments') {
            $columns = [
                'id', 'status', 'appointment_date', 'start_time', 'end_time',
                'customer_name', 'customer_email', 'customer_phone',
                'service_name', 'service_price', 'service_duration_minutes',
                'payment_status', 'deposit_amount', 'deposit_paid_amount',
                'balance_paid_amount', 'tip_amount', 'refunded_amount',
                'late_fee_amount', 'late_fee_type',
                'payment_method', 'currency', 'paid_at',
                'notes', 'internal_notes', 'reschedule_count',
                'created_at', 'updated_at',
            ];
            if (Schema::hasTable('appointments')) {
                $rows = DB::table('appointments')
                    ->orderByDesc('appointment_date')
                    ->orderByDesc('start_time')
                    ->get()
                    ->map(fn ($r) => (array) $r)
                    ->all();
            }
        } else { // customers
            $columns = [
                'id', 'name', 'email', 'phone', 'notes',
                'total_appointments', 'last_appointment_at',
                'created_at', 'updated_at',
            ];
            if (Schema::hasTable('customers')) {
                $rows = DB::table('customers')
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn ($r) => (array) $r)
                    ->all();
            }
        }

        $businessName = (string) (
            Schema::hasTable('business_profiles')
                ? (DB::table('business_profiles')->value('business_name') ?: $tenant->id)
                : $tenant->id
        );

        tenancy()->end();

        $filename = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $businessName))
                  . "-{$type}-" . now()->format('Y-m-d') . '.csv';

        return new StreamedResponse(function () use ($columns, $rows) {
            $out = fopen('php://output', 'w');
            // BOM so Excel opens it as UTF-8 instead of Latin-1.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $columns);
            foreach ($rows as $row) {
                $line = [];
                foreach ($columns as $col) {
                    $v = $row[$col] ?? '';
                    // Flatten nulls and booleans into CSV-friendly strings.
                    if ($v === null)      $v = '';
                    elseif ($v === true)  $v = 'true';
                    elseif ($v === false) $v = 'false';
                    $line[] = (string) $v;
                }
                fputcsv($out, $line);
            }
            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Permanently delete the owner's tenant. Requires:
     *   - confirm_slug exactly matches the tenant id
     *   - password matches the owner's current password
     *
     * Drops the tenant database (via Stancl HasDatabase), removes the central
     * tenant + domain rows, deletes the owner User (cascades Sanctum tokens),
     * and best-effort cleans up R2 uploads.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'confirm_slug' => 'required|string',
            'password'     => 'required|string',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Password incorrect.',
                'errors'  => ['password' => ['Password incorrect.']],
            ], 422);
        }

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) {
            return response()->json(['message' => 'Workspace not found.'], 404);
        }

        if ($validated['confirm_slug'] !== $tenant->id) {
            return response()->json([
                'message' => 'Confirmation did not match.',
                'errors'  => ['confirm_slug' => ['Type "' . $tenant->id . '" exactly to confirm.']],
            ], 422);
        }

        $tenantId   = $tenant->id;
        $ownerEmail = $user->email;

        // ── Cancel BookReady SaaS subscription FIRST ──
        // If we don't, the deleted owner keeps getting charged monthly
        // with no UI to stop it. Cashier's cancelNow() terminates the
        // Stripe subscription immediately (no prorated refund). Runs
        // before the destructive DB delete so a Stripe failure surfaces
        // cleanly instead of leaving the account in a half-deleted state.
        try {
            if (method_exists($tenant, 'subscriptions')) {
                foreach ($tenant->subscriptions as $sub) {
                    if ($sub->valid() || $sub->onGracePeriod() || $sub->onTrial()) {
                        $sub->cancelNow();
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error('Self-delete: subscription cancellation failed', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
            // Don't proceed if we can't cancel billing — the user would
            // keep getting charged. They can retry or contact support.
            return response()->json([
                'message' => 'Could not cancel your subscription. Try again, or email hello@mybookready.com so we can stop billing manually.',
            ], 502);
        }

        // ── Best-effort cleanups (R2 uploads) ──
        try {
            Storage::disk('r2')->deleteDirectory("tenants/{$tenant->id}");
        } catch (\Throwable $e) {
            Log::warning('Self-delete: R2 cleanup failed', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
        }

        // Sanctum: revoke ALL tokens (including the current one) so any
        // other open tabs/devices log out cleanly.
        try {
            $user->tokens()->delete();
        } catch (\Throwable $e) {
            Log::warning('Self-delete: token revoke failed', [
                'error' => $e->getMessage(),
            ]);
        }

        // ── Delete the owner User on central FIRST so we don't leave a
        //    dangling tenant_id once the tenant goes away.
        try {
            $tenant->users()->delete();
        } catch (\Throwable $e) {
            Log::warning('Self-delete: tenant users delete failed (continuing)', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
        }

        // Drop the tenant DB + central tenant + domain rows.
        try {
            $tenant->delete();
        } catch (\Throwable $e) {
            Log::error('Self-delete: tenant delete failed', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Workspace delete failed. Please contact support.',
            ], 500);
        }

        Log::info('Self-delete: tenant deleted', [
            'tenant' => $tenantId,
            'owner'  => $ownerEmail,
        ]);

        return response()->json([
            'message' => 'Your BookReady account has been permanently deleted.',
        ]);
    }
}
