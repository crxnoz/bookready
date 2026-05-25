<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One-shot rename: existing tenants have websites_sections rows with the
 * legacy 'Steps' / 'Before Your Appointment' titles. New tenants get the
 * new defaults from TemplateDefaults. This brings existing rows in line —
 * but ONLY when the title still matches the old default, so we don't
 * overwrite a tenant's custom rename.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('websites_sections')) return;

        DB::table('websites_sections')
            ->where('section_key', 'steps')
            ->where('title', 'Steps')
            ->update(['title' => 'Advice', 'updated_at' => now()]);

        DB::table('websites_sections')
            ->where('section_key', 'before_appointment')
            ->where('title', 'Before Your Appointment')
            ->update(['title' => 'Timeline', 'updated_at' => now()]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('websites_sections')) return;

        DB::table('websites_sections')
            ->where('section_key', 'steps')
            ->where('title', 'Advice')
            ->update(['title' => 'Steps', 'updated_at' => now()]);

        DB::table('websites_sections')
            ->where('section_key', 'before_appointment')
            ->where('title', 'Timeline')
            ->update(['title' => 'Before Your Appointment', 'updated_at' => now()]);
    }
};
