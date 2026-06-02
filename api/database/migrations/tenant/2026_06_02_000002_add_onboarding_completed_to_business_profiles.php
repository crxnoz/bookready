<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pre-launch (#130): onboarding wizard completion marker.
     *
     * Null = the owner hasn't finished (or dismissed) the post-signup
     * onboarding wizard yet → the editor redirects them to /editor/onboard
     * on first load. Set to a timestamp once they complete or explicitly
     * skip the wizard so it never nags twice. Distinct from the dashboard
     * "setup checklist" (which reflects real data state) — this only
     * tracks whether the guided flow has been seen.
     */
    public function up(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            $table->timestamp('onboarding_completed_at')->nullable()->after('site_status');
        });
    }

    public function down(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            $table->dropColumn('onboarding_completed_at');
        });
    }
};
