<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
use App\Support\AuthCookie;
use App\Support\TemplateDefaults;
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
    /**
     * The editor is served from app.bkrdy.me AND the bkrdy.me apex. If a
     * user kicks off Google sign-in from the apex, we want to bounce them
     * BACK to the apex post-callback instead of stranding them on the app
     * subdomain. The base for each request comes from the redirect call's
     * Referer header (or an explicit ?app_base= query param) and is signed
     * into the OAuth state envelope so the callback can read it back out
     * without trusting the user-controlled URL.
     *
     * Any base not in this allowlist falls back to DEFAULT_APP_BASE — an
     * attacker can't redirect tokens to evil.com by mutating the envelope
     * because the base is HMAC-signed alongside intent/payload/nonce/exp.
     */
    private const APP_BASES = [
        'https://app.bkrdy.me',
        'https://bkrdy.me',
        'https://app.daysbookings.site',
    ];
    private const DEFAULT_APP_BASE  = 'https://app.bkrdy.me';
    private const STATE_TTL_SECONDS = 600;   // 10 minutes
    private const CODE_TTL_SECONDS  = 60;    // exchange window

    public function __construct(
        private readonly TenantProvisioningService $provisioner,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        $intent  = $request->query('intent', 'signin');
        $payload = (string) $request->query('payload', '');
        // Detect where the user kicked the flow off from (apex vs app
        // subdomain) so we can land them back on the same surface after
        // the Google round-trip.
        $base    = $this->detectBase($request);

        if (! $this->credentialsConfigured()) {
            return $this->errorBack($intent, 'Google sign-in is not configured. Contact support.', $base);
        }

        // Phase S4 — mint signed state with a single-use nonce. The nonce
        // is parked in cache and burned on callback to defeat replay.
        $state = $this->mintState($intent === 'signup' ? 'signup' : 'signin', $payload, $base);

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

    /**
     * Pick the base URL to land the user on post-callback. Prefers an
     * explicit ?app_base= query param (frontend can set it for certainty),
     * falls back to the Origin/Referer header from the kickoff request,
     * defaults to DEFAULT_APP_BASE.
     */
    private function detectBase(Request $request): string
    {
        $explicit = (string) $request->query('app_base', '');
        if ($explicit !== '') {
            return $this->resolveBase($explicit);
        }

        foreach (['Origin', 'Referer'] as $header) {
            $value = $request->headers->get($header);
            if (! is_string($value) || $value === '') continue;
            $parts = parse_url($value);
            if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) continue;
            $candidate = rtrim(strtolower($parts['scheme'] . '://' . $parts['host']), '/');
            if (in_array($candidate, self::APP_BASES, true)) return $candidate;
        }

        return self::DEFAULT_APP_BASE;
    }

    /**
     * Match a candidate base against APP_BASES. Anything not on the
     * allowlist becomes DEFAULT_APP_BASE so a tampered envelope or
     * malformed Referer can never redirect the auth payload to a
     * third-party origin.
     */
    private function resolveBase(?string $candidate): string
    {
        if (! is_string($candidate) || $candidate === '') return self::DEFAULT_APP_BASE;
        $normalized = rtrim(strtolower(trim($candidate)), '/');
        return in_array($normalized, self::APP_BASES, true)
            ? $normalized
            : self::DEFAULT_APP_BASE;
    }

    public function callback(Request $request): RedirectResponse
    {
        // Decode + verify our signed state envelope FIRST. Forged or
        // replayed callbacks bounce here.
        $stateRaw = (string) $request->query('state', '');
        $envelope = $this->verifyState($stateRaw);
        $intent   = $envelope['intent'] ?? 'signin';
        // Pull the kickoff surface out of the envelope. resolveBase()
        // returns DEFAULT_APP_BASE if the envelope is missing/invalid,
        // so even errorBack on a tampered state lands somewhere sane.
        $base     = $this->resolveBase($envelope['base'] ?? null);

        if (! $this->credentialsConfigured()) {
            return $this->errorBack($intent, 'Google sign-in is not configured. Contact support.', $base);
        }

        // Surface Google's error param (e.g. user clicked "Cancel") cleanly.
        if ($request->query('error')) {
            return $this->errorBack($intent, (string) $request->query('error'), $base);
        }

        // Short-circuit on missing code — happens when someone hits the
        // callback URL directly (refresh, bookmark, bot). Avoids a noisy
        // Socialite exception + WARN log for non-error traffic.
        if (! $request->filled('code')) {
            return $this->errorBack($intent, 'Sign-in didn’t complete. Please start again.', $base);
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
            return $this->errorBack($intent, 'Sign-in didn’t complete. Please start again.', $base);
        }

        try {
            $google = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed', ['error' => $e->getMessage()]);
            return $this->errorBack($intent, 'Could not complete Google sign-in.', $base);
        }

        $email = strtolower((string) ($google->getEmail() ?? ''));
        if ($email === '') {
            return $this->errorBack($intent, 'Google did not share an email.', $base);
        }

        $existing = User::where('email', $email)->first();

        if ($intent === 'signup') {
            return $this->handleSignup($google, $email, $existing, $envelope['payload'] ?? '', $base);
        }

        return $this->handleSignin($google, $email, $existing, $base);
    }

    // ── Sign-in (existing account) ───────────────────────────────────────

    private function handleSignin($google, string $email, ?User $user, string $base): RedirectResponse
    {
        if (! $user) {
            return $this->errorBack('signin',
                'No BookReady account uses this Google email. Sign up first.',
                $base,
            );
        }

        // Phase S6 part 2 — Google has verified the email on its end, so
        // a password-signup-then-Google-sign-in user gets retroactively
        // marked verified. No-op for already-verified accounts.
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        return $this->finishWithUser($user, 'google-oauth', $base);
    }

    // ── Sign-up (new tenant) ─────────────────────────────────────────────

    private function handleSignup($google, string $email, ?User $existing, string $rawPayload, string $base): RedirectResponse
    {
        if ($existing) {
            return $this->errorBack('signup',
                'An account already exists for this Google email. Sign in instead.',
                $base,
            );
        }

        // Signup redesign v2 — Google signup no longer collects business
        // name or template up-front. Create the User + SignupDraft row,
        // stamp email_verified_at (Google already verified), and let
        // /auth/me redirect_url route the user to /signup/business on
        // next nav. /register/complete is no longer used.
        $ownerName = trim((string) $google->getName())
            ?: explode('@', $email, 2)[0];
        $ownerName = mb_substr($ownerName, 0, 100);

        // Google users don't pick a password — generate a strong random
        // one. They can sign in via Google going forward, or set a real
        // password from Settings → Account.
        $generatedPassword = Str::random(32);

        try {
            $owner = \Illuminate\Support\Facades\DB::transaction(function () use ($email, $ownerName, $generatedPassword) {
                $owner = User::create([
                    'name'              => $ownerName,
                    'email'             => $email,
                    'password'          => \Illuminate\Support\Facades\Hash::make($generatedPassword),
                    'tenant_id'         => null,
                    'is_owner'          => true,
                    'email_verified_at' => now(),
                    'terms_accepted_at' => now(),
                    'terms_version'     => \App\Http\Controllers\Api\Auth\RegisterController::TERMS_VERSION,
                ]);
                if (\Illuminate\Support\Facades\Schema::hasTable('signup_drafts')) {
                    \App\Models\SignupDraft::create(['user_id' => $owner->id]);
                }
                return $owner;
            });
        } catch (\Throwable $e) {
            Log::error('Google signup failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            return $this->errorBack('signup', 'Could not finish creating your account. Try again.', $base);
        }

        // Welcome email moves to /signup/website provisioning so the
        // copy can lean into the real site URL ("Your site is live at
        // …"). At this point we don't have one yet.

        return $this->finishWithUser($owner, 'google-oauth-signup', $base);
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
            'handoff'        => 'required|string|size:40',
            'business_name'  => 'required|string|min:1|max:100',
            // Pre-launch (#117): explicit ToS acceptance — same gate as
            // the email signup endpoint. Required because the deferred-
            // name Google flow can land here without going through the
            // /register form, so we must collect consent on this screen
            // too. See web/app/register/complete/page.tsx.
            'terms_accepted' => ['required', 'accepted'],
            // Optional template chosen on /register/complete. normalizeSlug
            // validates it; an unknown value falls back to the cached pick
            // (then the default), so a loose rule here is safe.
            'template'       => ['sometimes', 'string', 'max:40'],
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
        // Prefer the template the user picked on /register/complete; fall
        // back to the one stashed in the handoff cache pre-OAuth, then the
        // default. normalizeSlug validates + degrades unknown values.
        $template     = TemplateDefaults::normalizeSlug(
            $validated['template'] ?? ($identity['template'] ?? null)
        );

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
            // Burn the handoff token so a failed-state cache entry can't be
            // replayed during its 15-minute TTL. Provision() already rolled
            // back the orphan central rows it created (compensating cleanup
            // in TenantProvisioningService), so the user can simply retry
            // signup from the start; we don't want the stale token in the
            // way. NOTE: only forget on this post-provision path — the
            // earlier 410/409 returns handle their own cache state.
            Cache::forget($cacheKey);
            return response()->json([
                'message' => 'Could not finish creating your workspace. Try again.',
            ], 500);
        }

        // Phase S6 part 2 — Google verified the email; mark verified.
        // Pre-launch (#117) — same save also stamps ToS acceptance so we
        // can prove what version of /terms the user agreed to.
        $owner->email_verified_at = now();
        $owner->terms_accepted_at = now();
        $owner->terms_version     = RegisterController::TERMS_VERSION;
        $owner->save();

        // #159 — Create the unified identity row so password resets +
        // role pickers work later. Without this, the User has identity_id
        // = NULL, and AuthController::login + isBillingSetup either
        // misfire or fall through to legacy heuristics. Random password
        // mirrors the one stamped on $owner above. Guarded by Schema
        // check so the controller stays bootable on environments where
        // the identities migration hasn't run.
        if (\Illuminate\Support\Facades\Schema::hasTable('identities')) {
            $identityId = \Illuminate\Support\Facades\DB::table('identities')->insertGetId([
                'email'             => strtolower($owner->email),
                'password'          => $owner->password, // already-hashed Str::random(32)
                'name'              => $owner->name,
                'phone'             => null,
                'email_verified_at' => $owner->email_verified_at,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
            \Illuminate\Support\Facades\DB::table('users')->where('id', $owner->id)->update([
                'identity_id' => $identityId,
                'updated_at'  => now(),
            ]);
        }

        // One-shot: this handoff token must never be replayable.
        Cache::forget($cacheKey);

        PlatformMailer::sendWelcome(
            ownerEmail:   $owner->email,
            ownerName:    $owner->name,
            businessName: $businessName,
        );

        $token = $owner->createToken(
            'google-oauth-signup',
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        // The bearer token is only sent as an httpOnly cookie.
        $response = response()
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
            ->withCookie(AuthCookie::make($token));

        // Phase S6+ — only attach legacy-domain delete when an old cookie
        // is actually present. See AuthController::login.
        if ($request->cookies->has(AuthCookie::NAME)) {
            $response->withCookie(AuthCookie::forgetLegacySharedDomain());
        }

        return $response;
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
        $response = response()
            ->json($payload['response'])
            ->withCookie(AuthCookie::make((string) $payload['token']));

        // Phase S6+ — only attach legacy-domain delete when an old cookie
        // is actually present. See AuthController::login.
        if ($request->cookies->has(AuthCookie::NAME)) {
            $response->withCookie(AuthCookie::forgetLegacySharedDomain());
        }

        return $response;
    }

    // ── Shared finalization ──────────────────────────────────────────────

    private function finishWithUser(User $user, string $tokenName, string $base): RedirectResponse
    {
        $token = $user->createToken(
            $tokenName,
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

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

        return redirect()->away($base . '/auth/google/complete?code=' . $code);
    }

    // ── State signing / verification ─────────────────────────────────────

    /**
     * Mint a signed state envelope:
     *   base64url( JSON({ intent, payload, base, nonce, exp, sig }) )
     * where sig = HMAC-SHA256(intent + "|" + payload + "|" + base + "|" + nonce + "|" + exp, APP_KEY)
     *
     * The nonce is stored in cache for STATE_TTL_SECONDS and burned on
     * verify so a captured state cannot be replayed. `base` is the
     * post-callback return URL captured from the kickoff request's Origin
     * or Referer; signing it prevents tampering that could redirect tokens
     * to a third-party origin.
     */
    private function mintState(string $intent, string $payload, string $base): string
    {
        $nonce = Str::random(32);
        $exp   = time() + self::STATE_TTL_SECONDS;
        $sig   = $this->signState($intent, $payload, $base, $nonce, $exp);

        Cache::put("google_oauth_nonce:{$nonce}", true, self::STATE_TTL_SECONDS);

        $json = json_encode([
            'intent'  => $intent,
            'payload' => $payload,
            'base'    => $base,
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
     * @return array{intent?: string, payload?: string, base?: string, nonce?: string}
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
        $base    = (string) ($decoded['base']    ?? '');
        $nonce   = (string) ($decoded['nonce']   ?? '');
        $exp     = (int)    ($decoded['exp']     ?? 0);
        $sig     = (string) ($decoded['sig']     ?? '');

        if ($nonce === '' || $sig === '' || $exp <= time()) return [];

        $expected = $this->signState($intent, $payload, $base, $nonce, $exp);
        if (! hash_equals($expected, $sig)) return [];

        // Single-use: pop the nonce. If it's already gone, this is a replay.
        $cacheKey = "google_oauth_nonce:{$nonce}";
        if (! Cache::has($cacheKey)) return [];
        Cache::forget($cacheKey);

        return [
            'intent'  => $intent,
            'payload' => $payload,
            'base'    => $base,
            'nonce'   => $nonce,
        ];
    }

    private function signState(string $intent, string $payload, string $base, string $nonce, int $exp): string
    {
        $key = (string) config('app.key');
        return hash_hmac('sha256', "{$intent}|{$payload}|{$base}|{$nonce}|{$exp}", $key);
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

    private function errorBack(string $intent, string $message, string $base = self::DEFAULT_APP_BASE): RedirectResponse
    {
        $dest = $intent === 'signup' ? '/register' : '/login';
        return redirect()->away($base . $dest . '?google_error=' . urlencode($message));
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
