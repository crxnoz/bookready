<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 17 — per-template customizations for the 5 customer-facing emails.
 *
 * Stored as a single JSON column so adding a new template later doesn't
 * require another migration. Shape:
 *   {
 *     booking_request_client:   { subject?, intro?, signoff? },
 *     appointment_confirmed:    { ... },
 *     appointment_cancelled:    { ... },
 *     appointment_rescheduled:  { ... },
 *     appointment_reminder:     { ... }
 *   }
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notification_settings')) return;

        if (! Schema::hasColumn('notification_settings', 'email_templates')) {
            Schema::table('notification_settings', function (Blueprint $table) {
                $table->json('email_templates')->nullable()->after('sender_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('notification_settings')
            && Schema::hasColumn('notification_settings', 'email_templates')
        ) {
            Schema::table('notification_settings', function (Blueprint $table) {
                $table->dropColumn('email_templates');
            });
        }
    }
};
