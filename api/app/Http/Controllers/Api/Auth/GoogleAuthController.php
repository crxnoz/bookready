<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

/**
 * Google OAuth — supports both sign-in (existing accounts) and sign-up
 * (new tenants). Intent + signup metadata flow through the OAuth `state`
 * param so we don't need a server-side session.
 *
 *   /api/v1/auth/google/redirect?intent=signin                          ← default
 *   /api/v1/auth/google/redirect?intent=signup&payload=BASE64(json)     ← sign-up flow
 *
 * Sign-up payload shape (base64 of JSON):
 *   { business_name: string, template?: string, owner_name?: string }
 *
 * Phase S4 security:
 *   - state is HMAC-SHA256 signed with APP_KEY + carries a single-use nonce
 *     cached for 10 minutes. Forged or replayed state callbacks are rejected.
 *   - the final auth payload is NEVER sent back through the URL fragment.
 *     Instead we mint a short-lived single-use exchange code, cache the
 *     payload under it for 60 seconds, and redirect with ?code=. The
 *     frontend POSTs the code to /auth/google/exchange to read the actual
 *     Sanctum token. Eliminates token-in-URL leakage to history / referrer.
 */
class GoogleAuthController extends Controller
{
    private const APP_BASE          = 'https://app.bkrdy.me';
    private const STATE_TTL_SECONDS = 600;   // 10 minutes
    private const CODE_TTL_SECONDS  = 60;    // exchange window

