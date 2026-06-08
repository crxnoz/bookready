<?php

namespace App\Services;

use App\Mail\AvailabilityRequestSubmittedOwnerMail;
use App\Mail\AvailabilityRequestUpdateMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 5 · Availability Request orchestration.
 *
 * Thin coordinator around the availability_requests table:
 *   - notifies the owner when a request lands,
 *   - creates an appointment from a request when approved/accepted,
 *   - emails the customer the outcome (approved / suggested / declined).
 *
 * Assumes the caller has already initialized tenancy. Mail failures are
 * swallowed + logged — a notification hiccup must never break the request
 * state transition.
 */
class AvailabilityRequestService
{
    /** Owner-facing alert that a new request needs a decision. */
    public static function notifyOwner(object $request, string $businessName, ?string $ownerEmail, string $tenantSlug): void
    {
        if (! $ownerEmail) return;

        $service = self::serviceById((int) $request->service_id);
        try {
            Mail::to($ownerEmail)->send(new AvailabilityRequestSubmittedOwnerMail(
                businessName:  $businessName,
                customerName:  (string) $request->customer_name,
                customerEmail: (string) $request->customer_email,
                serviceName:   $service?->name ?? 'Service',
                preferredDate: substr((string) $request->preferred_date, 0, 10),
                preferredTime: $request->preferred_time ? substr((string) $request->preferred_time, 0, 5) : null,
                notes:         $request->notes,
                manageUrl:     'https://app.bkrdy.me/editor/availability?tab=squeeze-ins',
            ));
        } catch (\Throwable $e) {
            Log::warning('availability-request owner alert failed', [
                'tenant' => $tenantSlug, 'request' => $request->id, 'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create an appointment from an approved/accepted request.
     * Returns the new appointment id. $time is required (HH:MM) — the owner
     * confirms an exact time on approval; the suggested flow carries one.
     *
     * $surchargeCents folds a premium fee (squeeze-in) into amount_due and
     * stamps the surcharge columns when present.
     */
    public static function createAppointment(
        object $request, string $date, string $time, bool $autoConfirm,
        int $surchargeCents = 0, ?string $surchargeReason = null,
    ): int {
        $service = self::serviceById((int) $request->service_id);
        $duration = (int) ($service->duration ?? 60);

        $start = Carbon::createFromFormat('H:i', substr($time, 0, 5));
        $end   = $start->copy()->addMinutes($duration);

        $base = (float) ($service?->price ?? 0);
        $amountDue = $base + ($surchargeCents / 100);

        $row = [
            'service_id'               => $request->service_id,
            'staff_id'                 => $request->staff_id ?? null,
            'customer_name'            => $request->customer_name,
            'customer_email'           => $request->customer_email,
            'customer_phone'           => $request->customer_phone,
            'service_name'             => $service?->name ?? 'Service',
            'service_price'            => $service?->price ?? 0,
            'service_duration_minutes' => $duration,
            'appointment_date'         => $date,
            'start_time'               => $start->format('H:i:s'),
            'end_time'                 => $end->format('H:i:s'),
            'status'                   => 'confirmed', // owner-approved = confirmed
            'payment_status'           => 'unpaid',
            'currency'                 => 'usd',
            'amount_due'               => $amountDue,
            'reschedule_count'         => 0,
            'notes'                    => $surchargeReason === 'squeeze_in'
                                            ? 'Booked via squeeze-in'
                                            : 'Booked via availability request',
            'created_at'               => Carbon::now(),
            'updated_at'               => Carbon::now(),
        ];
        if ($surchargeCents > 0 && Schema::hasColumn('appointments', 'surcharge_cents')) {
            $row['surcharge_cents']  = $surchargeCents;
            $row['surcharge_reason'] = $surchargeReason;
        }

        return (int) DB::table('appointments')->insertGetId($row);
    }

    /** Email the customer their request outcome. $outcome ∈ approved|suggested|declined. */
    public static function notifyCustomer(object $request, string $outcome, string $businessName, string $tenantSlug, ?string $actionUrl = null): void
    {
        $service = self::serviceById((int) $request->service_id);
        try {
            Mail::to($request->customer_email)->send(new AvailabilityRequestUpdateMail(
                outcome:       $outcome,
                customerName:  (string) $request->customer_name,
                businessName:  $businessName,
                serviceName:   $service?->name ?? 'Service',
                preferredDate: substr((string) $request->preferred_date, 0, 10),
                suggestedDate: $request->suggested_date ? substr((string) $request->suggested_date, 0, 10) : null,
                suggestedTime: $request->suggested_time ? substr((string) $request->suggested_time, 0, 5) : null,
                ownerNote:     $request->owner_note,
                actionUrl:     $actionUrl,
            ));
        } catch (\Throwable $e) {
            Log::warning('availability-request customer notify failed', [
                'tenant' => $tenantSlug, 'request' => $request->id, 'outcome' => $outcome, 'error' => $e->getMessage(),
            ]);
        }
    }

    private static function serviceById(int $id): ?object
    {
        if (! Schema::hasTable('services') || $id <= 0) return null;
        return DB::table('services')->where('id', $id)->first();
    }
}
