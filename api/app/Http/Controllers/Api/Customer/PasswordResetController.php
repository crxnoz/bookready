<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Mail\CustomerPasswordResetMail;
use App\Models\CustomerUser;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Phase 2 of the customer-accounts feature — forgot/reset password.
 *
 * Mirrors the owner App\Http\Controllers\Api\Auth\PasswordResetController
 * down to the security mechanics:
 *   - Hashed reset token (Str::random(64), Hash::make for at-rest storage)
 *   - Generic forgot response — no user-enumeration oracle
 *   - 60-minute TTL
 *   - On successful reset: revoke ALL Sanctum tokens for this customer
 *     so any active sessions (legitimate or attacker) drop
 *
 * Storage: reuses the existing password_reset_tokens table. The owner
 * flow keys by email too, so a single email used as both an owner
 * login AND a customer login would share one reset token row at a
 * time — practically fine because the same human is asking either
 * way, but worth noting if you ever need to disambiguate.
 *
 *   POST /customer/auth/password/forgot   { email }
 *   POST /customer/auth/password/reset    { email, token, password, password_confirmation }
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

        $email = strtolower(trim($validated['email']));
        $user  = CustomerUser::where('email', $email)->first();

        // Only mint a token if a real customer account exists, but
        // ALWAYS return the same success message so the endpoint
        // can't be used to enumerate which emails are registered.
        if ($user) {
            $rawToken    = Str::random(64);
            $hashedToken = Hash::make($rawToken);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => $hashedToken, 'created_at' => now()],
            );

            $resetUrl = self::APP_BASE
                . '/account/reset-password?token=' . urlencode($rawToken)
                . '&email=' . urlencode($email);

            try {
                Mail::to($email)->send(new CustomerPasswordResetMail(
                    customerName: $user->name,
                    resetUrl:     $resetUrl,
                    ttlMins:      self::TOKEN_TTL_MINUTES,
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] CustomerPasswordResetMail failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
                // Swallow — don't leak failure to the client.
            }
        }

        return response()->json([
            'message' => 'If a BookReady account exists for that email, a reset link is on its way.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'                 => 'required|email|max:255',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $email = strtolower(trim($validated['email']));
        $row   = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $row || ! Hash::check($validated['token'], $row->token)) {
            return response()->json([
                'message' => 'This reset link is invalid or has already been used.',
            ], 422);
        }

        $createdAt = $row->created_at ? Carbon::parse($row->created_at) : null;
        if (! $createdAt || $createdAt->diffInMinutes(now()) > self::TOKEN_TTL_MINUTES) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'This reset link has expired. Request a new one.',
            ], 422);
        }

        $user = CustomerUser::where('email', $email)->first();
        if (! $user) {
            // Defensive — couldn't actually happen unless the customer
            // deleted their account between forgot() and reset().
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'This reset link is no longer valid.',
            ], 422);
        }

        // Set new password — write to BOTH customer_users.password AND
        // identities.password. After #159, login reads from identities; the
        // legacy customer_users column is kept in sync for any code that
        // hasn't migrated. Single-table writes silently broke the reset.
        $hash = Hash::make($validated['password']);
        DB::table('customer_users')->where('id', $user->id)->update([
            'password'   => $hash,
            'updated_at' => now(),
        ]);
        if ($user->identity_id) {
            DB::table('identities')->where('id', $user->identity_id)->update([
                'password'   => $hash,
                'updated_at' => now(),
            ]);
        }

        // Kick every existing customer session so an attacker who
        // stole the old password can't keep their stolen token alive.
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Password updated. Sign in with your new password.',
        ]);
    }
}
