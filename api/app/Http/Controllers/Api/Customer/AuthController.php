<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Phase 2 of the customer-accounts feature — sign-in / sign-out /
 * current-user for end-clients.
 *
 * Mirror of App\Http\Controllers\Api\Auth\AuthController (owner side)
 * but against the CustomerUser model + CustomerAuthCookie.
 *
 * Token TTL matches owner flow (30 days via CustomerAuthCookie::TOKEN_TTL_MIN).
 * Cookie TTL is 14 days (CustomerAuthCookie::TTL_MIN); cookie expires
 * before the underlying token, so a long-idle user fails on the
 * cookie side (cleaner "session expired" UX) rather than on the
 * Sanctum-side DB rejection.
 *
 * Token is returned ONLY via httpOnly cookie. Never in the JSON body.
 * The frontend has no JS-readable credential it could leak via XSS.
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            // #158 — same "Remember me" semantics as owner login.
            // Defaults to true so existing callers (in-booking auth
            // modals on tenant sites) get current behavior.
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = CustomerUser::where('email', strtolower(trim($request->email)))->first();

        // Constant-time check via password_verify under the hood.
        // Single error message on both branches so we don't reveal
        // whether the email exists.
        if (! $user || ! $user->password || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->last_login_at = now();
        $user->save();

        // #158 — session cookie + 24h token when remember is unchecked.
        $remember = (bool) $request->boolean('remember', true);

        $token = $user->createToken(
            'customer-api',
            ['*'],
            now()->addMinutes(CustomerAuthCookie::tokenTtlMinutes($remember)),
        )->plainTextToken;

        return response()
            ->json([
                'user' => $this->presentUser($user),
            ])
            ->withCookie(CustomerAuthCookie::make($token, $remember));
    }

    public function logout(Request $request): JsonResponse
    {
        // currentAccessToken() returns null only if the request wasn't
        // actually authenticated — middleware guarantees it here.
        $request->user()->currentAccessToken()->delete();

        return response()
            ->json(['message' => 'Signed out.'])
            ->withCookie(CustomerAuthCookie::forget());
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->presentUser($request->user()));
    }

    /**
     * Plain-array snapshot. Intentionally narrow — no admin / tenant
     * flags here. Frontend nag-banner reads email_verified_at to
     * decide whether to show "please verify your email".
     */
    private function presentUser(CustomerUser $user): array
    {
        return [
            'id'                => (int) $user->id,
            'name'              => $user->name,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toAtomString(),
        ];
    }
}
