<?php

namespace App\Services\Sms;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Builds + dispatches the transactional appointment SMS that the A2P
 * campaign is registered for: booking confirmations and reminders.
 *
 * Compliance rules baked in here (these are the whole reason this layer
 * exists rather than inlining SmsService::send at each call site):
 *
 *   - We ONLY text clients who explicitly opted in at booking time
 *     (the per-booking SMS consent checkbox → appointments.sms_consent_at).
 *     The caller passes that as $consented. No consent, no text. Ever.
 *   - We only text when a phone number is on file.
 *   - Every message is BookReady-branded, carries the appointment's
 *     manage/reschedule link on the branded bkrdy.me domain (declared as
 *     an embedded link in the campaign), and ends with the STOP/HELP
 *     instructions carriers require.
 *   - Sending is best-effort: SMS is a secondary channel (email is the
 *     primary, redundant one), so a failure here is logged and swallowed,
 *     never surfaced to the booking flow or the reminder cron.
 *
 * SmsService underneath still: normalizes the phone, checks the global
 * sms_optouts list, and dry-runs when Twilio creds aren't configured.
 */
class AppointmentSmsNotifier
{
    /**
     * Booking-confirmation SMS — fired alongside the confirmation email
     * when a booking is created (or, for deposit bookings, once payment
     * clears).
     */
    public static function confirmation(array $appt, string $businessName, bool $consented): void
    {
        if (! self::eligible($appt, $consented)) return;

        $body = sprintf(
            'BookReady: Your appointment with %s is confirmed for %s.%s Reply STOP to opt out, HELP for help.',
            $businessName,
            self::formatWhen($appt),
            self::manageSuffix($appt),
        );
        self::dispatch($appt, $body, 'booking_confirmation');
    }

    /**
     * Reminder SMS — fired by the appointments:send-reminders cron for
     * appointments coming up within the tenant's reminder window.
     */
    public static function reminder(array $appt, string $businessName, bool $consented): void
    {
        if (! self::eligible($appt, $consented)) return;

        $body = sprintf(
            'BookReady: Reminder — your appointment with %s is %s.%s Reply STOP to opt out, HELP for help.',
            $businessName,
            self::formatWhen($appt),
            self::manageSuffix($appt),
        );
        self::dispatch($appt, $body, 'appointment_reminder');
    }

    /** Only text opted-in clients who have a phone on file. */
    private static function eligible(array $appt, bool $consented): bool
    {
        return $consented && ! empty($appt['customer_phone'] ?? null);
    }

    /** " Manage or reschedule: https://slug.bkrdy.me/manage/token." or "". */
    private static function manageSuffix(array $appt): string
    {
        $url = $appt['manage_url'] ?? null;
        return $url ? ' Manage or reschedule: ' . $url . '.' : '';
    }

    /** Human date/time, e.g. "Tue Jun 10 at 2:00 PM". */
    private static function formatWhen(array $appt): string
    {
        $date = trim((string) ($appt['appointment_date'] ?? ''));
        $time = trim((string) ($appt['start_time'] ?? ''));
        if ($date === '') return 'your scheduled time';

        try {
            $dt = Carbon::parse(trim($date . ' ' . $time));
            return $time !== '' ? $dt->format('D M j \a\t g:i A') : $dt->format('D M j');
        } catch (\Throwable) {
            return 'your scheduled time';
        }
    }

    private static function dispatch(array $appt, string $body, string $templateKey): void
    {
        try {
            SmsService::send(
                to:          (string) $appt['customer_phone'],
                body:        $body,
                templateKey: $templateKey,
                context:     ['appointment_id' => $appt['id'] ?? null],
            );
        } catch (\Throwable $e) {
            Log::warning('appointment sms failed', [
                'template_key'   => $templateKey,
                'appointment_id' => $appt['id'] ?? null,
                'error'          => $e->getMessage(),
            ]);
        }
    }
}
