<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Re-do of migration 000006 — that one targeted the wrong table name
 * ('websites_sections' plural) so it ran as a no-op. The actual table
 * is 'website_sections'. Same conditional update logic preserves any
 * tenant who customized their section title.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('website_sections')) return;

        DB::table('website_sections')
            ->where('section_key', 'steps')
            ->where('title', 'Steps')
            ->update(['title' => 'Advice', 'updated_at' => now()]);

        DB::table('website_sections')
            ->where('section_key', 'before_appointment')
            ->where('title', 'Before Your Appointment')
            ->update(['title' => 'Timeline', 'updated_at' => now()]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('website_sections')) return;

        DB::table('website_sections')
            ->where('section_key', 'steps')
            ->where('title', 'Advice')
            ->update(['title' => 'Steps', 'updated_at' => now()]);

        DB::table('website_sections')
            ->where('section_key', 'before_appointment')
            ->where('title', 'Timeline')
            ->update(['title' => 'Before Your Appointment', 'updated_at' => now()]);
    }
};
