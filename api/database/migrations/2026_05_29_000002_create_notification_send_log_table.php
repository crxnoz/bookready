<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-message log for outbound notifications across every channel and
 * tenant. Two purposes:
 *
 *   1) Cost reporting — sum cost_cents by (tenant_id, channel,
 *      year_month) for the admin usage dashboard and for per-tenant
 *      monthly invoices.
 *   2) Delivery accountability — when a customer says "I never got the
 *      message", support can look up the row and see exactly what
 *      happened (queued / delivered / failed) with the provider id
 *      so they can cross-reference Telnyx's own dashboard if needed.
 *
 * Status lifecycle:
 *
 *   dry_run       — service was called with Telnyx disabled; nothing
 *                   was sent. Useful for local dev and pre-credential
 *                   integration testing.
 *   opted_out     — recipient is on sms_optouts; we suppressed the
 *                   send before hitting Telnyx. Logged so it's
 *                   auditable rather than silently dropped.
 *   queued        — Telnyx returned 200 from /v2/messages. provider_id
 *                   is the Telnyx message id; status will flip to
 *                   sent/delivered/failed via the /status webhook.
 *   sent          — webhook confirms message left Telnyx's network.
 *   delivered     — webhook confirms downstream carrier delivered.
 *   failed        — Telnyx hard-rejected our send (bad number, etc.).
 *   undelivered   — left Telnyx but carrier dropped it (DNC, etc.).
 *
 * Email channel uses the same table with channel='email' so the admin
 * usage dashboard reads from one source.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('notification_send_log', function (Blueprint $t) {
            $t->id();

            $t->string('tenant_id', 64)->nullable();
            $t->string('channel', 8);                  // 'sms' | 'email'
            $t->string('template_key', 64)->nullable();
            $t->string('recipient', 255);              // phone or email
            $t->string('provider', 16);                // 'telnyx' | 'resend'
            $t->string('provider_id', 128)->nullable();
            $t->string('status', 16);                  // see lifecycle above
            $t->integer('cost_cents')->nullable();
            $t->text('error')->nullable();
            // Application metadata (related appointment id, original
            // body length, etc.) for support drill-down.
            $t->json('context')->nullable();
            $t->timestamps();
            // When the provider webhook confirms terminal state we
            // stamp this for time-to-deliver dashboards.
            $t->timestamp('terminal_at')->nullable();

            $t->index(['tenant_id', 'channel', 'created_at']);
            $t->index(['channel', 'status', 'created_at']);
            $t->index('provider_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_send_log');
    }
};
