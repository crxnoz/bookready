<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 of the customer-accounts feature — denormalized index
 * recording which tenants each customer has bookings in.
 *
 * Why this exists: the cross-tenant booking-list query
 * (GET /customer/bookings) needs to scan only the tenants the customer
 * has actually booked at, not every tenant in the platform. Without
 * this pivot, listing one customer's bookings is O(all-tenants);
 * with it, it's O(tenants-this-customer-touches), typically 1–3.
 *
 * Maintenance:
 *   - ClaimController::linkExistingClients() upserts a row per tenant
 *     it linked a clients record in (one shot per claim).
 *   - PublicBookingController upserts on every authed-customer booking.
 *   - No automatic cleanup when a customer has zero remaining
 *     appointments in a tenant — keeping the row is fine because the
 *     listing query joins against `clients.customer_user_id` anyway,
 *     so an over-broad tenant set just means a few extra empty lookups.
 *
 * Lives in central (alongside customer_users). Composite primary key
 * gives us idempotent upserts and natural dedup. first_booked_at /
 * last_booked_at are bookkeeping for future "you haven't booked at X
 * in a while" features; not load-bearing today.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('customer_user_tenants')) return;

        Schema::create('customer_user_tenants', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_user_id');
            // tenant_id is a string in stancl/tenancy v3 — the Tenant
            // model's primary key holds the slug ('lushstudio', etc.),
            // not an integer. Mirror that here.
            $table->string('tenant_id');
            $table->timestamp('first_booked_at')->nullable();
            $table->timestamp('last_booked_at')->nullable();
            $table->timestamps();

            $table->primary(['customer_user_id', 'tenant_id']);
            $table->index('customer_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_user_tenants');
    }
};
