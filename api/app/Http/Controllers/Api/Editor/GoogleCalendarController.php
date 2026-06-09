<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\GoogleCalendarSyncService;
use App\Support\BookingUrls;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * T1.4 — owner-facing Google Calendar OAuth + sync management.
 *
 * Surface:
 *   GET   /editor/integrations/google-calendar/start      — kick off the
 *                                                           OAuth flow.
 *                                                           Mints a signed
 *                                                           state envelope
 *                                                           (mirrors
 *                                                           GoogleAuthController),
 *                                                           returns the URL
 *                                                           to redirect to.
 *   GET   /api/v1/integrations/google-calendar/callback   — public Google
 *                                                           callback (NOT
 *                                                           in the editor
 *                                                           prefix; same
 *                                                           tier as the
 *                                                           sign-in callback).
 *   GET   /editor/integrations/google-calendar            — status.
 *   GET   /editor/integrations/google-calendar/calendars  — list the owner's
 *                                                           writable calendars
 *                                                           (for the picker).
 *   POST  /editor/integrations/google-calendar/calendar   — pick a calendar.
 *   POST  /editor/integrations/google-calendar/disconnect — revoke + wipe
 *                                                           pushed events.
 *
 * Important: this is a SEPARATE OAuth flow from sign-in. We ask for
 * `calendar.events.owned` here, not on sign-in, so users aren't surprised
 * by a "we need access to your calendar" prompt when they just want to log
 * in. The two flows share Google client_id/secret but use DIFFERENT
 * redirect URIs (the existing one stays on /api/v1/auth/google/callback;
 * this one lands on /api/v1/integrations/google-calendar/callback).
 */
class GoogleCalendarController extends Controller
{
    private const STATE_TTL_SECONDS = 600;
    private const CALENDAR_SCOPE    = 'https://www.googleapis.com/auth/calendar.events.owned';
    private const READONLY_SCOPE    = 'https://www.googleapis.com/auth/calendar.readonly';

    /**
     * On a fresh connect, push the next N days of upcoming appointments
     * so the owner sees historic context immediately.
     */
    private const BACKFILL_HORIZON_DAYS = 30;

    /** Where Google posts the OAuth callback. */
    private function redirectUri(): string
    {
        return (string) config(
            'services.google.calendar_redirect_uri',
            'https://api.bkrdy.me/api/v1/integrations/google-calendar/callback',
        );
    }

    public function __construct(private readonly GoogleCalendarSyncService $sync) {}

    // ── Status ────────────────────────────────────────────────────────────

    /**
     * GET /editor/integrations/google-calendar
     *
     * Returns the owner's connection state. Frontend renders 4 shapes:
     *   not_connected   — show Connect button
     *   active          — show "Connected as X · Calendar: Y" + Disconnect
     *   action_required — show "Reconnect" (refresh_token revoked)
     *   coming_soon     — when the central migration hasn't run; never in prod
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) return response()->json(['message' => 'Not signed in.'], 401);

        if (! Schema::hasTable('google_calendar_integrations')) {
            return response()->json(['status' => 'coming_soon']);
        }

        $row = GoogleCalendarSyncService::forOwner((int) $user->id);
        if (! $row) {
            return response()->json([
                'status'        => 'not_connected',
                'connect_url'   => $this->buildConnectUrl((int) $user->id),
            ]);
        }

        return response()->json([
            'status'          => $row->needs_reconnect ? 'action_required' : 'active',
            'google_email'    => $row->google_email,
            'calendar_id'     => $row->calendar_id,
            'calendar_name'   => $row->calendar_name,
            'last_sync_at'    => $row->last_sync_at,
            'connected_at'    => $row->connected_at,
            // The reconnect URL is the same as connect — Google's consent
            // screen will rebuild the grant with a fresh refresh_token
            // when `prompt=consent` forces re-authorization.
            'connect_url'     => $this->buildConnectUrl((int) $user->id),
        ]);
    }

    // ── Connect flow ─────────────────────────────────────────────────────

    /**
     * GET /editor/integrations/google-calendar/start
     *
     * Returns the Google authorize URL with a signed state envelope.
     * Frontend window.location.href to it.
     */
    public function start(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) return response()->json(['message' => 'Not signed in.'], 401);

