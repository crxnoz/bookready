<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant-side notification preferences.
 *
 * Call from inside a tenancy()->initialize() scope to load the row, then
 * pass the resulting plain array to AppointmentMailer so the mailer
 * doesn't need its own DB connection (matches the pattern where mailing
 * happens AFTER tenancy()->end()).
 */
class NotificationSettingsService
{
    public const DEFAULTS = [
        'owner_booking_email_enabled'         => true,
        'client_booking_email_enabled'        => true,
        'appointment_confirmed_email_enabled' => true,
        'appointment_cancelled_email_enabled' => true,
        'reminder_email_enabled'              => false,
        'reminder_hours_before'               => 24,
        'reply_to_email'                      => null,
        'sender_name'                         => null,
    ];

    /**
     * Read notification_settings for the current tenant scope.
     * Returns the defaults array (= preserve current behavior) when the
     * table or row is missing.
     */
    public static function load(): array
    {
        if (! Schema::hasTable('notification_settings')) {
            return self::DEFAULTS;
        }

        $row = DB::table('notification_settings')->first();
        if (! $row) {
            return self::DEFAULTS;
        }

        return [
            'owner_booking_email_enabled'         => (bool) $row->owner_booking_email_enabled,
            'client_booking_email_enabled'        => (bool) $row->client_booking_email_enabled,
            'appointment_confirmed_email_enabled' => (bool) $row->appointment_confirmed_email_enabled,
            'appointment_cancelled_email_enabled' => (bool) $row->appointment_cancelled_email_enabled,
            'reminder_email_enabled'              => (bool) $row->reminder_email_enabled,
            'reminder_hours_before'               => (int)  $row->reminder_hours_before,
            'reply_to_email'                      =>        $row->reply_to_email,
            'sender_name'                         =>        $row->sender_name,
        ];
    }

    /** Read a single toggle from a settings array, defaulting to true. */
    public static function get(?array $settings, string $key): bool
    {
        if (! $settings) return (bool) (self::DEFAULTS[$key] ?? true);
        return (bool) ($settings[$key] ?? self::DEFAULTS[$key] ?? true);
    }

    public static function shouldSendOwnerBookingEmail(?array $settings): bool
    {
        return self::get($settings, 'owner_booking_email_enabled');
    }

    public static function shouldSendClientBookingEmail(?array $settings): bool
    {
        return self::get($settings, 'client_booking_email_enabled');
    }

    public static function shouldSendConfirmedEmail(?array $settings): bool
    {
        return self::get($settings, 'appointment_confirmed_email_enabled');
    }

    public static function shouldSendCancelledEmail(?array $settings): bool
    {
        return self::get($settings, 'appointment_cancelled_email_enabled');
    }
}
