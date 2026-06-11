<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Wave D (D1) — central-DB foundation for staff logins.
 *
 * INERT migration: it only adds columns + a per-tenant master kill
 * switch. Nothing reads role / staff_id / staff_login_enabled yet; the
 * invite flow, route split, and scoping land in later D-phases.
 *
 *  users.role            — owner | staff | admin. Backfilled from the
 *                          existing boolean flags so every legacy row
 *                          gets a non-null role on day one. Plain string
 *                          on the model (no exotic cast). DEFAULT 'owner'
 *                          keeps brand-new owner signups correct without
 *                          touching RegisterController.
 *  users.staff_id        — soft pointer to the tenant-DB staff.id. NO FK
 *                          (cross-database: users is central, staff lives
 *                          in each tenant DB). Indexed for reverse lookup.
 *  tenants.staff_login_enabled — boolean master switch, default FALSE.
 *                          When false the whole staff-login feature is
 *                          off for that tenant (invites 403, no staff
 *                          users created, editor behaves exactly as today).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['owner', 'staff', 'admin'])
                  ->default('owner')
                  ->after('is_admin');
            // Soft pointer to tenant-DB staff.id. No FK — cross-DB.
            $table->unsignedBigInteger('staff_id')
                  ->nullable()
                  ->after('role')
                  ->index();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->boolean('staff_login_enabled')
                  ->default(false)
                  ->after('id');
        });

        // Backfill role from the existing boolean flags. is_admin wins
        // over is_owner so a platform operator who also owns a tenant
        // is classed as admin (matches EnsureAdmin precedence).
        DB::table('users')->where('is_owner', 1)->update(['role' => 'owner']);
        DB::table('users')->where('is_admin', 1)->update(['role' => 'admin']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['staff_id']);
            $table->dropColumn(['role', 'staff_id']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('staff_login_enabled');
        });
    }
};
