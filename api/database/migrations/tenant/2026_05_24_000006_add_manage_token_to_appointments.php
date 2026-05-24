<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a unique, opaque token to every appointment so a client can
 * self-serve cancel/reschedule from an email link without auth.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('manage_token', 48)->nullable()->after('paid_at');
            $table->unique('manage_token');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropUnique(['manage_token']);
            $table->dropColumn('manage_token');
        });
    }
};
