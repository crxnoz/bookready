<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Models\Identity;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AuthCookie;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            // #158 — "Remember me" checkbox state from the login form.
            // Defaults to true so legacy callers without the field
            // get today's behavior (14-day cookie, 30-day token).
            'remember' => ['sometimes', 'boolean'],
        ]);

        $email = strtolower(trim((string) $request->email));

        // #159 — unified identity lookup. If migrations have run, we
        // authenticate against `identities` first; otherwise fall
        // back to the legacy users.password column (so a deploy mid-
        // way through the rollout doesn't 401 every session).
        $identity = Schema::hasTable('identities')
            ? Identity::with(['user', 'customerUser'])->where('email', $email)->first()
            : null;

        $user = null;
        $availableRoles = [];

        if ($identity) {
            if (! Hash::check($request->password, $identity->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }
            $availableRoles = $identity->availableRoles();
            // No owner row → owner login endpoint can't issue an owner
            // session. Tell the frontend to route the customer to the
            // customer flow.
            if (! in_array('owner', $availableRoles, true)) {
                return response()->json([
                    'message'         => 'This account is registered as a customer, not a business owner.',
                    'available_roles' => $availableRoles,
                    'try_endpoint'    => '/customer/auth/login',
                ], 422);
            }
            $user = $identity->user;
        } else {
            // Legacy path — pre-#159 row that hasn't been migrated yet,
            // or an environment where identities table doesn't exist.
            $user = User::where('email', $email)->first();
            if (! $user || ! Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }
            // Synthesize available roles by checking the sibling table.
            $availableRoles = ['owner'];
            if (CustomerUser::where('email', $email)->exists()) {
                $availableRoles[] = 'customer';
            }
        }

        // Revoke old tokens if single-session is desired
        // $user->tokens()->delete();

        // #158 — when remember=false, issue a session cookie + a short
        // backstop token TTL so a forgotten browser doesn't leave a
        // 30-day token alive at rest.
        $remember = (bool) $request->boolean('remember', true);

        $token = $user->createToken(
            'api',
            ['*'],
            now()->addMinutes(AuthCookie::tokenTtlMinutes($remember)),
        )->plainTextToken;

        // A5 — compute where this user should land. Login is the canonical
        // single source of truth for "what step are they on?" so that
        // signing back out and in can't bypass verify-email + payment.
        // The frontend trusts redirect_url over its own router.push.
        $emailVerified = (bool) $user->email_verified_at;
        $isBillingSetup = self::isBillingSetup($user);
        $redirectUrl = self::redirectFor($emailVerified, $isBillingSetup);

        // Phase S6 — also set the token as an httpOnly cookie so the
        // frontend doesn't need to stash it in localStorage. The token
        // is not returned in the JSON body.
        $response = response()
            ->json([
                'user' => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'tenant_id' => $user->tenant_id,
                    'is_owner'  => (bool) ($user->is_owner ?? false),
                    'is_admin'  => (bool) ($user->is_admin ?? false),
                ],
                // #159 — available_roles drives the post-login role
                // picker. Single-role users see no picker; multi-role
                // users pick a side every login (per founder decision).
                'available_roles' => $availableRoles,
                'current_role'    => 'owner',
                // A5 — onboarding state. Frontend routes to redirect_url.
                'email_verified'    => $emailVerified,
                'is_billing_setup'  => $isBillingSetup,
                'redirect_url'      => $redirectUrl,
            ])
            ->withCookie(AuthCookie::make($token, $remember));

        // Phase S6+ — only attach the .bkrdy.me-scoped delete cookie when
        // the request actually carries a bookready_token already. Without
        // an incoming cookie there's no legacy state to clean up, and the
        // unconditional Set-Cookie was double-stacking same-named cookies
        // on the response. Recent Chrome (especially incognito) treats the
        // parent-domain delete as a third-party cookie and silently rejects
        // the entire response — surfacing in the SPA as "Failed to fetch"
        // on login submit.
        if ($request->cookies->has(AuthCookie::NAME)) {
            $response->withCookie(AuthCookie::forgetLegacySharedDomain());
        }

        return $response;
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        // Phase S6 — clear the session cookie alongside revoking the token.
        // Without this, the cookie would still be sent on subsequent
        // requests until the browser-side TTL expires, hitting Sanctum
        // with a no-longer-valid token and returning 401s.
        return response()
            ->json(['message' => 'Logged out.'])
            ->withCookie(AuthCookie::forget())
            ->withCookie(AuthCookie::forgetLegacySharedDomain());
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $emailVerified = (bool) $user->email_verified_at;
        $isBillingSetup = self::isBillingSetup($user);

        return response()->json([
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'tenant_id'          => $user->tenant_id,
            'is_owner'           => $user->is_owner,
            'is_admin'           => (bool) ($user->is_admin ?? false),
            // Phase S6 part 2 — frontend nag banner gates on this.
            'email_verified_at'  => $user->email_verified_at?->toAtomString(),
            // A5 — onboarding state. EditorGuard reads these to bounce
            // unverified / cardless users back to the missing step
            // (so a direct nav to /editor can't bypass /verify-email
            // or /checkout/trial).
            'email_verified'     => $emailVerified,
            'is_billing_setup'   => $isBillingSetup,
            'redirect_url'       => self::redirectFor($emailVerified, $isBillingSetup),
        ]);
    }

    /**
     * A5 refinement — has this owner been through /checkout/trial?
     * Only valid signal is trial_acknowledged_at, which is set by
     * EITHER button on that page (Start free trial OR Skip for now).
     *
     * The earlier (stripe_id || subscription_state) heuristic broke
     * because BillingController::startTrial sets both optimistically
     * BEFORE the user finishes Stripe Checkout — a user who bailed
     * mid-flow would have those set and skip the gate on next login.
     *
     * Falls back to the old check when the column doesn't exist
     * (mid-deploy / fresh test envs).
     */
    private static function isBillingSetup(User $user): bool
    {
        if (! $user->tenant_id) return false;
        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return false;
        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'trial_acknowledged_at')) {
            return (bool) $tenant->trial_acknowledged_at;
        }
        // Pre-migration fallback only.
        return (bool) ($tenant->stripe_id || $tenant->subscription_state);
    }

    /**
     * A5 — single source of truth for "what step is this user on?".
     * Called from login + /me so the frontend can't disagree with the
     * backend about where to land. Order matters:
     *   1. Unverified email → /verify-email
     *   2. Verified but no card → /checkout/trial
     *   3. All set → /editor
     */
    private static function redirectFor(bool $emailVerified, bool $isBillingSetup): string
    {
        if (! $emailVerified) return '/verify-email';
        if (! $isBillingSetup) return '/checkout/trial';
        return '/editor';
    }
}
