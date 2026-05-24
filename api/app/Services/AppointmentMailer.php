<?php

namespace App\Services;

use App\Mail\AppointmentCancelledClientMail;
use App\Mail\AppointmentConfirmedClientMail;
use App\Mail\AppointmentReminderClientMail;
use App\Mail\AppointmentRescheduledClientMail;
use App\Mail\BookingRequestClientMail;
use App\Mail\BookingRequestOwnerMail;
use App\Mail\ClientCancelledOwnerMail;
use App\Mail\ClientRescheduledOwnerMail;
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
     * Notify the owner when a CLIENT cancels their own booking via the
     * public manage-booking link. Always sent if we have an owner email —
     * we treat client-initiated changes as ops events the owner needs to
     * see (not gated by client_booking_email toggle).
     */
    public static function sendClientCancelledToOwner(
        array   $appt,
        string  $businessName,
        ?string $ownerEmail,
    ): void {
        if (! $ownerEmail) return;
        try {
            Mail::to($ownerEmail)->send(new ClientCancelledOwnerMail($appt, $businessName));
        } catch (\Throwable $e) {
            Log::error('[BookReady] ClientCancelledOwnerMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'owner_email'    => $ownerEmail,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify the owner when a CLIENT reschedules their own booking via
     * the public manage-booking link.
     */
    public static function sendClientRescheduledToOwner(
        array   $appt,
        array   $oldAppt,
        string  $businessName,
        ?string $ownerEmail,
    ): void {
        if (! $ownerEmail) return;
        try {
            Mail::to($ownerEmail)->send(new ClientRescheduledOwnerMail($appt, $oldAppt, $businessName));
        } catch (\Throwable $e) {
            Log::error('[BookReady] ClientRescheduledOwnerMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'owner_email'    => $ownerEmail,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify the client when their appointment is rescheduled — by EITHER
     * the owner (from the editor) or the client themselves (via the
     * manage page). The mail subject/copy adapts per $initiatedBy.
     *
     * Gated by the appointment_confirmed_email toggle since semantically
     * this is the "new confirmation" for the new time.
     */
    public static function sendRescheduled(
        array   $appt,
        array   $oldAppt,
        string  $businessName,
        string  $initiatedBy,            // 'owner' | 'client'
        ?array  $notify = null,
    ): void {
        if (empty($appt['customer_email'])) return;
        if (! NotificationSettingsService::shouldSendConfirmedEmail($notify)) return;

        try {
            Mail::to($appt['customer_email'])->send(
                new AppointmentRescheduledClientMail($appt, $oldAppt, $businessName, $initiatedBy),
            );
        } catch (\Throwable $e) {
            Log::error('[BookReady] AppointmentRescheduledClientMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'customer_email' => $appt['customer_email'],
                'initiated_by'   => $initiatedBy,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send an appointment reminder to the client. Caller is responsible
     * for honoring the tenant's reminder_email_enabled toggle and for
     * idempotency (don't double-send for the same appointment).
     */
    public static function sendReminder(array $appt, string $businessName, int $hoursBefore): void
    {
        if (empty($appt['customer_email'])) return;
        try {
            Mail::to($appt['customer_email'])->send(
                new AppointmentReminderClientMail($appt, $businessName, $hoursBefore),
            );
        } catch (\Throwable $e) {
            Log::error('[BookReady] AppointmentReminderClientMail failed', [
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
