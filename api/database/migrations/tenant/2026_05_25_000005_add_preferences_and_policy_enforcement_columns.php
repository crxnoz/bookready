<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Settings restructure batch:
 *   - business_profiles gets owner Preferences fields (time zone, week
 *     start, time format, public site visibility, etc).
 *   - business_policies gets real enforcement rules (separate from the
 *     existing display-copy text fields).
 *   - appointments gets reschedule_count to enforce max-reschedules.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            // IANA tz string (e.g. 'America/New_York'). Null = fall back to APP_TIMEZONE.
            $table->string('time_zone', 64)->nullable()->after('zip');
            // 0=Sunday, 1=Monday — matches JS Date.getDay() convention.
            $table->unsignedTinyInteger('week_start_day')->default(0)->after('time_zone');
            // '12h' | '24h'
            $table->string('time_format', 8)->default('12h')->after('week_start_day');
            // Used when owner manually creates an appointment without selecting a service.
            $table->unsignedSmallInteger('default_appointment_duration_minutes')->default(60)->after('time_format');
            // Custom message shown to clients on the booking success page.
            $table->text('post_booking_message')->nullable()->after('default_appointment_duration_minutes');
            // Appended to all client-facing emails (replaces default "— {business}" sign-off).
            $table->text('email_signature')->nullable()->after('post_booking_message');
            // 'public' (live) | 'private' (password-gated) | 'coming_soon' (placeholder page)
            $table->string('site_visibility', 16)->default('public')->after('email_signature');
            // Only used when site_visibility = 'private'. Plain bcrypt hash.
            $table->string('site_password_hash')->nullable()->after('site_visibility');
        });

        Schema::table('business_policies', function (Blueprint $table) {
            // Minutes past start when a missed appointment can be auto-marked
            // no-show. 0 = disabled. Cron enforcement is a future batch — for
            // now we just store + display the setting.
            $table->unsignedSmallInteger('late_grace_period_minutes')->default(0)->after('extra_notes');
            // When a client cancels within the cancellation window via the
            // manage link, don't auto-refund their deposit.
            $table->boolean('forfeit_deposit_on_late_cancel')->default(false)->after('late_grace_period_minutes');
            // 0 = no reschedules allowed, null = unlimited.
            $table->unsignedTinyInteger('max_reschedules_per_booking')->nullable()->after('forfeit_deposit_on_late_cancel');
            // Adds a "I agree to the policies" checkbox to the public booking form.
            $table->boolean('require_policy_agreement')->default(false)->after('max_reschedules_per_booking');
        });

        Schema::table('appointments', function (Blueprint $table) {
            // Incremented every time the client/owner reschedules via the
            // manage link or owner UI. Used to enforce max_reschedules.
            $table->unsignedTinyInteger('reschedule_count')->default(0)->after('dispute_closed_at');
        });
    }

    public function down(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'time_zone',
                'week_start_day',
                'time_format',
                'default_appointment_duration_minutes',
                'post_booking_message',
                'email_signature',
                'site_visibility',
                'site_password_hash',
            ]);
        });
        Schema::table('business_policies', function (Blueprint $table) {
            $table->dropColumn([
                'late_grace_period_minutes',
                'forfeit_deposit_on_late_cancel',
                'max_reschedules_per_booking',
                'require_policy_agreement',
            ]);
        });
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('reschedule_count');
        });
    }
};
