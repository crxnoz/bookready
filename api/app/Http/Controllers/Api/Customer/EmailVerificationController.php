<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Mail\CustomerVerifyEmailMail;
use App\Models\CustomerUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Phase 2 of the customer-accounts feature — email verification.
 *
 * Mirror of App\Http\Controllers\Api\Auth\EmailVerificationController
 * (owner side). Same URL-signing scheme: HMAC-SHA256 over
 * `{id}.{exp}.{emailHash}` keyed on APP_KEY, 24-hour TTL, sha1(email)
 * fingerprint that invalidates the link if the customer changes their
 * email after the link was minted (defends against the link-hijack
 * scenario where a since-stolen email's link is replayed).
 *
 * The /verify GET endpoint is hit from a mail client and always
 * redirects to a frontend page (never returns JSON) — same UX shape
 * as the owner flow.
 *
 * Routes:
 *   GET  /api/v1/auth/customer/verify-email/{id}?exp&hash&sig
 *        (the URL the customer clicks in their inbox)
 *   POST /api/v1/customer/auth/verify-email/resend
 *        (authed — customer requests a fresh link from the dashboard)
 */
class EmailVerificationController extends Controller
{
    private const LINK_TTL_SECONDS = 60 * 60 * 24; // 24 hours
    private const LINK_TTL_MIN     = 60 * 24;
    private const APP_BASE         = 'https://app.bkrdy.me';

    public function verify(Request $request, int $id): RedirectResponse
    {
        $exp  = (int)    $request->query('exp', 0);
        $hash = (string) $request->query('hash', '');
        $sig  = (string) $request->query('sig', '');

        if ($exp <= 0 || $exp < time() || $hash === '' || $sig === '') {
            return redirect(self::APP_BASE . '/account/verify-email-error?reason=expired');
        }

        $expected = $this->signature($id, $exp, $hash);
        if (! hash_equals($expected, $sig)) {
            Log::channel('security')->warning('customer.email.verify.bad_signature', [
                'user_id' => $id,
                'ip'      => $request->ip(),
            ]);
            return redirect(self::APP_BASE . '/account/verify-email-error?reason=invalid');
        }

        $user = CustomerUser::find($id);
        if (! $user) {
            return redirect(self::APP_BASE . '/account/verify-email-error?reason=invalid');
        }

        // Catches the case where the customer changed their email
        // AFTER the link was minted — old link must no longer work.
        if (! hash_equals(sha1(strtolower($user->email)), $hash)) {
            Log::channel('security')->info('customer.email.verify.email_mismatch', [
                'user_id' => $id,
            ]);
            return redirect(self::APP_BASE . '/account/verify-email-error?reason=invalid');
        }

        // Idempotent — clicking an already-used link still lands on success.
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
            Log::channel('security')->info('customer.email.verify.success', [
                'user_id' => $id,
            ]);
        }

        return redirect(self::APP_BASE . '/account/verify-email-success');
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof CustomerUser) {
            return response()->json(['message' => 'Not signed in.'], 401);
        }
        if ($user->email_verified_at) {
            // Silent success — don't leak verification state to a
            // hijacked session.
            return response()->json(['message' => 'Email already verified.']);
        }

        $this->sendVerificationEmail($user);

        return response()->json([
            'message' => 'Verification email sent. Check your inbox.',
        ]);
    }

    /**
     * Mint a fresh signed verification URL + dispatch the mailable.
     * Called inline from RegisterController as well as from resend()
     * above, so the two share the same minting logic and TTL.
     */
    public static function sendVerificationEmail(CustomerUser $user): void
    {
        $self = new self();
        $url  = $self->mintLink($user);

        Mail::to($user->email)->send(new CustomerVerifyEmailMail(
            customerName: $user->name ?: 'there',
            verifyUrl:    $url,
            ttlMins:      self::LINK_TTL_MIN,
        ));
    }

    private function mintLink(CustomerUser $user): string
    {
        $exp  = time() + self::LINK_TTL_SECONDS;
        $hash = sha1(strtolower($user->email));
        $sig  = $this->signature($user->id, $exp, $hash);

        $base = rtrim((string) (env('API_BASE_URL') ?: 'https://api.bkrdy.me'), '/');
        $qs   = http_build_query([
            'exp'  => $exp,
            'hash' => $hash,
            'sig'  => $sig,
        ]);

        return "{$base}/api/v1/customer/auth/verify-email/{$user->id}?{$qs}";
    }

    private function signature(int $id, int $exp, string $hash): string
    {
        $key = (string) config('app.key');
        // Distinct from the owner signature scheme — same algorithm,
        // different key prefix so a captured owner verify-link can't
        // be replayed against a customer account with the same id and
        // vice versa. (Practically the IDs come from different tables
        // so the collision is unlikely, but defense in depth.)
        return hash_hmac('sha256', "customer.{$id}.{$exp}.{$hash}", $key);
    }
}
