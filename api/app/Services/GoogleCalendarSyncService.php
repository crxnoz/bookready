<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * T1.4 — Google Calendar one-way sync (BookReady → Google).
 *
 * Raw HTTP against the Calendar API v3 — no google/apiclient dependency.
 * The full surface we need is just four operations (list, insert, patch,
 * delete) plus the token-refresh + 401-recovery loop. ~250 lines vs
 * pulling in a 200-class SDK.
 *
 * Boundary contract:
 *   - Every method takes an integration ROW (plain stdClass from
 *     google_calendar_integrations) and a value object describing what
 *     to do. Persistent state changes (refreshed access token, last_sync_at,
 *     needs_reconnect flip) are written by THIS service.
 *   - Callers (lifecycle hooks in PublicBookingController etc.) wrap each
 *     call in a try/catch with a quick timeout. A Google failure NEVER
 *     breaks a booking — the appointment lands in the BookReady DB, the
 *     event just doesn't make it to Google. The needs_reconnect flag
 *     drives the editor tile back to `action_required` so the owner
 *     re-authorizes.
 *
 * Timezone handling:
 *   - We send appointments with an explicit IANA `timeZone` field rather
 *     than UTC offsets. The whole codebase pegs to config('app.timezone'),
 *     so all bookings carry the same TZID — Google renders them at the
 *     viewer's local wall time correctly.
 */
class GoogleCalendarSyncService
{
    /** Google Calendar API v3 base. */
    private const API_BASE = 'https://www.googleapis.com/calendar/v3';

    /** Token endpoint. */
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    /** Refresh the access token if it expires within this many seconds. */
    private const REFRESH_SAFETY_SECONDS = 30;

    /** HTTP timeout per call. Best-effort: a slow Google must NEVER block a booking. */
    private const TIMEOUT_SECONDS = 5;

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Create an event for an appointment. Returns the Google event id,
     * or null on any failure (caller logs + persists nothing).
     *
     * @param array $appt {
     *   id: int,
     *   tenant_slug: string,
     *   appointment_date: string Y-m-d,
     *   start_time: string H:i or H:i:s,
     *   end_time: string H:i or H:i:s,
     *   service_name: string,
     *   customer_name: ?string,
     *   notes: ?string,
     *   business_name: ?string,
     *   business_address: ?string,
     *   manage_url: ?string,
     * }
     */
    public function createEvent(object $integration, array $appt): ?string
    {
        $token = $this->freshAccessToken($integration);
        if ($token === null) return null;

        $body = $this->buildEventBody($appt);
        $resp = Http::withToken($token)
            ->timeout(self::TIMEOUT_SECONDS)
            ->post($this->eventsUrl($integration), $body);

        if ($this->is401($resp)) {
            // Refresh-token revoked: flag and bail. The next push won't
            // even try until the owner reconnects.
            $this->markNeedsReconnect($integration);
            return null;
        }
        if (! $resp->successful()) {
            Log::warning('gcal.create failed', [
                'user_id' => $integration->user_id,
                'status'  => $resp->status(),
                'body'    => substr($resp->body(), 0, 500),
            ]);
            return null;
        }

        $this->touchLastSync($integration);
        return $resp->json('id');
    }

    /**
     * Update an existing event. Idempotent — re-patching the same event
     * with the same body is a no-op for Google. Returns true on success.
     */
    public function updateEvent(object $integration, string $eventId, array $appt): bool
    {
        $token = $this->freshAccessToken($integration);
        if ($token === null) return false;

        $body = $this->buildEventBody($appt);
        $resp = Http::withToken($token)
            ->timeout(self::TIMEOUT_SECONDS)
            ->patch($this->eventUrl($integration, $eventId), $body);

        if ($this->is401($resp)) {
            $this->markNeedsReconnect($integration);
            return false;
        }
        if ($resp->status() === 404 || $resp->status() === 410) {
            // The event was deleted out-of-band (owner manually removed
            // it from Google). Treat as success; nothing to do here.
            return true;
        }
        if (! $resp->successful()) {
            Log::warning('gcal.update failed', [
                'user_id'  => $integration->user_id,
                'event_id' => $eventId,
                'status'   => $resp->status(),
            ]);
            return false;
        }

        $this->touchLastSync($integration);
        return true;
    }