    public function __construct(
        private readonly TenantProvisioningService $provisioner,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        $intent  = $request->query('intent', 'signin');
        $payload = (string) $request->query('payload', '');

        if (! $this->credentialsConfigured()) {
            return $this->errorBack($intent, 'Google sign-in is not configured. Contact support.');
        }

        // Phase S4 — mint signed state with a single-use nonce. The nonce
        // is parked in cache and burned on callback to defeat replay.
        $state = $this->mintState($intent === 'signup' ? 'signup' : 'signin', $payload);

        return Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'profile', 'email'])
            // prompt=select_account makes Google always show the account
            // chooser, so a logged-in-Google user can't accidentally sign
            // up with the wrong identity. Critical for the signup path.
            ->with([
                'state'  => $state,
                'prompt' => 'select_account',
            ])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        // Decode + verify our signed state envelope FIRST. Forged or
        // replayed callbacks bounce here.
        $stateRaw = (string) $request->query('state', '');
        $envelope = $this->verifyState($stateRaw);
        $intent   = $envelope['intent'] ?? 'signin';

        if (! $this->credentialsConfigured()) {
            return $this->errorBack($intent, 'Google sign-in is not configured. Contact support.');
        }

        // Surface Google's error param (e.g. user clicked "Cancel") cleanly.
        if ($request->query('error')) {
            return $this->errorBack($intent, (string) $request->query('error'));
        }

        // Short-circuit on missing code — happens when someone hits the
        // callback URL directly (refresh, bookmark, bot). Avoids a noisy
        // Socialite exception + WARN log for non-error traffic.
        if (! $request->filled('code')) {
            return $this->errorBack($intent, 'Sign-in didn’t complete. Please start again.');
        }

        // Phase S4 — reject when state is missing, tampered, replayed, or
        // expired. Without this, any OAuth callback URL crafted by an
        // attacker could mint a token for the visitor's browser.
        if ($envelope === [] || empty($envelope['nonce'])) {
            Log::channel('security')->warning('oauth.state.invalid', [
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
                'state_len'  => strlen($stateRaw),
            ]);
            return $this->errorBack($intent, 'Sign-in didn’t complete. Please start again.');
        }

        try {
            $google = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed', ['error' => $e->getMessage()]);
            return $this->errorBack($intent, 'Could not complete Google sign-in.');
        }

        $email = strtolower((string) ($google->getEmail() ?? ''));
        if ($email === '') {
            return $this->errorBack($intent, 'Google did not share an email.');
        }

        $existing = User::where('email', $email)->first();

        if ($intent === 'signup') {
            return $this->handleSignup($google, $email, $existing, $envelope['payload'] ?? '');
        }

        return $this->handleSignin($google, $email, $existing);
    }

    // ── Sign-in (existing account) ───────────────────────────────────────

    private function handleSignin($google, string $email, ?User $user): RedirectResponse
    {
        if (! $user) {
            return $this->errorBack('signin',
                'No BookReady account uses this Google email. Sign up first.'
            );
        }

        // Phase S6 part 2 — Google has verified the email on its end, so
        // a password-signup-then-Google-sign-in user gets retroactively
        // marked verified. No-op for already-verified accounts.
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        return $this->finishWithUser($user, 'google-oauth');
    }

    // ── Sign-up (new tenant) ─────────────────────────────────────────────

    private function handleSignup($google, string $email, ?User $existing, string $rawPayload): RedirectResponse
    {
        if ($existing) {
            return $this->errorBack('signup',
                'An account already exists for this Google email. Sign in instead.'
            );
        }

        $payload = $this->decodePayload($rawPayload);
        $businessName = trim((string) ($payload['business_name'] ?? ''));
        $template     = (string) ($payload['template'] ?? 'the-fade-room');
        if (! in_array($template, ['the-fade-room'], true)) {
            $template = 'the-fade-room';
        }

        // No business_name in the payload means the user clicked "Continue
        // with Google" from /register without typing one first. Stash the
        // verified Google identity server-side and bounce them to a small
        // form where they pick the business name and finish provisioning.
        // The cache is the source of truth — the email/name in the URL are
        // only for displaying "Hi Jane".
        if ($businessName === '') {
            $handoff = Str::random(40);
            Cache::put("google_signup:{$handoff}", [
                'email'    => $email,
                'name'     => (string) ($google->getName() ?? ''),
                'sub'      => (string) ($google->getId() ?? ''),
                'template' => $template,
            ], now()->addMinutes(15));

            $qs = http_build_query([
                'handoff' => $handoff,
                'email'   => $email,
                'name'    => (string) ($google->getName() ?? ''),
            ]);
            return redirect()->away(self::APP_BASE . '/register/complete?' . $qs);
        }

        if (strlen($businessName) > 100) {
            return $this->errorBack('signup',
                'Business name is too long (max 100 characters).'
            );
        }

        // Owner name: prefer payload, fall back to Google profile, then email handle.
        $ownerName = trim((string) ($payload['owner_name'] ?? ''))
            ?: trim((string) $google->getName())
            ?: explode('@', $email, 2)[0];
        $ownerName = mb_substr($ownerName, 0, 100);

        // Google users don't pick a password during signup — generate a strong
        // random one. They can sign in via Google going forward, or use the
        // password change flow in Settings → Account to set a real password.
        $generatedPassword = Str::random(32);

        try {
            ['tenant' => $tenant, 'owner' => $owner] = $this->provisioner->provision([
                'owner_name'    => $ownerName,
                'email'         => $email,
                'password'      => $generatedPassword,
                'business_name' => $businessName,
                'template'      => $template,
            ]);
        } catch (\Throwable $e) {
            Log::error('Google signup provisioning failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            return $this->errorBack('signup', 'Could not finish creating your workspace. Try again.');
        }

        // Phase S6 part 2 — Google verified the email, no signup verify
        // round-trip needed. The provisioner doesn't set this column so
        // we stamp it here.
        $owner->email_verified_at = now();
        $owner->save();

        // Best-effort welcome email (never blocks signup).
        PlatformMailer::sendWelcome(
            ownerEmail:   $owner->email,
            ownerName:    $owner->name,
            businessName: $businessName,
        );

        return $this->finishWithUser($owner, 'google-oauth-signup');
    }

    // ── Deferred-name signup completion ──────────────────────────────────

    /**
     * Pair endpoint for the deferred-name Google signup flow. The user
     * clicked "Continue with Google" without typing a business name; the
     * OAuth callback already verified their Google identity and parked it
     * in the cache under {handoff}. This endpoint takes the business name
     * they finally picked, provisions the tenant, and returns the same
     * auth payload as the regular register endpoint.
     *
     * POST /api/v1/auth/google/complete-signup
     *   { handoff: string, business_name: string }
     */
    public function completeSignup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'handoff'       => 'required|string|size:40',
            'business_name' => 'required|string|min:1|max:100',
        ]);

        $cacheKey = "google_signup:{$validated['handoff']}";
        $identity = Cache::get($cacheKey);
        if (! is_array($identity) || empty($identity['email'])) {
            return response()->json([
                'message' => 'Your Google sign-up session expired. Start again.',
            ], 410);
        }

        $email = strtolower((string) $identity['email']);

        // Race-window check: someone could have registered with this email
        // (or via a second Google tab) between the OAuth callback and now.
        if (User::where('email', $email)->exists()) {
            Cache::forget($cacheKey);
            return response()->json([
                'message' => 'An account already exists for this Google email. Sign in instead.',
            ], 409);
        }

        $businessName = trim($validated['business_name']);
        $template     = (string) ($identity['template'] ?? 'the-fade-room');
        if (! in_array($template, ['the-fade-room'], true)) {
            $template = 'the-fade-room';
        }

        $ownerName = trim((string) ($identity['name'] ?? ''))
            ?: explode('@', $email, 2)[0];
        $ownerName = mb_substr($ownerName, 0, 100);

        try {
            ['tenant' => $tenant, 'owner' => $owner] = $this->provisioner->provision([
                'owner_name'    => $ownerName,
                'email'         => $email,
                'password'      => Str::random(32),
                'business_name' => $businessName,
                'template'      => $template,
            ]);
        } catch (\Throwable $e) {
            Log::error('Google deferred-name signup provisioning failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not finish creating your workspace. Try again.',
            ], 500);
        }

        // Phase S6 part 2 — Google verified the email; mark verified.
        $owner->email_verified_at = now();
        $owner->save();

        // One-shot: this handoff token must never be replayable.
        Cache::forget($cacheKey);

        PlatformMailer::sendWelcome(
            ownerEmail:   $owner->email,
            ownerName:    $owner->name,
            businessName: $businessName,
        );

        $token = $owner->createToken('google-oauth-signup')->plainTextToken;

        // The bearer token is only sent as an httpOnly cookie.
        return response()
            ->json([
                'tenant_id' => $owner->tenant_id,
                'user'      => [
                    'id'        => $owner->id,
                    'name'      => $owner->name,
                    'email'     => $owner->email,
                    'tenant_id' => $owner->tenant_id,
                    'is_owner'  => (bool) ($owner->is_owner ?? false),
                    'is_admin'  => (bool) ($owner->is_admin ?? false),
                ],
            ])
            ->withCookie(AuthCookie::make($token))
            ->withCookie(AuthCookie::forgetLegacySharedDomain());
    }

    /**
     * Phase S4 — exchange a short-lived single-use auth code for the real
     * Sanctum token. Replaces the prior URL-fragment scheme.
     *
     * POST /api/v1/auth/google/exchange { code }
     */
    public function exchange(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|size:40',
        ]);

        $cacheKey = "google_auth_code:{$validated['code']}";
        $payload  = Cache::get($cacheKey);
        if (! is_array($payload) || empty($payload['token']) || empty($payload['response'])) {
            return response()->json([
                'message' => 'Sign-in session expired or already used. Please try again.',
            ], 410);
        }

        // Single-use: burn immediately, before returning.
        Cache::forget($cacheKey);

        // Phase S6 — the exchange endpoint is where the actual session
        // starts (the OAuth callback only minted a single-use code). Set
        // the httpOnly session cookie HERE so the frontend doesn't need
        // to store the token from $payload anywhere JS-readable.
        return response()
            ->json($payload['response'])
            ->withCookie(AuthCookie::make((string) $payload['token']))
            ->withCookie(AuthCookie::forgetLegacySharedDomain());
    }

    // ── Shared finalization ──────────────────────────────────────────────

    private function finishWithUser(User $user, string $tokenName): RedirectResponse
    {
        $token = $user->createToken($tokenName)->plainTextToken;

        $response = [
            'tenant_id' => $user->tenant_id,
            'user'      => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'tenant_id' => $user->tenant_id,
                'is_owner'  => (bool) ($user->is_owner ?? false),
                'is_admin'  => (bool) ($user->is_admin ?? false),
            ],
        ];

        // Phase S4 — park the payload under a short-lived single-use code
        // and redirect with ?code=. Never put the token in the URL fragment
        // (it leaks to browser history + referrer headers from any redirect).
        $code = Str::random(40);
        Cache::put("google_auth_code:{$code}", [
            'token'    => $token,
            'response' => $response,
        ], self::CODE_TTL_SECONDS);

        return redirect()->away(self::APP_BASE . '/auth/google/complete?code=' . $code);
    }

    // ── State signing / verification ─────────────────────────────────────

    /**
     * Mint a signed state envelope:
     *   base64url( JSON({ intent, payload, nonce, exp, sig }) )
     * where sig = HMAC-SHA256(intent + "|" + payload + "|" + nonce + "|" + exp, APP_KEY)
     *
     * The nonce is stored in cache for STATE_TTL_SECONDS and burned on
     * verify so a captured state cannot be replayed.
     */
    private function mintState(string $intent, string $payload): string
    {
        $nonce = Str::random(32);
        $exp   = time() + self::STATE_TTL_SECONDS;
        $sig   = $this->signState($intent, $payload, $nonce, $exp);

        Cache::put("google_oauth_nonce:{$nonce}", true, self::STATE_TTL_SECONDS);

        $json = json_encode([
            'intent'  => $intent,
            'payload' => $payload,
            'nonce'   => $nonce,
            'exp'     => $exp,
            'sig'     => $sig,
        ]);
        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    /**
     * Verify + consume a state envelope. Returns the decoded envelope on
     * success or `[]` when the state is missing/tampered/expired/replayed.
     *
     * @return array{intent?: string, payload?: string, nonce?: string}
     */
    private function verifyState(string $stateRaw): array
    {
        if ($stateRaw === '') return [];

        $padded = $stateRaw . str_repeat('=', (4 - strlen($stateRaw) % 4) % 4);
        $json   = base64_decode(strtr($padded, '-_', '+/'), true);
        if ($json === false) return [];

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) return [];

        $intent  = (string) ($decoded['intent']  ?? '');
        $payload = (string) ($decoded['payload'] ?? '');
        $nonce   = (string) ($decoded['nonce']   ?? '');
        $exp     = (int)    ($decoded['exp']     ?? 0);
        $sig     = (string) ($decoded['sig']     ?? '');

        if ($nonce === '' || $sig === '' || $exp <= time()) return [];

        $expected = $this->signState($intent, $payload, $nonce, $exp);
        if (! hash_equals($expected, $sig)) return [];

        // Single-use: pop the nonce. If it's already gone, this is a replay.
        $cacheKey = "google_oauth_nonce:{$nonce}";
        if (! Cache::has($cacheKey)) return [];
        Cache::forget($cacheKey);

        return [
            'intent'  => $intent,
            'payload' => $payload,
            'nonce'   => $nonce,
        ];
    }

    private function signState(string $intent, string $payload, string $nonce, int $exp): string
    {
        $key = (string) config('app.key');
        return hash_hmac('sha256', "{$intent}|{$payload}|{$nonce}|{$exp}", $key);
    }

    /** @return array<string, mixed> */
    private function decodePayload(string $rawPayload): array
    {
        if ($rawPayload === '') return [];
        $json = base64_decode($rawPayload, true);
        if ($json === false) return [];
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function errorBack(string $intent, string $message): RedirectResponse
    {
        $dest = $intent === 'signup' ? '/register' : '/login';
        return redirect()->away(self::APP_BASE . $dest . '?google_error=' . urlencode($message));
    }

    /**
     * True only when both Google OAuth credentials are present in config.
     * Without this guard, an empty client_id sends the user to Google's
     * opaque "invalid_client" page; with it, they bounce back to /login or
     * /register with a clear inline error.
     */
    private function credentialsConfigured(): bool
    {
        return ! empty(config('services.google.client_id'))
            && ! empty(config('services.google.client_secret'));
    }
}
