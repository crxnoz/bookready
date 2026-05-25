<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Free-form custom policy groups, stored alongside the existing six
 * named text fields. Shape:
 *   [
 *     { "heading": "Service guarantees", "items": [
 *         { "title": "Touch-ups", "content": "Free within 7 days..." }
 *     ]}
 *   ]
 * The fixed 6 (cancellation/late/no_show/deposit/reschedule/extra_notes)
 * stay separate because they're already wired into emails + the booking
 * form + enforcement settings. Custom groups are display-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_policies', function (Blueprint $table) {
            $table->json('custom_groups')->nullable()->after('require_policy_agreement');
        });
    }

    public function down(): void
    {
        Schema::table('business_policies', function (Blueprint $table) {
            $table->dropColumn('custom_groups');
        });
    }
};