    /**
     * Delete an event. Idempotent — a 404/410 is treated as success
     * (already gone). Returns true on success.
     */
    public function deleteEvent(object $integration, string $eventId): bool
    {
        $token = $this->freshAccessToken($integration);
        if ($token === null) return false;

        $resp = Http::withToken($token)
            ->timeout(self::TIMEOUT_SECONDS)
            ->delete($this->eventUrl($integration, $eventId));

        if ($this->is401($resp)) {
            $this->markNeedsReconnect($integration);
            return false;
        }
        // 200/204/404/410 all mean "the event isn't there anymore." Good.
        if ($resp->successful() || $resp->status() === 404 || $resp->status() === 410) {
            $this->touchLastSync($integration);
            return true;
        }

        Log::warning('gcal.delete failed', [
            'user_id'  => $integration->user_id,
            'event_id' => $eventId,
            'status'   => $resp->status(),
        ]);
        return false;
    }

    /**
     * List the owner's writable calendars for the picker UI.
     * Returns an array of [id, summary, primary] or null on failure.
     */
    public function listCalendars(object $integration): ?array
    {
        $token = $this->freshAccessToken($integration);
        if ($token === null) return null;

        $resp = Http::withToken($token)
            ->timeout(self::TIMEOUT_SECONDS)
            ->get(self::API_BASE . '/users/me/calendarList', [
                // Only show calendars the owner can write to.
                'minAccessRole' => 'writer',
            ]);

        if ($this->is401($resp)) {
            $this->markNeedsReconnect($integration);
            return null;
        }
        if (! $resp->successful()) return null;

        return collect($resp->json('items', []))
            ->map(fn ($c) => [
                'id'      => (string) ($c['id']      ?? ''),
                'summary' => (string) ($c['summary'] ?? ''),
                'primary' => (bool)   ($c['primary'] ?? false),
            ])
            ->values()
            ->all();
    }

    // ── Token management ─────────────────────────────────────────────────

