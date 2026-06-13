<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Signup redesign v2 — central onboarding draft storage.
 *
 * Holds the in-progress state for steps 1-3 of the new signup flow
 * (account creation → email verify → business setup → website setup
 * → plan → trial → editor). The previous redesign provisioned the
 * tenant at /register; this one defers provisioning to step 4 so
 * users can navigate freely + abandon cheaply.
 *
 * One row per user. Lifetime = registration → tenant provisioning.
 * Once provisioned_at is non-null, the row is archival — the redirect
 * machine reads from tenants.* exclusively from that point on.
 *
 * Abandoned drafts (provisioned_at IS NULL AND created_at < now()-21d)
 * are reaped by signup:reap-pre-trial alongside the orphan user row.
 * Cheap to reap — no tenant DB to drop.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signup_drafts', function (Blueprint $t) {
            $t->id();

            // One draft per user. ON DELETE CASCADE so reaping the user
            // takes the draft with it.
            $t->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();

            // ── Step 3 — Business setup ─────────────────────────────
            $t->string('business_name', 100)->nullable();
            $t->string('tagline', 255)->nullable();
            // 'barber' | 'hair_salon' | 'spa' | 'nail_studio' | 'lash_studio' | 'tattoo_studio' | 'other'
            // Drives the ServiceTemplates registry on provisioning.
            $t->string('business_type', 50)->nullable();
            // [{name, price_cents, duration_minutes}, ...]. Pre-filled
            // by the frontend from the business_type registry; user may
            // edit any field. Backend uses what's in the row at
            // provisioning time, so an empty/null services field falls
            // back to the registry defaults.
            $t->json('services')->nullable();

            // ── Step 4 — Website setup ──────────────────────────────
            // Subdomain becomes the tenant id at provisioning. Stored
            // here in lowercase + trimmed.
            $t->string('selected_subdomain', 50)->nullable();
            $t->string('selected_template', 50)->nullable();

            // ── Step 5 — Plan pick ──────────────────────────────────
            // Kept on the draft (in addition to tenants.*) so back-
            // navigation after Step 4 doesn't lose the selection if
            // the user re-picks subdomain.
            $t->string('selected_plan', 20)->nullable();
            $t->string('selected_cycle', 20)->nullable();

            // ── Flow gate ───────────────────────────────────────────
            // null         → no business setup yet
            // 'business'   → step 3 done, ready for step 4
            // 'website'    → step 4 done, tenant provisioned
            // 'provisioned' → archival; read tenants.* instead
            $t->string('step_completed', 20)->nullable();

            // Set on successful Step 4 provisioning. Once non-null:
            //   - redirect machine reads from tenants.* not signup_drafts
            //   - draft survives for audit + recovery but is otherwise inert
            $t->string('tenant_id', 60)->nullable();
            $t->timestamp('provisioned_at')->nullable();

            $t->timestamps();

            // Reaper key — find orphan drafts in O(log n).
            $t->index('provisioned_at');
            // Tenant lookups (e.g. "what business_type did this tenant
            // pick at signup?" for analytics).
            $t->index(['tenant_id', 'provisioned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signup_drafts');
    }
};
