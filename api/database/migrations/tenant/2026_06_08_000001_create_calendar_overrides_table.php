<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 1 · Smart Calendar foundation.
 *
 * One row per date when the owner has set a per-date override. Layered
 * on top of the existing `hours` (weekly) table by the public availability
 * resolver — when a row exists for a date, it wins. When no row exists,
 * the weekly schedule is consulted unchanged. The legacy weekly UI keeps
 * working for every tenant; this table just enables the calendar surface.
 *
 * Design notes:
 *   - `date` is UNIQUE — one override per date. Editing replaces. Clearing
 *     deletes (fall back to weekly).
 *   - Hours / break columns are NULLABLE so an override can express either
 *     "explicit hours just for this date" or "use weekly hours but block
 *     out this specific staff/service subset" by leaving them null.
 *   - `is_available=false` is the "force closed" mode — it short-circuits
 *     to no slots regardless of weekly hours.
 *   - `staff_ids` / `service_ids` are JSON arrays of integer ids (or null
 *     for "all"). Nullable so the typical override (just adjusting hours)
 *     doesn't have to fill them in.
 *
 * SlotGenerator (the pure function) stays untouched — see docs/availability-2.0.md.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('calendar_overrides', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->boolean('is_available')->default(true);
            $table->time('open_time')->nullable();
            $table->time('close_time')->nullable();
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            // JSON arrays of staff_id / service_id, or NULL to mean "all".
            $table->json('staff_ids')->nullable();
            $table->json('service_ids')->nullable();
            $table->string('notes', 200)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_overrides');
    }
};
