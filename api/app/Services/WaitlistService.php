<?php

namespace App\Services;

use App\Mail\WaitlistJoinConfirmMail;
use App\Mail\WaitlistSpotOpenedMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Availability 2.0 · Phase 7 · Waitlist orchestration.
 *
 * Two responsibilities:
 *
 *   onJoin($entry, $tenant)
 *     Send the customer a "you're on the waitlist" confirmation right
 *     after they submit. Idempotent — caller decides when to call.
 *
 *   onAppointmentCancelled($appointment, $tenant)
 *     The headline behavior. When a booking cancels, scan the waitlist
 *     for matching entries (service + date range + optional staff),
 *     pick the first eligible by created_at, and dispatch a spot-opened
 *     email with a 2-hour claim token. ONE notification per
 *     cancellation — the runner-up gets their shot if the first lets
 *     the claim window expire (claim handler re-runs the scan).
 *
 * Called from FOUR cancel sites:
 *   PublicManageBookingController::cancel        (customer token cancel)
 *   Customer\BookingsController                  (customer-account cancel)
 *   Editor\AppointmentsController::update        (status→cancelled)
 *   AppointmentPaymentWebhookController          (refund/dispute cancel)
 *
 * Tenant context: assumes the caller has already initialized tenancy.
 * We only touch tenant DB tables; no central DB lookups.
 */
class WaitlistService
{
    /** Two hours from now is the claim window. Spec calls it "automatic
     *  notification + accept spot" — short enough to encourage urgency,
     *  long enough that an email lands and is acted on. */
    private const CLAIM_WINDOW_HOURS = 2;

    /**
     * Persist + email the customer their "you're on the list" confirmation.
     * Returns the freshly-loaded entry row.
     */
    public static function onJoin(int $entryId, string $businessName, string $tenantSlug): void
    {
        $row = DB::table('waitlist_entries')->where('id', $entryId)->first();
        if (! $row) return;

        $service = self::serviceById((int) $row->service_id);
        try {
            Mail::to($row->customer_email)->send(
                new WaitlistJoinConfirmMail(
                    customerName: (string) $row->customer_name,
                    businessName: $businessName,
                    serviceName:  $service?->name ?? 'Service',
                    earliestDate: (string) $row->earliest_date,
                    latestDate:   (string) $row->latest_date,
                ),
            );
        } catch (\Throwable $e) {
            Log::warning('waitlist join-confirm send failed', [
                'tenant' => $tenantSlug, 'entry' => $entryId, 'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * The auto-fill heartbeat. Caller passes the just-cancelled
     * appointment row (after the status update so the slot is genuinely
     * free) plus the tenant identity for outbound email.
     */
    public static function onAppointmentCancelled(object $appointment, string $businessName, string $tenantSlug): void
    {
        if (! Schema::hasTable('waitlist_entries')) return;

        $serviceId       = (int) ($appointment->service_id ?? 0);
        $appointmentDate = substr((string) ($appointment->appointment_date ?? ''), 0, 10);
        if (! $serviceId || ! $appointmentDate) return;

        // Eligible entries: same service, date in range, still actively
        // listening (pending OR expired — expired = waitlister missed a
        // prior notification but is still on the list).
        $candidates = DB::table('waitlist_entries')
            ->where('service_id', $serviceId)
            ->whereIn('status', ['pending', 'expired'])
            ->where('earliest_date', '<=', $appointmentDate)
            ->where('latest_date',   '>=', $appointmentDate)
            ->orderBy('created_at')
            ->limit(20)
            ->get();

        if ($candidates->isEmpty()) return;

        // Pick the first match — honoring optional staff filter. We use
        // first-match-by-created-at (FCFS) per the spec's "optional
        // first-come-first-served logic."
        $appointmentStaffId = $appointment->staff_id ?? null;
        $chosen = null;
        foreach ($candidates as $c) {
            if ($c->staff_id !== null && $appointmentStaffId !== null
                && (int) $c->staff_id !== (int) $appointmentStaffId) {
                continue; // they want a different stylist
            }
            $chosen = $c;
            break;
        }
        if (! $chosen) return;

        $token   = Str::random(48);
        $expires = Carbon::now()->addHours(self::CLAIM_WINDOW_HOURS);

        DB::table('waitlist_entries')->where('id', $chosen->id)->update([
            'status'                  => 'notified',
            'claim_token'             => $token,
            'notified_at'             => Carbon::now(),
            'notification_expires_at' => $expires,
            'notified_appointment_id' => $appointment->id ?? null,
            'updated_at'              => Carbon::now(),
        ]);

        $service = self::serviceById($serviceId);
        $claimUrl = config('app.frontend_url', 'https://app.bkrdy.me');
        // Tenant subdomain lives at {slug}.bkrdy.me; landing page is on the
        // public site so customers don't need to log in to claim.
        $claimUrl = "https://{$tenantSlug}.bkrdy.me/waitlist/claim/{$token}";

        try {
            Mail::to($chosen->customer_email)->send(
                new WaitlistSpotOpenedMail(
                    customerName: (string) $chosen->customer_name,
                    businessName: $businessName,
                    serviceName:  $service?->name ?? 'Service',
                    appointmentDate: $appointmentDate,
                    startTime:    substr((string) ($appointment->start_time ?? ''), 0, 5),
                    claimUrl:     $claimUrl,
                    expiresAt:    $expires,
                ),
            );
        } catch (\Throwable $e) {
            Log::warning('waitlist spot-opened send failed', [
                'tenant' => $tenantSlug, 'entry' => $chosen->id, 'error' => $e->getMessage(),
            ]);
        }

        Log::info('waitlist offered slot', [
            'tenant'    => $tenantSlug,
            'entry'     => $chosen->id,
            'appt_date' => $appointmentDate,
            'expires'   => $expires->toIso8601String(),
        ]);
    }

    /** Lookup a service by id within the current tenant connection. */
    private static function serviceById(int $id): ?object
    {
        if (! Schema::hasTable('services') || $id <= 0) return null;
        return DB::table('services')->where('id', $id)->first();
    }
}
