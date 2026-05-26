<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Phase 2: staff.email becomes required.
 *
 * Existing rows that have a NULL email get a stable placeholder
 * (staff-{id}@placeholder.local) so the column can flip to NOT NULL.
 * The owner is expected to replace those values via the Staff editor;
 * the placeholder format is documented so tooling can detect it later.
 *
 * The Doctrine DBAL dependency normally required for `->change()` calls
 * is sidestepped here with a raw ALTER, because some tenants run an
 * older composer install without doctrine/dbal pinned.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('staff')) return;
        if (! Schema::hasColumn('staff', 'email')) return;

        // Backfill placeholders so the NOT NULL switch doesn't fail mid-flight.
        DB::table('staff')
            ->whereNull('email')
            ->orWhere('email', '')
            ->orderBy('id')
            ->get(['id'])
            ->each(function ($row) {
                DB::table('staff')->where('id', $row->id)->update([
                    'email'      => "staff-{$row->id}@placeholder.local",
                    'updated_at' => now(),
                ]);
            });

        DB::statement('ALTER TABLE `staff` MODIFY `email` VARCHAR(255) NOT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('staff')) return;
        if (! Schema::hasColumn('staff', 'email')) return;

        DB::statement('ALTER TABLE `staff` MODIFY `email` VARCHAR(255) NULL');
    }
};
