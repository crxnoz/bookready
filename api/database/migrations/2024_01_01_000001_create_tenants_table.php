<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id')->primary();        // slug / subdomain, e.g. "fade-room"
            $table->string('plan')->default('trial'); // trial | starter | pro | agency
            $table->string('stripe_id')->nullable()->index();
            $table->timestamp('trial_ends_at')->nullable();
            $table->json('data')->nullable();       // stancl/tenancy extra data
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
