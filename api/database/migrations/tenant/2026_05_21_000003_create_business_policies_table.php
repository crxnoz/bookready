<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_policies', function (Blueprint $table) {
            $table->id();
            $table->text('cancellation_policy')->nullable();
            $table->text('late_policy')->nullable();
            $table->text('no_show_policy')->nullable();
            $table->text('deposit_policy')->nullable();
            $table->text('reschedule_policy')->nullable();
            $table->text('extra_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_policies');
    }
};
