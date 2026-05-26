<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke old tokens if single-session is desired
        // $user->tokens()->delete();

        $token = $user->createToken('api')->plainTextToken;

        // Phase S6 — also set the token as an httpOnly cookie so the
        // frontend doesn't need to stash it in localStorage. The token
        // is still returned in the body for the transition window; the
        // new frontend ignores the body value and relies on the cookie.
        return response()
            ->json([
                'token' => $token,
                'user'  => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'tenant_id' => $user->tenant_id,
                ],
            ])
            ->withCookie(AuthCookie::make($token));
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
            ->withCookie(AuthCookie::forget());
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'tenant_id'          => $user->tenant_id,
            'is_owner'           => $user->is_owner,
            'is_admin'           => (bool) ($user->is_admin ?? false),
            // Phase S6 part 2 — frontend nag banner gates on this.
            'email_verified_at'  => $user->email_verified_at?->toAtomString(),
        ]);
    }
}
