<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 5 · Availability Requests.
 *
 * Captures booking demand when no slot is available. Unlike the waitlist
 * (passive — wait for a cancellation), a request is an ACTIVE ask: the
 * customer names a preferred date/time and the owner manually decides.
 *
 * Status lifecycle:
 *   pending    → submitted, awaiting owner decision
 *   approved   → owner accepted → appointment created (approved_appointment_id)
 *   suggested  → owner proposed a different time (suggested_date/time);
 *                customer can accept via token → becomes approved
 *   declined   → owner declined (owner_note carries the reason)
 *   accepted   → customer accepted a suggestion → appointment created
 *   cancelled  → customer withdrew (rare; reserved)
 *
 * Payment timing: v1 is pay-after. No payment at request time; on approval
 * the created appointment flows through the normal deposit/balance tools.
 * (See docs/availability-2.0.md known-gaps #2.)
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('availability_requests')) return;

        Schema::create('availability_requests', function (Blueprint $table) {
            $table->id();

            // Customer (no account required — same shape as appointments).
            $table->string('customer_name', 200);
            $table->string('customer_email', 200);
            $table->string('customer_phone', 32)->nullable();

            // What they want.
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('staff_id')->nullable();
            $table->date('preferred_date');
            $table->string('preferred_time', 8)->nullable();   // HH:MM, optional
            $table->text('notes')->nullable();

            // Owner decision.
            $table->enum('status', ['pending', 'approved', 'suggested', 'declined', 'accepted', 'cancelled'])
                  ->default('pending');
            $table->text('owner_note')->nullable();            // decline reason / suggestion message
            $table->date('suggested_date')->nullable();
            $table->string('suggested_time', 8)->nullable();   // HH:MM

            // Token lets the customer view + accept a suggestion without login.
            $table->string('action_token', 64)->nullable()->unique();

            // Links to the appointment created on approve/accept.
            $table->unsignedBigInteger('appointment_id')->nullable();

            $table->timestamps();

            $table->index(['status', 'service_id'], 'idx_avreq_status_service');
            $table->index('preferred_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_requests');
    }
};