        if (empty(config('services.google.client_id')) || empty(config('services.google.client_secret'))) {
            return response()->json([
                'message' => 'Google sign-in is not configured. Contact support.',
            ], 500);
        }

        return response()->json([
            'connect_url' => $this->buildConnectUrl((int) $user->id),
        ]);
    }

    private function buildConnectUrl(int $userId): string
    {
        $state = $this->mintState($userId);
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
            'client_id'              => (string) config('services.google.client_id'),
            'redirect_uri'           => $this->redirectUri(),
            'response_type'          => 'code',
            // Both scopes: events.owned to push appointments, readonly to
            // list the owner's calendars in the picker UI.
            'scope'                  => self::CALENDAR_SCOPE . ' ' . self::READONLY_SCOPE,
            // access_type=offline = refresh_token in the response.
            'access_type'            => 'offline',
            // prompt=consent FORCES the consent screen so we get a fresh
            // refresh_token (Google only emits it the first time per app
            // unless re-consented). Required on reconnect when needs_reconnect
            // is flipped — otherwise Google sends back the same dead grant.
            'prompt'                 => 'consent',
            'include_granted_scopes' => 'true',
            'state'                  => $state,
        ]);
    }

    /**
     * GET /api/v1/integrations/google-calendar/callback  (public route)
     *
     * Google posts here after the owner consents. We swap the code for an
     * access + refresh token, verify the signed state, persist the
     * integration row, then redirect back to the integrations page with
     * a success/failure flag.
     */
    public function callback(Request $request): RedirectResponse
    {
        $base       = 'https://app.bkrdy.me';
        $errorBack  = fn (string $msg) => redirect()->away($base . '/editor/integrations?gcal_error=' . urlencode($msg));

        if ($request->query('error')) {
            return $errorBack((string) $request->query('error'));
        }

        $stateRaw = (string) $request->query('state', '');
        $envelope = $this->verifyState($stateRaw);
        if ($envelope === [] || empty($envelope['user_id'])) {
            return $errorBack('Sign-in didn’t complete. Please start again.');
        }
        $userId = (int) $envelope['user_id'];

        $code = (string) $request->query('code', '');
        if ($code === '') return $errorBack('Sign-in didn’t complete. Please start again.');

        // Exchange the code for tokens.
        $tokenResp = Http::asForm()
            ->timeout(10)
            ->post('https://oauth2.googleapis.com/token', [
                'code'          => $code,
                'client_id'     => (string) config('services.google.client_id'),
                'client_secret' => (string) config('services.google.client_secret'),
                'redirect_uri'  => $this->redirectUri(),
                'grant_type'    => 'authorization_code',
            ]);
        if (! $tokenResp->successful()) {
            Log::warning('gcal.callback token exchange failed', [
                'user_id' => $userId, 'status' => $tokenResp->status(),
                'error'   => $tokenResp->json('error'),
            ]);
            return $errorBack('Could not finish connecting Google Calendar.');
        }

        $accessToken  = (string) $tokenResp->json('access_token', '');
        $refreshToken = (string) $tokenResp->json('refresh_token', '');
        $expiresIn    = (int)    $tokenResp->json('expires_in', 3600);

        // No refresh_token = Google didn't grant offline access. Without it
        // we can't do background sync past the first hour. Bail.
        if ($refreshToken === '') {
            return $errorBack('Google didn’t grant the needed permissions. Please try again and allow background access.');
        }

        // Pull the Google account identity (sub + email) so we can display
        // "Connected as carreno@gmail.com" + detect account changes.
        $userInfo = Http::withToken($accessToken)
            ->timeout(5)
            ->get('https://www.googleapis.com/oauth2/v3/userinfo');
        if (! $userInfo->successful()) {
            return $errorBack('Could not read your Google account. Please try again.');
        }
        $googleSub   = (string) $userInfo->json('sub', '');
        $googleEmail = (string) $userInfo->json('email', '');

        // Upsert the integration row. Encryption happens in the service.
        $existing = DB::connection('mysql')->table('google_calendar_integrations')
            ->where('user_id', $userId)
            ->first();

        // Detect account switch — if the new google_sub differs from the
        // stored one, this is a NEW Google account, not a reconnect of
        // the same one. We must wipe all gcal_event_ids in the user's
        // tenant DB, otherwise update/delete calls would target events
        // that don't exist in the new account.
        if ($existing && $existing->google_sub !== $googleSub) {
            $this->wipeGcalEventIdsForOwner($userId);
        }

        $tokenExpiresAt = now()->addSeconds($expiresIn);
        // Fail closed: if APP_KEY is rotated/broken, encrypt() throws and
        // we MUST NOT persist a long-lived bearer credential (refresh
        // token) in plaintext. Abort the OAuth flow so the operator
        // notices and fixes APP_KEY before any owner gets a half-broken
        // connection. The owner just retries connect after the ops fix.
        try {
            $accessEnc  = encrypt($accessToken);
            $refreshEnc = encrypt($refreshToken);
        } catch (\Throwable $e) {
            Log::error('gcal.callback encrypt failed — refusing to persist plaintext tokens', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
            return $errorBack('Could not securely store your Google connection. Please try again or contact support.');
        }

        if ($existing) {
            DB::connection('mysql')->table('google_calendar_integrations')
                ->where('id', $existing->id)
                ->update([
                    'google_sub'       => $googleSub,
                    'google_email'    => $googleEmail,
                    'refresh_token'   => $refreshEnc,
                    'access_token'    => $accessEnc,
                    'token_expires_at'=> $tokenExpiresAt,
                    'needs_reconnect' => false,
                    'updated_at'      => now(),
                    // If account switched, also reset calendar choice to primary.
                    'calendar_id'     => $existing->google_sub === $googleSub ? $existing->calendar_id : 'primary',
                    'calendar_name'   => $existing->google_sub === $googleSub ? $existing->calendar_name : null,
                ]);
        } else {
            DB::connection('mysql')->table('google_calendar_integrations')->insert([
                'user_id'         => $userId,
                'google_sub'      => $googleSub,
                'google_email'    => $googleEmail,
                'refresh_token'   => $refreshEnc,
                'access_token'    => $accessEnc,
                'token_expires_at'=> $tokenExpiresAt,
                'calendar_id'     => 'primary',
                'connected_at'    => now(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        // Kick off a best-effort backfill of the next 30 days. Inline rather
        // than queued — the owner is sitting on the redirect page and will
        // see the events appear within ~10s. A queue would be cleaner but
        // isn't shipped yet (#141).
        $this->backfillUpcoming($userId);

        return redirect()->away($base . '/editor/integrations?gcal_connected=1');
    }

    // ── Calendar picker ──────────────────────────────────────────────────

    /**
     * GET /editor/integrations/google-calendar/calendars
     *
     * List the owner's writable calendars. The frontend renders this as
     * a picker — owner can route bookings to a dedicated "BookReady"
     * calendar instead of cluttering their primary.
     */
    public function listCalendars(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) return response()->json(['message' => 'Not signed in.'], 401);

        $integration = GoogleCalendarSyncService::forOwner((int) $user->id);
        if (! $integration) {
            return response()->json(['message' => 'Google Calendar isn’t connected.'], 404);
        }

        $calendars = $this->sync->listCalendars($integration);
        if ($calendars === null) {
            return response()->json([
                'message' => 'Could not load your calendars. Reconnect Google Calendar.',
            ], 502);
        }

        return response()->json([
            'calendars'         => $calendars,
            'selected_calendar' => $integration->calendar_id,
        ]);
    }

    /**
     * POST /editor/integrations/google-calendar/calendar
     * { calendar_id: string, calendar_name?: string }
     *
     * Swap the target calendar. CRITICAL: must sweep the old calendar's
     * pushed events + wipe gcal_event_ids in the tenant DB BEFORE updating
     * integration.calendar_id. Otherwise subsequent cancel/reschedule
     * would PATCH/DELETE against the new calendar where the stored event
     * id doesn't exist (Google 404 → we treat as success → owner has
     * stale events stuck in the old calendar forever).
     *
     * No-op when the owner picks the same calendar they're already on.
     */
    public function setCalendar(Request $request): JsonResponse
    {
        $v = $request->validate([
            'calendar_id'   => 'required|string|max:255',
            'calendar_name' => 'sometimes|nullable|string|max:255',
        ]);

        $user = $request->user();
        if (! $user) return response()->json(['message' => 'Not signed in.'], 401);

        $integration = GoogleCalendarSyncService::forOwner((int) $user->id);
        if (! $integration) {
            return response()->json(['message' => 'Google Calendar isn’t connected.'], 404);
        }

        // Same calendar = no-op (avoid wasted sweeps if the owner re-saves
        // the picker without changing anything).
        if (($integration->calendar_id ?? null) === $v['calendar_id']) {
            // Still allow updating the display name.
            if (array_key_exists('calendar_name', $v)) {
                DB::connection('mysql')->table('google_calendar_integrations')
                    ->where('id', $integration->id)
                    ->update(['calendar_name' => $v['calendar_name'], 'updated_at' => now()]);
            }
            return response()->json(['ok' => true, 'unswept_events' => 0]);
        }

        // Sweep events from the OLD calendar (uses integration's current
        // calendar_id under the hood) + wipe ids in the tenant DB so the
        // next lifecycle event creates fresh events in the new calendar.
        $sweep = $this->deletePushedEventsForOwner($integration);
        $this->wipeGcalEventIdsForOwner((int) $user->id);

        DB::connection('mysql')->table('google_calendar_integrations')
            ->where('id', $integration->id)
            ->update([
                'calendar_id'   => $v['calendar_id'],
                'calendar_name' => $v['calendar_name'] ?? null,
                'updated_at'    => now(),
            ]);

        // Surface unswept count + recovery URL for the same reason as
        // disconnect() does: long-tenured owners with thousands of
        // synced events get a capped sweep + manual-revoke hint.
        if ($sweep['unswept'] > 0) {
            return response()->json([
                'ok'                => true,
                'unswept_events'    => $sweep['unswept'],
                'manual_revoke_url' => 'https://myaccount.google.com/permissions',
            ]);
        }
        return response()->json(['ok' => true, 'unswept_events' => 0]);
    }

    // ── Disconnect ───────────────────────────────────────────────────────

    /**
     * POST /editor/integrations/google-calendar/disconnect
     *
     * Best-effort: revoke the refresh_token with Google, delete every
     * event we pushed (so the owner's calendar isn't left littered),
     * then drop the integration row. A partial failure still drops the
     * row — being half-connected is worse than fully disconnected with
     * a few orphan events.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) return response()->json(['message' => 'Not signed in.'], 401);

        $integration = GoogleCalendarSyncService::forOwner((int) $user->id);
        if (! $integration) return response()->json(['ok' => true]);

        // Best-effort: delete the recent pushed events. Capped + budgeted
        // so a long-tenured owner with thousands of synced events doesn't
        // 504 mid-disconnect and end up half-connected. Returns the number
        // of events left unswept so the response can surface a recovery
        // hint instead of silently orphaning them.
        $sweep = $this->deletePushedEventsForOwner($integration);

        // Best-effort: revoke the refresh token at Google. If decrypt
        // fails, skip — sending the encrypted ciphertext would 400 from
        // Google AND log the ciphertext server-side; neither helps.
        try {
            $rt = null;
            try { $rt = decrypt($integration->refresh_token); }
            catch (\Throwable) { /* fall through — skip revoke */ }
            if ($rt) {
                Http::asForm()
                    ->timeout(5)
                    ->post('https://oauth2.googleapis.com/revoke', ['token' => $rt]);
            }
        } catch (\Throwable $e) {
            Log::warning('gcal.disconnect: revoke failed (continuing)', [
                'user_id' => $user->id, 'error' => $e->getMessage(),
            ]);
        }

        DB::connection('mysql')->table('google_calendar_integrations')->where('id', $integration->id)->delete();
        // Clear gcal_event_ids in every tenant DB the owner is in so a
        // future reconnect doesn't try to update stale ids.
        $this->wipeGcalEventIdsForOwner((int) $user->id);

        // Surface unswept-event count so the UI can show "we couldn't
        // clean up N events — remove BookReady from your Google account
        // at https://myaccount.google.com/permissions to revoke fully."
        if ($sweep['unswept'] > 0) {
            return response()->json([
                'ok'              => true,
                'unswept_events'  => $sweep['unswept'],
                'manual_revoke_url' => 'https://myaccount.google.com/permissions',
            ]);
        }
        return response()->json(['ok' => true]);

        return response()->json(['ok' => true]);
    }

    // ── Backfill + cleanup ───────────────────────────────────────────────

    /**
     * Push the next BACKFILL_HORIZON_DAYS days of upcoming appointments
     * to Google. Wraps each appointment in a try so one bad one doesn't
     * stop the rest.
     */
    private function backfillUpcoming(int $userId): void
    {
        $user = User::find($userId);
        if (! $user || ! $user->tenant_id) return;

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return;

        $integration = GoogleCalendarSyncService::forOwner($userId);
        if (! $integration) return;

        try {
            tenancy()->initialize($tenant);

            if (! Schema::hasTable('appointments') || ! Schema::hasColumn('appointments', 'gcal_event_id')) {
                return;
            }

            $today    = now()->format('Y-m-d');
            $horizon  = now()->addDays(self::BACKFILL_HORIZON_DAYS)->format('Y-m-d');
            $businessName    = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $businessAddress = self::composeAddress((array) (DB::table('business_profiles')->first() ?? []));

            $rows = DB::table('appointments')
                ->whereBetween('appointment_date', [$today, $horizon])
                ->whereNotIn('status', ['cancelled'])
                ->whereNull('gcal_event_id')
                ->limit(100) // safety cap
                ->get();

            foreach ($rows as $r) {
                try {
                    $eventId = $this->sync->createEvent($integration, [
                        'id'                => (int) $r->id,
                        'tenant_slug'       => $tenant->id,
                        'appointment_date'  => $r->appointment_date,
                        'start_time'        => $r->start_time,
                        'end_time'          => $r->end_time,
                        'service_name'      => $r->service_name ?? 'Appointment',
                        'customer_name'     => $r->customer_name ?? null,
                        'notes'             => $r->notes ?? null,
                        'business_name'     => $businessName,
                        'business_address'  => $businessAddress,
                        'manage_url'        => BookingUrls::manage($tenant->id, $r->manage_token ?? null),
                    ]);
                    if ($eventId) {
                        DB::table('appointments')
                            ->where('id', $r->id)
                            ->update(['gcal_event_id' => $eventId, 'updated_at' => now()]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('gcal.backfill: one appointment failed', [
                        'appointment_id' => $r->id, 'error' => $e->getMessage(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('gcal.backfill failed', ['user_id' => $userId, 'error' => $e->getMessage()]);
        } finally {
            tenancy()->end();
        }
    }

    /** Hard cap on synchronous delete sweep during disconnect. Past this,
     *  we hand the rest off to the owner via the manual_revoke_url. */
    private const DISCONNECT_SWEEP_MAX_EVENTS  = 200;
    /** Wall-clock budget. Past this, we stop sweeping even under the cap
     *  so we don't 504 mid-disconnect and leave a half-connected state. */
    private const DISCONNECT_SWEEP_MAX_SECONDS = 20;

    /**
     * Walk the owner's tenant DB and delete (most of) the events we've
     * pushed. Returns ['swept' => int, 'unswept' => int]. Bounded by both
     * a count cap AND a wall-clock budget — past either, we stop and
     * report the remainder so the disconnect flow can still revoke +
     * delete the integration row without 504ing.
     *
     * For the long tail, the disconnect response surfaces a manual revoke
     * URL so the owner can wipe BookReady's access in one click on
     * Google's account-permissions page (which also cleans up orphans).
     */
    private function deletePushedEventsForOwner(object $integration): array
    {
        $stats = ['swept' => 0, 'unswept' => 0];

        $user = User::find($integration->user_id);
        if (! $user || ! $user->tenant_id) return $stats;

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return $stats;

        $deadline = microtime(true) + self::DISCONNECT_SWEEP_MAX_SECONDS;
        $stopped  = false;

        try {
            tenancy()->initialize($tenant);

            if (! Schema::hasTable('appointments') || ! Schema::hasColumn('appointments', 'gcal_event_id')) {
                return $stats;
            }

            $remaining = DB::table('appointments')->whereNotNull('gcal_event_id')->count();
            if ($remaining === 0) return $stats;

            // Newest first — the events most likely to still matter to the
            // owner's calendar (upcoming bookings) get swept before old
            // history. Limit caps the page; the wall-clock check inside
            // the loop catches a slow Google before we burn the budget.
            $page = DB::table('appointments')
                ->whereNotNull('gcal_event_id')
                ->orderByDesc('id')
                ->limit(self::DISCONNECT_SWEEP_MAX_EVENTS)
                ->get(['id', 'gcal_event_id']);

            foreach ($page as $r) {
                if (microtime(true) >= $deadline) { $stopped = true; break; }
                try {
                    $this->sync->deleteEvent($integration, $r->gcal_event_id);
                    $stats['swept']++;
                } catch (\Throwable) { /* best-effort per-event */ }
            }

            // Unswept = the original total minus what we actually got to,
            // capped at the rows still bearing a gcal_event_id (the wipe
            // step in disconnect() hasn't run yet at this point).
            $stats['unswept'] = max(0, $remaining - $stats['swept']);
            if ($stopped) {
                Log::warning('gcal.disconnect: sweep stopped on time budget', [
                    'user_id'         => $integration->user_id,
                    'swept'           => $stats['swept'],
                    'unswept'         => $stats['unswept'],
                    'budget_seconds'  => self::DISCONNECT_SWEEP_MAX_SECONDS,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('gcal.disconnect: event sweep failed', [
                'user_id' => $integration->user_id, 'error' => $e->getMessage(),
            ]);
        } finally {
            tenancy()->end();
        }

        return $stats;
    }

    /** NULL out gcal_event_id on every appointment in the owner's tenant. */
    private function wipeGcalEventIdsForOwner(int $userId): void
    {
        $user = User::find($userId);
        if (! $user || ! $user->tenant_id) return;

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return;

        try {
            tenancy()->initialize($tenant);
            if (Schema::hasColumn('appointments', 'gcal_event_id')) {
                DB::table('appointments')
                    ->whereNotNull('gcal_event_id')
                    ->update(['gcal_event_id' => null, 'updated_at' => now()]);
            }
        } catch (\Throwable $e) {
            Log::warning('gcal.wipe gcal_event_id failed', [
                'user_id' => $userId, 'error' => $e->getMessage(),
            ]);
        } finally {
            tenancy()->end();
        }
    }

    private static function composeAddress(array $profile): ?string
    {
        $parts = array_filter([
            $profile['address_line'] ?? null,
            $profile['city']         ?? null,
            $profile['state']        ?? null,
            $profile['zip']          ?? null,
        ], fn ($s) => $s !== null && trim((string) $s) !== '');
        return $parts ? implode(', ', $parts) : null;
    }

    // ── State signing / verification (mirrors GoogleAuthController) ──────

    private function mintState(int $userId): string
    {
        $nonce = Str::random(32);
        $exp   = time() + self::STATE_TTL_SECONDS;
        $sig   = $this->signState($userId, $nonce, $exp);

        Cache::put("gcal_oauth_nonce:{$nonce}", true, self::STATE_TTL_SECONDS);

        $json = json_encode([
            'user_id' => $userId,
            'nonce'   => $nonce,
            'exp'     => $exp,
            'sig'     => $sig,
        ]);
        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    /**
     * @return array{user_id?: int, nonce?: string}
     */
    private function verifyState(string $stateRaw): array
    {
        if ($stateRaw === '') return [];

        $padded = $stateRaw . str_repeat('=', (4 - strlen($stateRaw) % 4) % 4);
        $json   = base64_decode(strtr($padded, '-_', '+/'), true);
        if ($json === false) return [];

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) return [];

        $userId = (int)    ($decoded['user_id'] ?? 0);
        $nonce  = (string) ($decoded['nonce']   ?? '');
        $exp    = (int)    ($decoded['exp']     ?? 0);
        $sig    = (string) ($decoded['sig']     ?? '');

        if ($userId === 0 || $nonce === '' || $sig === '' || $exp <= time()) return [];

        $expected = $this->signState($userId, $nonce, $exp);
        if (! hash_equals($expected, $sig)) return [];

        $cacheKey = "gcal_oauth_nonce:{$nonce}";
        if (! Cache::has($cacheKey)) return [];
        Cache::forget($cacheKey);

        return ['user_id' => $userId, 'nonce' => $nonce];
    }

    private function signState(int $userId, string $nonce, int $exp): string
    {
        $key = (string) config('app.key');
        return hash_hmac('sha256', "gcal|{$userId}|{$nonce}|{$exp}", $key);
    }

}
