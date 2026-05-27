<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Mail\CustomerWelcomeMail;
use App\Models\CustomerUser;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
