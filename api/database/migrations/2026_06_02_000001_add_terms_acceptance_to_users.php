<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pre-launch (#117): explicit ToS acceptance at signup. The register
     * form previously had passive "by creating an account you agree" text,
     * which is weak under common SaaS dispute defenses. We now require an
     * unchecked checkbox the user must tick, and we record the timestamp
     * + the version of /terms they agreed to so a future audit can prove
     * what they saw at click-time. terms_version is the effective date
     * of the Terms page (e.g. "2026-05-27") — keeps versioning simple
     * without needing a separate terms_versions table.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('terms_accepted_at')->nullable()->after('email_verified_at');
            $table->string('terms_version', 32)->nullable()->after('terms_accepted_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['terms_accepted_at', 'terms_version']);
        });
    }
};
