<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->string('email')->nullable()->after('bio');
            $table->string('phone', 50)->nullable()->after('email');
            $table->index('is_active');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['sort_order']);
            $table->dropColumn(['email', 'phone']);
        });
    }
};
