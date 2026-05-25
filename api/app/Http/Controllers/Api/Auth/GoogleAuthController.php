<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
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
 * Caveat: stateless OAuth means we can't CSRF-validate the state. A
 * tampered state can at worst cause a sign-up with a different business
 * name than the user intended — they'll see the mismatch in the editor
 * and can delete the tenant from the admin area.
 */
class GoogleAuthController extends Controller
{
    private const APP_BASE = 'https://app.bkrdy.me';

    public function __construct(
        private readonly TenantProvisioningService $provisioner,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        $intent  = $request->query('intent', 'signin');
        $payload = (string) $request->query('payload', '');

        $state = base64_encode(json_encode([
            'intent'  => $intent === 'signup' ? 'signup' : 'signin',
            'payload' => $payload,
        ]));

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
        // Decode our state envelope first so we know which flow to run.
        $stateRaw = (string) $request->query('state', '');
        $envelope = $this->decodeState($stateRaw);
        $intent   = $envelope['intent'] ?? 'signin';

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

        // One-shot: this handoff token must never be replayable.
        Cache::forget($cacheKey);

        PlatformMailer::sendWelcome(
            ownerEmail:   $owner->email,
            ownerName:    $owner->name,
            businessName: $businessName,
        );

        $token = $owner->createToken('google-oauth-signup')->plainTextToken;

        return response()->json([
            'token'     => $token,
            'tenant_id' => $owner->tenant_id,
            'user'      => [
                'id'        => $owner->id,
                'name'      => $owner->name,
                'email'     => $owner->email,
                'tenant_id' => $owner->tenant_id,
                'is_owner'  => (bool) ($owner->is_owner ?? false),
                'is_admin'  => (bool) ($owner->is_admin ?? false),
            ],
        ]);
    }

    // ── Shared finalization ──────────────────────────────────────────────

    private function finishWithUser(User $user, string $tokenName): RedirectResponse
    {
        $token = $user->createToken($tokenName)->plainTextToken;

        $payload = [
            'token'     => $token,
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
        $fragment = base64_encode(json_encode($payload));
        return redirect()->away(self::APP_BASE . '/auth/google/complete#' . $fragment);
    }

    // ── State / payload helpers ──────────────────────────────────────────

    /** @return array{intent?: string, payload?: string} */
    private function decodeState(string $stateRaw): array
    {
        if ($stateRaw === '') return [];
        $json = base64_decode($stateRaw, true);
        if ($json === false) return [];
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
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
}
