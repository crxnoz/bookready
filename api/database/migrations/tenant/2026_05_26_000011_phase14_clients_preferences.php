<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 14 — structured customer preferences.
 *
 * Owners had only a free-form `notes` field before. These columns
 * give the CRM something to query against (segments, defaults when
 * pre-filling a new appointment, birthday reminders later).
 *
 * All nullable — pre-existing customers don't know any of this yet,
 * and owners fill it in over time.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('clients')) return;

        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'preferred_service_id')) {
                $table->unsignedBigInteger('preferred_service_id')->nullable()->after('is_vip');
                $table->index('preferred_service_id');
            }
            if (! Schema::hasColumn('clients', 'preferred_staff_id')) {
                $table->unsignedBigInteger('preferred_staff_id')->nullable()->after('preferred_service_id');
                $table->index('preferred_staff_id');
            }
            if (! Schema::hasColumn('clients', 'preferred_time_of_day')) {
                // 'morning' | 'afternoon' | 'evening' — varchar (no enum so
                // we can add buckets later without a schema change).
                $table->string('preferred_time_of_day', 16)->nullable()->after('preferred_staff_id');
            }
            if (! Schema::hasColumn('clients', 'preferred_contact_method')) {
                // 'email' | 'sms' | 'phone'
                $table->string('preferred_contact_method', 16)->nullable()->after('preferred_time_of_day');
            }
            if (! Schema::hasColumn('clients', 'birthday')) {
                $table->date('birthday')->nullable()->after('preferred_contact_method');
            }
            if (! Schema::hasColumn('clients', 'preferences_notes')) {
                // Free-form for hair/skin/nails/lashes specifics. Separate
                // from the existing `notes` column (which we keep treating
                // as the general "private notes" field shown in the drawer).
                $table->text('preferences_notes')->nullable()->after('birthday');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clients')) return;

        Schema::table('clients', function (Blueprint $table) {
            foreach ([
                'preferences_notes',
                'birthday',
                'preferred_contact_method',
                'preferred_time_of_day',
                'preferred_staff_id',
                'preferred_service_id',
            ] as $col) {
                if (Schema::hasColumn('clients', $col)) {
                    try { $table->dropIndex([$col]); } catch (\Throwable) {}
                    $table->dropColumn($col);
                }
            }
        });
    }
};
