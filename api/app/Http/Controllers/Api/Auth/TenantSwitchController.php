<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * v2 Theme 1 — switch the active tenant for a multi-tenant identity.
 *
 * The chair-renter case: a stylist with one identity is linked to
 * Studio A and Studio B via two separate users.* rows that share an
 * identity_id. The editor sidebar dropdown shows both; clicking
 * Studio B hits this endpoint, which revokes the Sanctum token for
 * the Studio A User row and mints a fresh one for the Studio B User
 * row. The httpOnly cookie is overwritten with the new token.
 *
 * Pairs with AuthController::me, which returns the linked_tenants
 * list the dropdown renders from. Modeled on
 * IdentityController::switchRole, which does the same dance between
 * the owner and customer roles on a single identity.
 *
 * Throttled to 30 switches per minute per IP — that's plenty for any
 * real workflow and stops a compromised cookie from being used to
 * enumerate every tenant an identity is linked to.
 */
class TenantSwitchController extends Controller
{
    public function switch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => ['required', 'string', 'max:255'],
        ]);

        $authedUser = $request->user();
        if (! $authedUser instanceof User) {
            return response()->json(['message' => 'Only owner or staff sessions can switch tenants.'], 403);
        }

        // No-op if they're already on this tenant.
        if (((string) $authedUser->tenant_id) === ((string) $validated['tenant_id'])) {
            return response()->json([
                'message'   => 'Already on this business.',
                'tenant_id' => $authedUser->tenant_id,
            ], 200);
        }

        // The target tenant must have a User row tied to the SAME identity.
        // This is the entire authorization check: if you don't have a User
        // at the target tenant, you can't switch to it.
        if (! $authedUser->identity_id) {
            return response()->json([
                'message' => 'This account is not linked to any other businesses.',
                'code'    => 'no_identity',
            ], 403);
        }

        $targetUser = User::where('identity_id', $authedUser->identity_id)
            ->where('tenant_id', $validated['tenant_id'])
            ->first();

        if (! $targetUser) {
            return response()->json([
                'message' => 'You are not linked to that business.',
                'code'    => 'not_linked',
            ], 403);
        }

        // Revoke the current Sanctum token so the cookie we replace can't
        // be reused after the switch. The new tenant gets a fresh token.
        try {
            $authedUser->currentAccessToken()?->delete();
        } catch (\Throwable $e) {
            Log::warning('TenantSwitchController/switch: could not revoke current token', [
                'error' => $e->getMessage(),
            ]);
        }

        $token = $targetUser->createToken(
            'tenant-switch',
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        return response()
            ->json([
                'tenant_id' => $targetUser->tenant_id,
                'user' => [
                    'id'        => $targetUser->id,
                    'name'      => $targetUser->name,
                    'email'     => $targetUser->email,
                    'tenant_id' => $targetUser->tenant_id,
                    'is_owner'  => (bool) ($targetUser->is_owner ?? false),
                    'is_admin'  => (bool) ($targetUser->is_admin ?? false),
                    'role'      => $targetUser->role ?? 'owner',
                    'staff_id'  => $targetUser->staff_id !== null ? (int) $targetUser->staff_id : null,
                ],
                'redirect_url' => '/editor',
            ])
            ->withCookie(AuthCookie::make($token));
    }
}
