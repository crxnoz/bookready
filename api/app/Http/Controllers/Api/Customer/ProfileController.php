<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Phase 3 of the customer-accounts feature — self-serve profile
 * management for end-clients.
 *
 * Mirror of App\Http\Controllers\Api\Editor\AccountController (owner
 * side) scoped to identity + contact fields only. Per-business
 * preferences (preferred staff, allergy notes, VIP, tags) remain
 * owner-controlled on the per-tenant clients table — those are the
 * business's CRM data, not the customer's.
 *
 * Surface (all under auth:sanctum + customer_session + customer_verified_email):
 *
 *   GET    /api/v1/customer/profile
 *   PATCH  /api/v1/customer/profile           (name, phone)
 *   POST   /api/v1/customer/profile/password  (requires current_password)
 *   PATCH  /api/v1/customer/profile/email     (clears email_verified_at + re-sends verify)
 *
 * Email-change flow:
 *   - email_verified_at gets blanked → frontend banner switches back
 *     to "please verify your email"
 *   - New verification link is sent immediately to the NEW address
 *   - Old address is NOT notified (no EmailChangedMail analog for
 *     customers in v1 — owner side does dual-notify because hijack
 *     risk is higher; revisit if customer hijack cases emerge)
 *
 * Password-change flow:
 *   - Requires current_password (no silent overwrite)
 *   - Revokes ALL other Sanctum tokens (same defensive pattern as the
 *     Phase S6 owner changePassword fix). Preserves the request's
 *     own token so the user stays signed in to the tab they just used.
 */
class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->present($request->user()));
    }

    // PATCH /customer/profile
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'sometimes|string|min:1|max:100',
            'phone' => 'sometimes|nullable|string|max:30',
        ]);

        if (array_key_exists('name',  $validated)) $user->name  = $validated['name'];
        if (array_key_exists('phone', $validated)) $user->phone = $validated['phone'];

        if ($user->isDirty()) $user->save();

        return response()->json($this->present($user->refresh()));
    }

    // PATCH /customer/profile/email
    public function updateEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                // Uniqueness check against customer_users (NOT users —
                // a customer can share an email with an owner account
                // by coincidence; that's fine because they're separate
                // identity stores).
                Rule::unique('customer_users', 'email')->ignore($user->id),
            ],
        ]);

        $newEmail = strtolower(trim($validated['email']));
        if ($newEmail === $user->email) {
            // No-op; don't trigger a re-verification on a change-to-same.
            return response()->json($this->present($user));
        }

        $user->email             = $newEmail;
        $user->email_verified_at = null;
        $user->save();

        // Re-issue the verification link to the NEW address. Best-effort.
        try {
            EmailVerificationController::sendVerificationEmail($user);
        } catch (\Throwable $e) {
            Log::warning('customer email-change verify send failed', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        return response()->json($this->present($user->refresh()));
    }

    // POST /customer/profile/password
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        // Constant-time check. user->password could be null for a
        // future Google-OAuth-only signup path; treat missing as
        // mismatch rather than crashing.
        if (! $user->password || ! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->password = $validated['new_password'];
        $user->save();

        // Phase 2 followup hardening — revoke every other Sanctum
        // token on password change. If an attacker had stolen the old
        // password and was signed in, their token survives the
        // rotation unless we kill it here. Preserve the current
        // request's token so the user isn't logged out of the tab
        // they just used.
        $currentTokenId = $request->user()->currentAccessToken()?->id;
        $query = $user->tokens();
        if ($currentTokenId) {
            $query->where('id', '!=', $currentTokenId);
        }
        $revoked = (int) $query->count();
        $query->delete();

        return response()->json([
            'message'        => 'Password updated.',
            'revoked_count'  => $revoked,
        ]);
    }

    /**
     * Plain-array snapshot. Mirrors the AuthController::me shape.
     */
    private function present(CustomerUser $user): array
    {
        return [
            'id'                => (int) $user->id,
            'name'              => $user->name,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toAtomString(),
            'created_at'        => $user->created_at,
            'updated_at'        => $user->updated_at,
        ];
    }
}
