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
            // #158 — "Remember me" checkbox state from the login form.
            // Defaults to true so legacy callers without the field
            // get today's behavior (14-day cookie, 30-day token).
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
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
