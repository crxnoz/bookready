<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * T1.4 — per-appointment Google Calendar event id (tenant DB).
 *
 * Stores the Google Calendar event id we created when we synced this
 * appointment. Acts as the idempotency key for update + delete: when the
 * owner reschedules, we PATCH this event id; when the owner cancels, we
 * DELETE this event id. Without it, every status change would create a
 * duplicate event.
 *
 * Nullable: appointments created BEFORE the owner connected Google have
 * no gcal id and are simply skipped on subsequent updates. The backfill
 * pass on first-connect populates the next 30 days of upcoming events.
 *
 * String not int: Google's calendar event ids are opaque strings
 * (e.g. "abc123def456"), not numeric.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('appointments')) return;
        if (Schema::hasColumn('appointments', 'gcal_event_id')) return;

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('gcal_event_id', 255)->nullable()->after('manage_token');
            // Lookup pattern: "give me every appointment with a gcal event"
            // (used by the disconnect cleanup to revoke pushed events).
            $table->index('gcal_event_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('appointments')) return;
        if (! Schema::hasColumn('appointments', 'gcal_event_id')) return;

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['gcal_event_id']);
            $table->dropColumn('gcal_event_id');
        });
    }
};
