<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Models\Identity;
use App\Models\User;
use App\Support\AuthCookie;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * #159 — Identity-level operations.
 *
 *   POST /auth/switch-role   — swap the active session to the sibling
 *                              role on the same identity. Revokes the
 *                              current Sanctum token, mints a new one
 *                              for the target role, sets the matching
 *                              httpOnly cookie.
 *   POST /auth/identity/link-customer — for "Become a customer" inline
 *                              from the owner dashboard. Creates a
 *                              customer_users row linked to the
 *                              already-authed identity.
 *
 * Tightly auth'd: every call requires a valid bearer (cookie or header)
 * for one of the user's existing roles. Switching from a role you
 * don't have always rejects.
 *
 * Cookie strategy: distinct cookies per role (bookready_token vs
 * bookready_customer_token) so the user can be signed in as both
 * simultaneously in the same browser, just with different "active"
 * dashboards. Switching writes the target cookie + leaves the other
 * cookie alone — that means if a user toggled back, the previous
 * session is still alive on the cookie level. We deliberately keep
 * both cookies viable because cross-app navigation (editor →
 * tenant booking page → back to editor) needs both.
 */
class IdentityController extends Controller
{
    /**
     * Swap to the sibling role. The session must currently be one of
     * `owner` or `customer`; pass the target role in the body.
     */
    public function switchRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => 'required|string|in:owner,customer',
        ]);

        $target = $validated['to'];

        // The auth'd model could be a User OR a CustomerUser depending on
        // the guard that resolved the request. We need the *identity*
        // either way so we can find the sibling row.
        $authedModel = $request->user();
        if (! $authedModel) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $identity = $this->resolveIdentity($authedModel);
        if (! $identity) {
            return response()->json([
                'message' => 'Your account is not linked to a unified identity yet. Sign out and back in to fix.',
            ], 409);
        }

        // Same-role no-op — return a friendly 200 so the frontend can
        // still navigate to the right dashboard without a special case.
        $currentRole = ($authedModel instanceof User) ? 'owner' : 'customer';
        if ($currentRole === $target) {
            return response()->json([
                'message'    => 'Already on this role.',
                'current_role' => $currentRole,
                'redirect_url' => $target === 'owner' ? '/editor' : '/account',
            ]);
        }

        // Target role must exist on this identity.
        if (! $identity->hasRole($target)) {
            return response()->json([
                'message' => $target === 'owner'
                    ? 'You don\'t have a business owner profile on this account yet.'
                    : 'You don\'t have a customer profile on this account yet.',
                'available_roles' => $identity->availableRoles(),
            ], 422);
        }

        // Revoke the current Sanctum token so the cookie we replace
        // can't be reused. The new role gets a fresh 30-day token.
        try {
            $authedModel->currentAccessToken()->delete();
        } catch (\Throwable $e) {
            Log::warning('IdentityController/switchRole: could not revoke current token', [
                'error' => $e->getMessage(),
            ]);
        }

        if ($target === 'owner') {
            $owner = $identity->user;
            $token = $owner->createToken(
                'api',
                ['*'],
                now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
            )->plainTextToken;

            return response()
                ->json([
                    'current_role' => 'owner',
                    'redirect_url' => '/editor',
                    'user' => [
                        'id'        => $owner->id,
                        'name'      => $owner->name,
                        'email'     => $owner->email,
                        'tenant_id' => $owner->tenant_id,
                        'is_owner'  => (bool) ($owner->is_owner ?? false),
                        'is_admin'  => (bool) ($owner->is_admin ?? false),
                    ],
                ])
                ->withCookie(AuthCookie::make($token));
        }

        // target === 'customer'
        $customer = $identity->customerUser;
        $token = $customer->createToken(
            'customer-api',
            ['*'],
            now()->addMinutes(CustomerAuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        return response()
            ->json([
                'current_role' => 'customer',
                'redirect_url' => '/account',
                'user' => [
                    'id'                => $customer->id,
                    'name'              => $customer->name,
                    'email'             => $customer->email,
                    'phone'             => $customer->phone,
                    'email_verified_at' => $customer->email_verified_at?->toAtomString(),
                ],
            ])
            ->withCookie(CustomerAuthCookie::make($token));
    }

    /**
     * Inline "Become a customer" from the owner dashboard. Creates a
     * customer_users row on the same identity. The owner remains
     * signed in; the customer cookie is set so the next /account
     * navigation hits a live session.
     */
    public function linkCustomer(Request $request): JsonResponse
    {
        $authedModel = $request->user();
        if (! $authedModel instanceof User) {
            return response()->json(['message' => 'Only owners can use this endpoint.'], 403);
        }
        $identity = $this->resolveIdentity($authedModel);
        if (! $identity) {
            return response()->json(['message' => 'No unified identity on this account.'], 409);
        }
        if ($identity->customerUser) {
            return response()->json([
                'message'      => 'You already have a customer profile.',
                'current_role' => 'owner',
            ], 422);
        }

        // Create the customer record. password mirrors the identity hash
        // so existing customer-side code paths that compare against the
        // local row still work; identity is the canonical source.
        $customer = CustomerUser::create([
            'identity_id'       => $identity->id,
            'name'              => $identity->name,
            'email'             => $identity->email,
            'phone'             => $identity->phone,
            'password'          => $identity->password, // already hashed; bypass Hashed cast
            'email_verified_at' => $identity->email_verified_at,
        ]);
        // Direct-set via DB to avoid double-hashing the already-hashed pw.
        \DB::table('customer_users')->where('id', $customer->id)->update([
            'password' => $identity->password,
        ]);

        $token = $customer->createToken(
            'customer-api',
            ['*'],
            now()->addMinutes(CustomerAuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        return response()
            ->json([
                'message'      => 'Customer profile added.',
                'current_role' => 'owner', // still signed in as owner
                'available_roles' => ['owner', 'customer'],
            ])
            ->withCookie(CustomerAuthCookie::make($token));
    }

    private function resolveIdentity($model): ?Identity
    {
        if ($model instanceof User || $model instanceof CustomerUser) {
            if ($model->identity_id) {
                return Identity::with(['user', 'customerUser'])->find($model->identity_id);
            }
            // Legacy row that hasn't been backfilled — best-effort lookup
            // by email so an in-flight session still gets unified
            // behaviour before the migration backfill catches up.
            return Identity::with(['user', 'customerUser'])
                ->where('email', strtolower((string) $model->email))
                ->first();
        }
        return null;
    }
}
