<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SMS opt-outs are platform-wide: when a customer texts STOP, they're
 * suppressed across every tenant we send for. Matches the carrier
 * expectation that STOP is a one-time deal and TCPA-safe.
 *
 * Inbound webhook handler upserts on STOP; deletes (or marks reverted)
 * on START. The `source` column tracks where the opt-out came from
 * (keyword reply, admin removal, etc.) for auditing.
 *
 * Phone is stored in E.164 (+13125551234). Always normalize before
 * comparing — the SmsService::normalizePhone helper does this.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('sms_optouts', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 20)->unique();
            $t->timestamp('opted_out_at')->useCurrent();
            $t->string('source', 32)->default('inbound_keyword');
            // Optional — which tenant's outbound message triggered the
            // STOP. NOT used for scoping (opt-outs are global); just
            // here so support can answer "which business made them
            // unsubscribe".
            $t->string('tenant_id', 64)->nullable();
            $t->text('note')->nullable();
            $t->timestamps();

            $t->index('opted_out_at');
            $t->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_optouts');
    }
};
