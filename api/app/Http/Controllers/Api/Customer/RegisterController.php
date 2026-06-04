<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Mail\CustomerWelcomeMail;
use App\Models\CustomerUser;
use App\Models\Identity;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 of the customer-accounts feature — self-serve signup.
 *
 * Mirror of App\Http\Controllers\Api\Auth\RegisterController (owner
 * side) but much simpler — no tenant provisioning, no business name,
 * no template choice. Just name + email + password.
 *
 * After successful registration:
 *   - email_verified_at stays NULL (unverified). The frontend will
 *     surface the "please verify your email" banner; user can resend
 *     the verification link from /customer/auth/verify-email/resend.
 *   - A welcome email is dispatched. NOT the verify-email link — that
 *     comes from EmailVerificationController::sendVerificationEmail
 *     which is called separately so registration via the claim flow
 *     (which doesn't need verification) can skip it cleanly.
 *
 * The Phase 6 claim flow is a separate endpoint (Api\Customer\ClaimController)
 * that wraps this same shape but pre-verifies email (because the
 * click on the claim link proves email ownership).
 *
 * Returns the same shape as AuthController::login on success so the
 * frontend doesn't need a separate code path. Cookie is set the same way.
 */
class RegisterController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // #159 — Conflict check BEFORE validation. Same "block + ask to
        // sign in" UX as owner side.
        $emailIn = strtolower(trim((string) $request->input('email')));
        if ($emailIn && Schema::hasTable('identities')) {
            $existing = Identity::with(['user', 'customerUser'])->where('email', $emailIn)->first();
            if ($existing) {
                if ($existing->customerUser) {
                    return response()->json([
                        'message'       => 'A customer account already exists with this email. Sign in instead.',
                        'existing_role' => 'customer',
                        'redirect_url'  => '/account/login',
                    ], 422);
                }
                if ($existing->user) {
                    return response()->json([
                        'message'       => 'You already have a BookReady business account with this email. Sign in to your business account, then use "Become a customer" from your dashboard.',
                        'existing_role' => 'owner',
                        'redirect_url'  => '/login',
                    ], 422);
                }
            }
        }

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:customer_users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone'    => ['sometimes', 'nullable', 'string', 'max:30'],
        ]);

        // Eloquent's `hashed` cast on CustomerUser handles the password
        // hashing on assignment — never store plaintext.
        $user = CustomerUser::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],          // setEmailAttribute lowercases
            'password' => $validated['password'],
            'phone'    => $validated['phone'] ?? null,
        ]);

        // #159 — create + link identity.
        if (Schema::hasTable('identities')) {
            $identityId = DB::table('identities')->insertGetId([
                'email'             => strtolower($user->email),
                'password'          => $user->password, // already bcrypt-hashed by the model cast
                'name'              => $user->name,
                'phone'             => $user->phone,
                'email_verified_at' => $user->email_verified_at,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
            DB::table('customer_users')->where('id', $user->id)->update(['identity_id' => $identityId]);
        }

        // Best-effort welcome email — never blocks signup. Caller will
        // separately trigger the verify-email send via the dedicated
        // EmailVerificationController so the claim-flow path can skip
        // it without duplicating mailing logic here.
        try {
            Mail::to($user->email)->send(new CustomerWelcomeMail(
                customerName: $user->name,
                accountUrl:   'https://app.bkrdy.me/account',
            ));
        } catch (\Throwable $e) {
            Log::warning('CustomerWelcomeMail failed', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        // Send the verify-email link inline (same trigger point owner
        // RegisterController uses). Best-effort; user can resend later.
        try {
            EmailVerificationController::sendVerificationEmail($user);
        } catch (\Throwable $e) {
            Log::warning('CustomerVerifyEmailMail failed at signup', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        $user->last_login_at = now();
        $user->save();

        $token = $user->createToken(
            'customer-register',
            ['*'],
            now()->addMinutes(CustomerAuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        return response()
            ->json([
                'user' => [
                    'id'                => (int) $user->id,
                    'name'              => $user->name,
                    'email'             => $user->email,
                    'phone'             => $user->phone,
                    'email_verified_at' => null,
                ],
            ], 201)
            ->withCookie(CustomerAuthCookie::make($token));
    }
}
