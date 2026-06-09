<?php

namespace App\Support;

use App\Models\User;
use App\Services\GoogleCalendarSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * T1.4 — best-effort Google Calendar sync hooks for the appointment
 * lifecycle. Wraps every call in a try/catch so a Google API failure
 * NEVER breaks a booking flow.
 *
 * Contract:
 *   - Call onCreate / onUpdate / onCancel AFTER the appointment row is
 *     in its final state. The helpers re-read the row inside tenant
 *     scope to build the freshest event body.
 *   - Idempotent. onCreate is safe to call twice (it checks if
 *     gcal_event_id is already set); onUpdate/onCancel are safe on
 *     rows with no gcal_event_id (they no-op).
 *   - Owner-resolution: each tenant has exactly one owner (the user
 *     whose `users.tenant_id` matches). We look up that owner's Google
 *     integration; if none, no-op.
 *   - MUST be called INSIDE tenant scope (the appointment + business
 *     profile reads happen against the tenant DB).
 *
 * Why not Eloquent observers: the booking flow already touches the
 * appointment row through 6+ controllers, each at a slightly different
 * lifecycle moment. Explicit hooks at the call sites are easier to
 * audit than "an observer somewhere fires on save."
 */
class AppointmentGcalHooks
{
    /** Create a Google event for an appointment that doesn't have one yet. */
    public static function onCreate(string $tenantSlug, int $appointmentId): void
    {
        self::run('create', $tenantSlug, $appointmentId);
    }

    /** Update the existing event after a reschedule / detail change. */
    public static function onUpdate(string $tenantSlug, int $appointmentId): void
    {
        self::run('update', $tenantSlug, $appointmentId);
    }

    /** Delete the event on cancellation / no-show (per the launch decision). */
    public static function onCancel(string $tenantSlug, int $appointmentId): void
    {
        self::run('delete', $tenantSlug, $appointmentId);
    }

    /**
     * One implementation, three entry points. Branches by op at the end.
     * Every exit path is wrapped — Google MUST NOT break booking flows.
     */
    private static function run(string $op, string $tenantSlug, int $appointmentId): void
    {
        try {
            if (! Schema::hasTable('appointments')
                || ! Schema::hasColumn('appointments', 'gcal_event_id')) {
                return;
            }

            // Resolve the owner of this tenant via central users. tenant_id
            // is the slug (string). The `is_owner=true` filter is the
            // codebase convention (Tenant.php hasOne, AdminTenantsController,
            // TenantProvisioningService all use it) — without it, a future
            // staff-invite user with the same tenant_id could shadow the
            // owner non-deterministically (value() with no ORDER BY) and
            // gcal sync would silently no-op.
            $ownerId = DB::connection('mysql')
                ->table('users')
                ->where('tenant_id', $tenantSlug)
                ->where('is_owner', true)
                ->value('id');
            if (! $ownerId) return;

            $integration = GoogleCalendarSyncService::forOwner((int) $ownerId);
            if (! $integration || $integration->needs_reconnect) return;

            $row = DB::table('appointments')->where('id', $appointmentId)->first();
            if (! $row) return;

            // Skip pending_payment bookings on create/update — they aren't
            // committed money yet, and 50% of them never will be (customer
            // bailed on Stripe). The AppointmentPaymentWebhookController
            // fires onCreate again when payment lands and status flips to
            // confirmed/deposit_paid. Cancel always proceeds (cancelling
            // an unpaid hold is a real signal; if no gcal_event_id exists
            // the helper bails harmlessly below).
            $paymentStatus = property_exists($row, 'payment_status') ? $row->payment_status : null;
            if ($paymentStatus === 'pending_payment' && in_array($op, ['create', 'update'], true)) return;

            // Profile + manage URL for the event body.
            $businessName    = (string) (DB::table('business_profiles')->value('business_name') ?: $tenantSlug);
            $profile         = DB::table('business_profiles')->first();
            $businessAddress = $profile ? self::composeAddress((array) $profile) : null;
            $manageUrl       = BookingUrls::manage($tenantSlug, $row->manage_token ?? null);

            $apptArr = [
                'id'                => (int) $row->id,
                'tenant_slug'       => $tenantSlug,
                'appointment_date'  => $row->appointment_date,
                'start_time'        => $row->start_time,
                'end_time'          => $row->end_time,
                'service_name'      => $row->service_name ?? 'Appointment',
                'customer_name'     => $row->customer_name ?? null,
                'notes'             => $row->notes ?? null,
                'business_name'     => $businessName,
                'business_address'  => $businessAddress,
                'manage_url'        => $manageUrl,
            ];

            $service = app(GoogleCalendarSyncService::class);

            switch ($op) {
                case 'create':
                    // Idempotent: if already pushed, treat as update so a
                    // double-fire (e.g. confirmation webhook racing the
                    // booking POST) doesn't create a duplicate event.
                    if (! empty($row->gcal_event_id)) {
                        $service->updateEvent($integration, (string) $row->gcal_event_id, $apptArr);
                        return;
                    }
                    $eventId = $service->createEvent($integration, $apptArr);
                    if ($eventId) {
                        DB::table('appointments')
                            ->where('id', $appointmentId)
                            ->update(['gcal_event_id' => $eventId, 'updated_at' => now()]);
                    }
                    return;

                case 'update':
                    if (empty($row->gcal_event_id)) {
                        // No existing event — create one. Covers the rare
                        // case where the appointment was created before
                        // Google was connected.
                        $eventId = $service->createEvent($integration, $apptArr);
                        if ($eventId) {
                            DB::table('appointments')
                                ->where('id', $appointmentId)
                                ->update(['gcal_event_id' => $eventId, 'updated_at' => now()]);
                        }
                        return;
                    }
                    $service->updateEvent($integration, (string) $row->gcal_event_id, $apptArr);
                    return;

                case 'delete':
                    if (empty($row->gcal_event_id)) return;
                    $service->deleteEvent($integration, (string) $row->gcal_event_id);
                    // Clear the id whether or not the delete succeeded —
                    // a stale id is worse than a missing one. If delete
                    // failed (network) the orphan event stays in Google
                    // until owner deletes by hand; acceptable.
                    DB::table('appointments')
                        ->where('id', $appointmentId)
                        ->update(['gcal_event_id' => null, 'updated_at' => now()]);
                    return;
            }
        } catch (\Throwable $e) {
            Log::warning("gcal hook {$op} failed", [
                'tenant'         => $tenantSlug,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    private static function composeAddress(array $profile): ?string
    {
        $parts = array_filter([
            $profile['address_line'] ?? null,
            $profile['city']         ?? null,
            $profile['state']        ?? null,
            $profile['zip']          ?? null,
        ], fn ($s) => $s !== null && trim((string) $s) !== '');
        return $parts ? implode(', ', $parts) : null;
    }
}
