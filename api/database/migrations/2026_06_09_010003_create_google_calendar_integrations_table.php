<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * T1.4 — per-owner Google Calendar OAuth state + sync metadata.
 *
 * Lives in CENTRAL (alongside users). One row per owner = one connected
 * Google account. Bookings created in any of their tenant DBs are pushed
 * to the single chosen calendar.
 *
 * Columns:
 *   user_id          — FK to users.id. Unique (one Google connection per owner).
 *   google_sub       — the Google account's stable user id (`sub` claim).
 *                      We store it so we can detect if the owner re-connects
 *                      with a DIFFERENT Google account vs the same one
 *                      (different sub → wipe old gcal_event_ids).
 *   google_email     — display only, for the "Connected as carreno@gmail.com"
 *                      line in the UI. The `sub` is the truth.
 *   refresh_token    — long-lived refresh token from the OAuth offline grant.
 *                      Encrypted at rest via Laravel's encrypt() / decrypt()
 *                      helpers (called explicitly in GoogleCalendarController
 *                      + GoogleCalendarSyncService — no Eloquent model + cast
 *                      because we use DB::table() throughout per CLAUDE.md).
 *                      Encryption is FAIL-CLOSED: a broken APP_KEY aborts
 *                      the OAuth callback rather than persisting plaintext.
 *                      Without this, a leaked DB dump would let an attacker
 *                      push events into every owner's Google Calendar until
 *                      each rotated their Google password.
 *   access_token     — short-lived access token. Nullable; refreshed on demand.
 *                      Same encryption posture as refresh_token.
 *   token_expires_at — UTC instant the access_token expires. We refresh
 *                      proactively (30s safety margin) on every push.
 *   calendar_id      — the Google Calendar id bookings sync TO. Defaults to
 *                      'primary' on first connect; owner can pick a different
 *                      calendar via the picker UI.
 *   calendar_name    — display only.
 *   connected_at     — first time this row was created.
 *   last_sync_at     — last successful push/update/delete (null until first).
 *   needs_reconnect  — flipped true when a 401 from Google says the refresh
 *                      token was revoked (user removed the BookReady app
 *                      from their Google account, changed password, etc).
 *                      Surfaces as `action_required` in the editor tile.
 *
 * NULL columns:
 *   - access_token        — refreshed lazily; null between connect + first push.
 *   - token_expires_at    — paired with access_token.
 *   - calendar_name       — cosmetic.
 *   - last_sync_at        — null until first successful sync.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('google_calendar_integrations')) return;

        Schema::create('google_calendar_integrations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('google_sub', 128);
            $table->string('google_email');
            $table->text('refresh_token');              // encrypted via cast
            $table->text('access_token')->nullable();   // encrypted via cast
            $table->timestamp('token_expires_at')->nullable();
            $table->string('calendar_id', 255)->default('primary');
            $table->string('calendar_name')->nullable();
            $table->timestamp('connected_at')->useCurrent();
            $table->timestamp('last_sync_at')->nullable();
            $table->boolean('needs_reconnect')->default(false);
            $table->timestamps();

            // One Google connection per owner — re-connect = upsert.
            $table->unique('user_id');
            $table->index('google_sub');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_calendar_integrations');
    }
};
