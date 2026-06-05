<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Forgot-password / reset-password flow.
 *
 * Uses Laravel's standard `password_reset_tokens` table but issues a
 * BookReady-branded email instead of the Laravel default Notification.
 *
 *   POST /auth/password/forgot   — body: { email }
 *   POST /auth/password/reset    — body: { email, token, password, password_confirmation }
 *
 * Token TTL: 60 minutes. Always return a generic success message for
 * /forgot regardless of whether the email exists, so the endpoint can't
 * be used as a user-enumeration oracle.
 */
class PasswordResetController extends Controller
{
    private const TOKEN_TTL_MINUTES = 60;
    private const APP_BASE          = 'https://app.bkrdy.me';

    public function forgot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = strtolower($validated['email']);
        $user  = User::where('email', $email)->first();

        // Only issue a token + email if a real account exists, but ALWAYS
        // return success to avoid leaking which emails are registered.
        if ($user) {
            $rawToken    = Str::random(64);
            $hashedToken = Hash::make($rawToken);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => $hashedToken, 'created_at' => now()],
            );

            $resetUrl = self::APP_BASE . '/reset-password?token=' . urlencode($rawToken) . '&email=' . urlencode($email);

            try {
                Mail::to($email)->send(new PasswordResetMail(
                    ownerName: $user->name,
                    resetUrl:  $resetUrl,
                    ttlMins:   self::TOKEN_TTL_MINUTES,
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] PasswordResetMail failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
                // Continue — don't leak the failure to the client.
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a reset link is on its way.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'                 => 'required|email|max:255',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $email = strtolower($validated['email']);
        $row   = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $row || ! Hash::check($validated['token'], $row->token)) {
            return response()->json([
                'message' => 'This reset link is invalid or has already been used.',
            ], 422);
        }

        // TTL check.
        $createdAt = $row->created_at ? Carbon::parse($row->created_at) : null;
        if (! $createdAt || $createdAt->diffInMinutes(now()) > self::TOKEN_TTL_MINUTES) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'This reset link has expired. Request a new one.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            // Defensive — shouldn't happen if forgot() was used, but cover it.
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'This reset link is no longer valid.',
            ], 422);
        }

        // Set new password — write to BOTH users.password AND identities.password.
        // After #159, login reads from identities.password but the legacy
        // users.password column is still kept in sync for any code that
        // hasn't migrated. Writing to only one was the original bug — the
        // reset succeeded but the new password didn't actually work at login.
        $hash = Hash::make($validated['password']);
        DB::table('users')->where('id', $user->id)->update([
            'password'   => $hash,
            'updated_at' => now(),
        ]);
        if ($user->identity_id) {
            DB::table('identities')->where('id', $user->identity_id)->update([
                'password'   => $hash,
                'updated_at' => now(),
            ]);
        }

        // Revoke ALL existing Sanctum tokens — anyone who's currently
        // signed in (legit or otherwise) gets booted.
        $user->tokens()->delete();

        // Burn the reset token.
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Password updated. Sign in with your new password.',
        ]);
    }
}
