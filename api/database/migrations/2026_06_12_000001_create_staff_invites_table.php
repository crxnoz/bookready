<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v2 Theme 1 (task #233) — central staff_invites table.
 *
 * The authoritative invite state still lives on the tenant
 * staff row (invite_token + invite_token_expires_at). This table
 * is a denormalized cache so we can answer "what invites are
 * pending for email X?" in one query instead of scanning every
 * tenant's staff table. That lookup powers the in-editor invite
 * inbox UI, and the no-password authed-accept path.
 *
 * Lifecycle:
 *   - StaffController::sendInvite writes (and updates on resend)
 *   - StaffInviteController::accept deletes on successful accept
 *   - InvitesController::accept deletes on no-password accept
 *   - Old central rows for already-claimed invites get cleaned up
 *     lazily when the inbox endpoint encounters them with a
 *     mismatched token_hash on the tenant row
 *
 * UNIQUE (tenant_id, staff_id) — at most one pending invite per
 * staff row at a time. Resending an invite updates the row in
 * place rather than creating a duplicate.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('staff_invites')) return;
        Schema::create('staff_invites', function (Blueprint $table) {
            $table->id();
            $table->string('email', 255)->index();
            $table->string('tenant_id', 255);
            $table->unsignedInteger('staff_id');
            $table->string('token_hash', 64);
            $table->timestamp('expires_at')->nullable()->index();
            $table->unsignedBigInteger('invited_by_user_id')->nullable();
            // Denormalized for the inbox UI — avoids cross-tenant
            // lookups when rendering. Mirrors what was true when
            // the invite was sent; not authoritative.
            $table->string('inviting_business_name', 255)->nullable();
            $table->string('inviting_staff_name', 255)->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'staff_id'], 'staff_invites_tenant_staff_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_invites');
    }
};
