<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Wave D refinement (2026-06-11): the staff_login_enabled master switch
 * was defaulted FALSE in 2026_06_11_000001 out of defensive paranoia.
 * The real opt-in moment is the per-staff "Send login invite" button
 * on /editor/staff — clicking that IS the consent. Requiring an
 * additional master toggle on top added friction without adding
 * safety, and we shipped no UI to flip it on, so every new owner hit
 * a dead end the first time they tried to invite staff.
 *
 * Flipping defaults to TRUE going forward (handled in
 * TenantProvisioningService). This migration backfills existing
 * tenants so the few that were already created (founder + early
 * testers) get the same treatment without manual SQL.
 *
 * The column stays in place — a future "emergency revoke all staff
 * logins" UI can still flip the master switch off as a kill switch
 * after a security incident.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('tenants')
            ->where('staff_login_enabled', false)
            ->update(['staff_login_enabled' => true]);
    }

    public function down(): void
    {
        // No down: setting every tenant back to FALSE would silently
        // lock every owner out of inviting staff without admin
        // intervention. If the rollback is genuinely needed, do it
        // case by case via tinker.
    }
};
