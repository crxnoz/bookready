<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Account Settings — owner profile + password + session management.
 *
 * Lives on the CENTRAL database (no tenancy()->initialize() needed) —
 * the User model lives in the central bookready_central DB just like
 * personal_access_tokens. Stripe SaaS subscription wiring and Cashier
 * are intentionally untouched here.
 */
class AccountController extends Controller
{
    /**
     * Plain-array snapshot of the owner's account profile.
     */
    private function format($user): array
    {
        return [
            'id'         => (int) $user->id,
            'name'       =>        $user->name,
            'email'      =>        $user->email,
            'is_owner'   => (bool) ($user->is_owner ?? false),
            'tenant_id'  =>        $user->tenant_id,
            'created_at' =>        $user->created_at,
            'updated_at' =>        $user->updated_at,
        ];
    }

    // GET /editor/account
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->format($request->user()));
    }

    // PATCH /editor/account
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'sometimes|string|min:1|max:100',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        if (array_key_exists('name', $validated))  $user->name  = $validated['name'];
        if (array_key_exists('email', $validated)) $user->email = $validated['email'];

        if ($user->isDirty()) {
            $user->save();
        }

        return response()->json($this->format($user->refresh()));
    }

    // POST /editor/account/password
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->password = Hash::make($validated['new_password']);
        $user->save();

        return response()->json([
            'message' => 'Password updated.',
        ]);
    }

    // POST /editor/account/sign-out-everywhere
    // Revokes every Sanctum token for this user EXCEPT the one on this request.
    public function signOutEverywhere(Request $request): JsonResponse
    {
        $user           = $request->user();
        $currentTokenId = $request->user()->currentAccessToken()?->id;

        $query = $user->tokens();
        if ($currentTokenId) {
            $query->where('id', '!=', $currentTokenId);
        }
        $revoked = $query->count();
        $query->delete();

        return response()->json([
            'message'        => 'Other sessions signed out.',
            'revoked_count'  => (int) $revoked,
        ]);
    }
}
