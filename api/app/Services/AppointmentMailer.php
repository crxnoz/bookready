<?php

namespace App\Services;

use App\Mail\AppointmentCancelledClientMail;
use App\Mail\AppointmentConfirmedClientMail;
use App\Mail\BookingRequestClientMail;
use App\Mail\BookingRequestOwnerMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AppointmentMailer
{
    /**
     * Send booking request emails after a public booking is created.
     *
     * $appt   must be a plain PHP array — do NOT pass Eloquent models.
     * $notify (optional) is the tenant's notification_settings snapshot,
     * captured INSIDE the tenant scope and passed here so we don't need
     * a DB connection after tenancy()->end(). When null, defaults preserve
     * the pre-toggle behavior (everything sends).
     *
     * Call this AFTER tenancy()->end() to avoid connection serialization issues.
     */
    public static function sendBookingRequest(
        array   $appt,
        string  $businessName,
        ?string $ownerEmail,
        ?array  $notify = null,
    ): void {
        if ($ownerEmail && NotificationSettingsService::shouldSendOwnerBookingEmail($notify)) {
            try {
                Mail::to($ownerEmail)->send(new BookingRequestOwnerMail($appt, $businessName));
            } catch (\Throwable $e) {
                Log::error('[BookReady] BookingRequestOwnerMail failed', [
                    'appointment_id' => $appt['id'] ?? null,
                    'owner_email'    => $ownerEmail,
                    'error'          => $e->getMessage(),
                ]);
            }
        }

        if (! empty($appt['customer_email']) && NotificationSettingsService::shouldSendClientBookingEmail($notify)) {
            try {
                Mail::to($appt['customer_email'])->send(new BookingRequestClientMail($appt, $businessName));
            } catch (\Throwable $e) {
                Log::error('[BookReady] BookingRequestClientMail failed', [
                    'appointment_id' => $appt['id'] ?? null,
                    'customer_email' => $appt['customer_email'],
                    'error'          => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Send confirmation email to client when owner confirms an appointment.
     */
    public static function sendConfirmed(array $appt, string $businessName, ?array $notify = null): void
    {
        if (empty($appt['customer_email'])) {
            return;
        }
        if (! NotificationSettingsService::shouldSendConfirmedEmail($notify)) {
            return;
        }

        try {
            Mail::to($appt['customer_email'])->send(new AppointmentConfirmedClientMail($appt, $businessName));
        } catch (\Throwable $e) {
            Log::error('[BookReady] AppointmentConfirmedClientMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'customer_email' => $appt['customer_email'],
                'error'          => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send cancellation email to client when appointment is cancelled.
     */
    public static function sendCancelled(array $appt, string $businessName, ?array $notify = null): void
    {
        if (empty($appt['customer_email'])) {
            return;
        }
        if (! NotificationSettingsService::shouldSendCancelledEmail($notify)) {
            return;
        }

        try {
            Mail::to($appt['customer_email'])->send(new AppointmentCancelledClientMail($appt, $businessName));
        } catch (\Throwable $e) {
            Log::error('[BookReady] AppointmentCancelledClientMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'customer_email' => $appt['customer_email'],
                'error'          => $e->getMessage(),
            ]);
        }
    }
}
