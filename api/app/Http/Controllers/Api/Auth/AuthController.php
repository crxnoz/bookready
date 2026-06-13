<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Models\Identity;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AuthCookie;
use App\Support\BillingInternal;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        $emailVerified      = (bool) $user->email_verified_at;
        $onboardingComplete = self::isOnboardingComplete($user);
        $planSelected       = self::isPlanSelected($user);
        $isBillingSetup     = self::isBillingSetup($user);
        $redirectUrl        = self::redirectFor($emailVerified, $onboardingComplete, $planSelected, $isBillingSetup);

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
                    // Wave D — role + staff_id for frontend branching.
                    'role'      => $user->role ?? 'owner',
                    'staff_id'  => $user->staff_id !== null ? (int) $user->staff_id : null,
                ],
                // #159 — available_roles drives the post-login role
                // picker. Single-role users see no picker; multi-role
                // users pick a side every login (per founder decision).
                'available_roles' => $availableRoles,
                'current_role'    => 'owner',
                // Signup-reorder flow signals — frontend routes to redirect_url.
                'email_verified'      => $emailVerified,
                'onboarding_complete' => $onboardingComplete ?? false,
                'plan_selected'       => $planSelected ?? false,
                'is_billing_setup'    => $isBillingSetup,
                'redirect_url'        => $redirectUrl,
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

        $emailVerified      = (bool) $user->email_verified_at;
        $onboardingComplete = self::isOnboardingComplete($user);
        $planSelected       = self::isPlanSelected($user);
        $isBillingSetup     = self::isBillingSetup($user);

        return response()->json([
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'tenant_id'          => $user->tenant_id,
            'is_owner'           => $user->is_owner,
            'is_admin'           => (bool) ($user->is_admin ?? false),
            'role'               => $user->role ?? 'owner',
            'staff_id'           => $user->staff_id !== null ? (int) $user->staff_id : null,
            'email_verified_at'  => $user->email_verified_at?->toAtomString(),
            // Signup-reorder flow signals. EditorGuard + verify-email +
            // register-complete + onboarding-wizard-finish all consume
            // redirect_url verbatim and never hand-route — backend is
            // the single source of truth for ordering.
            'email_verified'     => $emailVerified,
            'onboarding_complete'=> $onboardingComplete,
            'plan_selected'      => $planSelected,
            'is_billing_setup'   => $isBillingSetup,
            'redirect_url'       => self::redirectFor($emailVerified, $onboardingComplete, $planSelected, $isBillingSetup),
            // v2 Theme 1 — every tenant this identity is linked to, so the
            // editor sidebar can render the tenant-switch dropdown. Empty
            // array when the identity has no linkages (single-tenant
            // user) or no identity_id at all (pre-migration users).
            'linked_tenants'     => self::linkedTenantsFor($user),
        ]);
    }

    /**
     * v2 Theme 1 — return the list of tenants this identity has Users
     * at, with the bare minimum the dropdown needs to render. business_name
     * lives in the tenants.data JSON column; we parse it inline so the
     * frontend doesn't need a per-tenant lookup. Pre-multi-tenant rows
     * (no identity_id) get an empty array — the dropdown then collapses
     * to "just this tenant" and is invisible.
     */
    private static function linkedTenantsFor(User $user): array
    {
        if (! $user->identity_id) {
            return [];
        }
        $rows = DB::table('users')
            ->join('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->where('users.identity_id', $user->identity_id)
            ->select(
                'tenants.id as tenant_id',
                'tenants.plan as plan',
                'tenants.data as data',
                'users.role as role',
                'users.is_owner as is_owner',
            )
            ->orderBy('tenants.id')
            ->get();

        return $rows->map(function ($row) use ($user) {
            $data = is_string($row->data) ? (json_decode($row->data, true) ?: []) : [];
            return [
                'tenant_id'     => (string) $row->tenant_id,
                'business_name' => (string) ($data['business_name'] ?? $row->tenant_id),
                'plan'          => is_string($row->plan) ? $row->plan : null,
                'role'          => is_string($row->role) ? $row->role : 'owner',
                'is_owner'      => (bool) $row->is_owner,
                'is_current'    => ((string) $row->tenant_id) === ((string) $user->tenant_id),
            ];
        })->all();
    }

    /**
     * Has this owner been through /checkout/trial? Set by Start trial
     * on that page (the Skip button was killed in the signup-reorder).
     * Internal allowlist short-circuits — no card required ever.
     */
    private static function isBillingSetup(User $user): bool
    {
        if (! $user->tenant_id) return false;
        if (BillingInternal::isInternal($user->email)) return true;
        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return false;
        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'trial_acknowledged_at')) {
            return (bool) $tenant->trial_acknowledged_at;
        }
        return (bool) ($tenant->stripe_id || $tenant->subscription_state);
    }

    /**
     * Signup-reorder — has the owner finished the onboarding wizard?
     * Reads central tenants.onboarding_completed_at (mirrored from
     * business_profiles.onboarding_completed_at when the wizard
     * Finishes — see BusinessProfileController::completeOnboarding).
     * Internal allowlist short-circuits.
     */
    private static function isOnboardingComplete(User $user): bool
    {
        if (! $user->tenant_id) return false;
        if (BillingInternal::isInternal($user->email)) return true;
        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return false;
        if (! \Illuminate\Support\Facades\Schema::hasColumn('tenants', 'onboarding_completed_at')) {
            // Pre-migration fallback: treat as complete so existing
            // live tenants don't get bounced into onboarding.
            return true;
        }
        return (bool) $tenant->onboarding_completed_at;
    }

    /**
     * Signup-reorder — has the owner picked a plan via /checkout/plan?
     * Internal allowlist short-circuits.
     */
    private static function isPlanSelected(User $user): bool
    {
        if (! $user->tenant_id) return false;
        if (BillingInternal::isInternal($user->email)) return true;
        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) return false;
        if (! \Illuminate\Support\Facades\Schema::hasColumn('tenants', 'plan_selected_at')) {
            return true;
        }
        return (bool) $tenant->plan_selected_at;
    }

    /**
     * Signup-reorder — single source of truth for "where should this
     * user be right now?". Order matters; do not reshuffle without
     * updating EditorGuard + the verify-email / register-complete
     * pages that all consume this. Onboarding precedes billing so the
     * owner invests time in their site before being asked for a card.
     */
    private static function redirectFor(
        bool $emailVerified,
        bool $onboardingComplete,
        bool $planSelected,
        bool $isBillingSetup,
    ): string {
        if (! $emailVerified)      return '/verify-email';
        if (! $onboardingComplete) return '/editor/onboard';
        if (! $planSelected)       return '/checkout/plan';
        if (! $isBillingSetup)     return '/checkout/trial';
        return '/editor';
    }
}
