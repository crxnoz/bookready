<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 — Per-service overrides + service ↔ staff pivot.
 *
 * Buffers + available_days are nullable so "inherit from global" stays
 * the default behaviour. A null override means "use the value from
 * availability_settings"; an explicit 0 means "no buffer". Empty
 * available_days array == null == "every day the business is open".
 *
 * service_staff is a many-to-many pivot. Empty pivot for a service means
 * "any staff" (or no staff selection prompt on the booking form); a
 * populated pivot means the SlotGenerator must intersect with those
 * staff members' hours + blocked dates.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                if (! Schema::hasColumn('services', 'buffer_before_override_minutes')) {
                    $table->unsignedSmallInteger('buffer_before_override_minutes')->nullable()->after('duration');
                }
                if (! Schema::hasColumn('services', 'buffer_after_override_minutes')) {
                    $table->unsignedSmallInteger('buffer_after_override_minutes')->nullable()->after('buffer_before_override_minutes');
                }
                if (! Schema::hasColumn('services', 'available_days')) {
                    // JSON array of integers 0-6 (0=Sunday). null = inherit.
                    $table->json('available_days')->nullable()->after('buffer_after_override_minutes');
                }
            });
        }

        if (! Schema::hasTable('service_staff')) {
            Schema::create('service_staff', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('service_id');
                $table->unsignedBigInteger('staff_id');
                $table->timestamps();

                $table->unique(['service_id', 'staff_id'], 'service_staff_unique');
                $table->index('service_id');
                $table->index('staff_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('service_staff');

        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                foreach ([
                    'buffer_before_override_minutes',
                    'buffer_after_override_minutes',
                    'available_days',
                ] as $col) {
                    if (Schema::hasColumn('services', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
