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
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class AppointmentMailer
{
    /**
     * Apply the tenant's saved sender_name + reply_to_email to a Mailable
     * before it goes out. The mailers themselves only set the subject
     * via envelope(); from + replyTo are layered on here so a single
     * notification_settings UI change actually shows up on every email
     * type (client + owner) without having to touch each Mailable's
     * constructor signature.
     *
     * Quietly no-ops when $notify is null OR when the relevant fields
     * are empty — falling back to config('mail.from.{address,name}'),
     * which is the previous behavior.
     */
    private static function brand(Mailable $m, ?array $notify): Mailable
    {
        if (! $notify) return $m;

        $senderName = isset($notify['sender_name']) && is_string($notify['sender_name'])
            ? trim($notify['sender_name'])
            : '';
        $replyTo = isset($notify['reply_to_email']) && is_string($notify['reply_to_email'])
            ? trim($notify['reply_to_email'])
            : '';

        if ($senderName !== '') {
            $fromAddress = (string) config('mail.from.address');
            if ($fromAddress !== '') {
                $m->from($fromAddress, $senderName);
            }
        }
        if ($replyTo !== '') {
            // Use the sender name as the reply-to display name when set,
            // so the recipient's reply window labels the destination
            // recognizably ("Reply to ACME Studio <hi@studio.com>").
            $m->replyTo($replyTo, $senderName !== '' ? $senderName : null);
        }

        return $m;
    }

    /**
     * Phase 7 — pull the staff name + appointment_addons snapshot for an
     * appointment, formatted to drop straight into a $appt mailer array.
     *
     * MUST be called inside tenant scope (before `tenancy()->end()`) so
     * the staff/appointment_addons queries hit the right database. The
     * returned arrays default to safe empties so callers can blindly
     * splat them into their $appt array even on tenants that pre-date
     * the Phase 5/7 tables.
     *
     * Returns: ['staff_name' => string|null, 'addons' => array<int, array>]
     */
    public static function buildExtras(int $appointmentId, ?int $staffId): array
    {
        $staffName = null;
        if ($staffId !== null && Schema::hasTable('staff')) {
            $staffName = DB::table('staff')->where('id', $staffId)->value('name');
        }

        $addons = [];
        if (Schema::hasTable('appointment_addons')) {
            $addons = DB::table('appointment_addons')
                ->where('appointment_id', $appointmentId)
                ->get(['name_snapshot', 'price_snapshot_cents', 'duration_snapshot_minutes'])
                ->map(fn ($a) => [
                    'name'                   => $a->name_snapshot,
                    'extra_price'            => round($a->price_snapshot_cents / 100, 2),
                    'extra_duration_minutes' => (int) $a->duration_snapshot_minutes,
                ])
                ->all();
        }

        return [
            'staff_name' => $staffName,
            'addons'     => $addons,
        ];
    }

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
                Mail::to($ownerEmail)->send(self::brand(new BookingRequestOwnerMail($appt, $businessName), $notify));
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
                $custom = NotificationSettingsService::templateCustomization($notify, 'booking_request_client');
                Mail::to($appt['customer_email'])->send(self::brand(new BookingRequestClientMail($appt, $businessName, $custom), $notify));
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
            $custom = NotificationSettingsService::templateCustomization($notify, 'appointment_confirmed');
            Mail::to($appt['customer_email'])->send(self::brand(new AppointmentConfirmedClientMail($appt, $businessName, $custom), $notify));
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
        ?array  $notify = null,
    ): void {
        if (! $ownerEmail) return;
        try {
            Mail::to($ownerEmail)->send(self::brand(new ClientCancelledOwnerMail($appt, $businessName), $notify));
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
        ?array  $notify = null,
    ): void {
        if (! $ownerEmail) return;
        try {
            Mail::to($ownerEmail)->send(self::brand(new ClientRescheduledOwnerMail($appt, $oldAppt, $businessName), $notify));
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
            $custom = NotificationSettingsService::templateCustomization($notify, 'appointment_rescheduled');
            Mail::to($appt['customer_email'])->send(self::brand(
                new AppointmentRescheduledClientMail($appt, $oldAppt, $businessName, $initiatedBy, $custom),
                $notify,
            ));
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
    public static function sendReminder(array $appt, string $businessName, int $hoursBefore, ?array $notify = null): void
    {
        if (empty($appt['customer_email'])) return;
        try {
            $custom = NotificationSettingsService::templateCustomization($notify, 'appointment_reminder');
            Mail::to($appt['customer_email'])->send(self::brand(
                new AppointmentReminderClientMail($appt, $businessName, $custom, $hoursBefore),
                $notify,
            ));
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
            $custom = NotificationSettingsService::templateCustomization($notify, 'appointment_cancelled');
            Mail::to($appt['customer_email'])->send(self::brand(new AppointmentCancelledClientMail($appt, $businessName, $custom), $notify));
        } catch (\Throwable $e) {
            Log::error('[BookReady] AppointmentCancelledClientMail failed', [
                'appointment_id' => $appt['id'] ?? null,
                'customer_email' => $appt['customer_email'],
                'error'          => $e->getMessage(),
            ]);
        }
    }
}