    /**
     * Return a non-expired access token, refreshing via the refresh_token
     * if needed. Returns null if the refresh fails (revoked grant, etc) —
     * in which case the integration is also flagged needs_reconnect.
     */
    public function freshAccessToken(object $integration): ?string
    {
        // needs_reconnect short-circuits — no point burning a 401 on Google
        // when we already know the refresh token is dead.
        if ((bool) ($integration->needs_reconnect ?? false)) return null;

        $accessToken    = $this->decrypt($integration->access_token);
        $tokenExpiresAt = $integration->token_expires_at
            ? Carbon::parse($integration->token_expires_at)
            : null;

        $fresh = $accessToken !== null
            && $tokenExpiresAt !== null
            && $tokenExpiresAt->gt(now()->addSeconds(self::REFRESH_SAFETY_SECONDS));
        if ($fresh) return $accessToken;

        $refreshToken = $this->decrypt($integration->refresh_token);
        if (! $refreshToken) {
            $this->markNeedsReconnect($integration);
            return null;
        }

        $resp = Http::asForm()
            ->timeout(self::TIMEOUT_SECONDS)
            ->post(self::TOKEN_URL, [
                'client_id'     => (string) config('services.google.client_id'),
                'client_secret' => (string) config('services.google.client_secret'),
                'refresh_token' => $refreshToken,
                'grant_type'    => 'refresh_token',
            ]);

        if (! $resp->successful()) {
            // 400 with invalid_grant means the refresh token is permanently
            // dead — owner has revoked the app, changed password, or 6-month
            // inactivity expiry kicked in.
            $errorCode = (string) $resp->json('error', '');
            if ($errorCode === 'invalid_grant') {
                $this->markNeedsReconnect($integration);
            }
            Log::warning('gcal.token_refresh failed', [
                'user_id' => $integration->user_id,
                'status'  => $resp->status(),
                'error'   => $errorCode,
            ]);
            return null;
        }

        $newAccess  = (string) $resp->json('access_token', '');
        $expiresIn  = (int)    $resp->json('expires_in', 3600);
        $expiresAt  = now()->addSeconds($expiresIn);

        // Fail closed on encrypt failure: don't persist the access token,
        // but still return it so the current request can complete (the
        // in-memory value is fine for one call). Next call will re-refresh
        // — the refresh_token isn't being mutated here. Critically, we
        // NEVER write a plaintext token to the DB.
        try {
            $accessCipher = encrypt($newAccess);
        } catch (\Throwable $e) {
            Log::error('gcal.token_refresh encrypt failed — serving in-memory only', [
                'user_id' => $integration->user_id,
                'error'   => $e->getMessage(),
            ]);
            // Don't touch in-memory $integration->access_token either —
            // freshAccessToken checks the cached value against the cached
            // expires_at, and we don't want a future call in this same
            // request to think it's valid past its real expiry.
            return $newAccess;
        }

        // Persist the refreshed token. We also update the in-memory $integration
        // so subsequent calls in the same request don't re-refresh.
        DB::connection('mysql')->table('google_calendar_integrations')
            ->where('id', $integration->id)
            ->update([
                'access_token'     => $accessCipher,
                'token_expires_at' => $expiresAt,
                'updated_at'       => now(),
            ]);
        $integration->access_token     = $accessCipher;
        $integration->token_expires_at = $expiresAt;

        return $newAccess;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Look up the integration row for an owner. Returns null if they
     * haven't connected (or were disconnected).
     *
     * CRITICAL: every DB::table('google_calendar_integrations') call in
     * this service uses ->connection('mysql') explicitly because the
     * lifecycle hooks (AppointmentGcalHooks) call us from INSIDE tenant
     * scope, where DatabaseTenancyBootstrapper has swapped the default
     * connection to the tenant DB. An unscoped DB::table(...) would query
     * the tenant DB where this central table doesn't exist, and the
     * hook's outer try/catch would silently swallow the resulting
     * "table not found" exception — the entire feature would no-op in
     * prod with no obvious error. Do NOT remove the ->connection('mysql').
     */
    public static function forOwner(int $userId): ?object
    {
        return DB::connection('mysql')->table('google_calendar_integrations')
            ->where('user_id', $userId)
            ->first();
    }

    /** Build the Calendar v3 event-resource body for an appointment. */
    private function buildEventBody(array $appt): array
    {
        $tz       = (string) config('app.timezone', 'UTC');
        $startDt  = $appt['appointment_date'] . 'T' . $this->pad($appt['start_time']);
        $endDt    = $appt['appointment_date'] . 'T' . $this->pad($appt['end_time']);

        $summary = ($appt['service_name'] ?? 'Appointment')
            . (! empty($appt['customer_name']) ? ' · ' . $appt['customer_name'] : '');

        $descParts = [];
        if (! empty($appt['customer_name'])) $descParts[] = 'Client: ' . $appt['customer_name'];
        if (! empty($appt['service_name']))  $descParts[] = 'Service: ' . $appt['service_name'];
        if (! empty($appt['notes']))         $descParts[] = "\nNotes:\n" . $appt['notes'];
        if (! empty($appt['manage_url']))    $descParts[] = "\nManage booking:\n" . $appt['manage_url'];

        $body = [
            'summary'     => $summary,
            'description' => implode("\n", $descParts),
            'start'       => ['dateTime' => $startDt, 'timeZone' => $tz],
            'end'         => ['dateTime' => $endDt,   'timeZone' => $tz],
            // Source tag — surfaces in Google's "Created by" line so the
            // owner knows which BookReady appointment this is.
            'source' => [
                'title' => 'BookReady',
                'url'   => $appt['manage_url'] ?? 'https://bkrdy.me',
            ],
        ];
        if (! empty($appt['business_address'])) {
            $body['location'] = (string) $appt['business_address'];
        }
        return $body;
    }

    private function eventsUrl(object $integration): string
    {
        return sprintf('%s/calendars/%s/events',
            self::API_BASE,
            rawurlencode($integration->calendar_id ?? 'primary'),
        );
    }

    private function eventUrl(object $integration, string $eventId): string
    {
        return $this->eventsUrl($integration) . '/' . rawurlencode($eventId);
    }

    private function pad(string $time): string
    {
        return substr_count($time, ':') === 1 ? $time . ':00' : $time;
    }

    private function is401(\Illuminate\Http\Client\Response $resp): bool
    {
        // 401 = our access token was rejected. Could be refreshable (token
        // just expired) or permanent (grant revoked). The token-refresh
        // path inside freshAccessToken() handles the disambiguation; if
        // we still see 401 here it means even a fresh access token didn't
        // work — flag for reconnect.
        return $resp->status() === 401;
    }

    private function markNeedsReconnect(object $integration): void
    {
        DB::connection('mysql')->table('google_calendar_integrations')
            ->where('id', $integration->id)
            ->update([
                'needs_reconnect' => true,
                'updated_at'      => now(),
            ]);
        $integration->needs_reconnect = true;
    }

    private function touchLastSync(object $integration): void
    {
        DB::connection('mysql')->table('google_calendar_integrations')
            ->where('id', $integration->id)
            ->update([
                'last_sync_at' => now(),
                // If we get a successful response, clear any prior
                // needs_reconnect — the connection is healthy again.
                'needs_reconnect' => false,
                'updated_at'   => now(),
            ]);
        $integration->last_sync_at    = now();
        $integration->needs_reconnect = false;
    }

    /** Decrypt helper. Returns null if the ciphertext doesn't decrypt
     *  (APP_KEY rotated, corrupted column). The caller treats null as
     *  "we don't have a usable token" and triggers re-auth. */
    private function decrypt(?string $ciphertext): ?string
    {
        if ($ciphertext === null || $ciphertext === '') return null;
        try {
            return decrypt($ciphertext);
        } catch (\Throwable $e) {
            return null;
        }
    }
}
