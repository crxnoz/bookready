<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 follow-up — owner-announced squeeze-ins.
 *
 * Distinct from §6's customer-requested squeeze-ins (availability_requests
 * with kind='squeeze_in', owner-approval lifecycle). An announcement is
 * the owner PROACTIVELY saying "I have extra time inside my regular
 * working hours today — I'll squeeze a customer in for the squeeze-in
 * fee." Customer sees it as a bookable slot with the fee folded in and
 * pays at checkout, no owner-approval middle step.
 *
 * Shape:
 *
 *   date          The day the announcement applies to. One row per
 *                 (date, slot_windows) combination; an owner can
 *                 announce multiple windows on the same day via one row
 *                 with N windows, or several rows — both work.
 *
 *   slot_windows  JSON array of { start: "HH:MM", end: "HH:MM" } —
 *                 same shape used by calendar_overrides.custom_slots
 *                 (deliberate reuse — both features answer "what times
 *                 are bookable on this day"). The surfacer generates
 *                 slots at the tenant's slot interval within each
 *                 window and tags them tier=squeeze_in.
 *
 *   service_ids   JSON array of service ids the announcement applies to,
 *                 or NULL meaning "all services". Restricts which
 *                 services can claim the squeeze-in slot — e.g. owner
 *                 says "I have time for haircuts but not colors."
 *
 *   fee_cents     NULLABLE per-announcement override. NULL falls back to
 *                 squeeze_in_config.fee_cents.
 *
 *   notes         Optional owner note (200 char) — surfaced nowhere in
 *                 v1 but kept for forward-compat.
 *
 * Schema-guarded by Schema::hasTable() in the resolver so tenants whose
 * migration hasn't run yet keep working.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('squeeze_in_announcements', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->json('slot_windows');
            $table->json('service_ids')->nullable();
            $table->unsignedInteger('fee_cents')->nullable();
            $table->string('notes', 200)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('squeeze_in_announcements');
    }
};
