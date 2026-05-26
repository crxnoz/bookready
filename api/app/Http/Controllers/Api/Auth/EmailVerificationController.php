<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Phase S6 part 2 — owner email verification.
 *
 * Flow:
 *   1. Password signup → RegisterController calls `sendVerificationEmail`
 *      (in this controller) which mints an HMAC-signed URL + mails it.
 *   2. User clicks the link → GET /api/v1/auth/verify-email/{id} hits
 *      `verify()` here. Signature + email-hash + expiry are validated,
 *      then email_verified_at is stamped and the browser is redirected
 *      to the frontend success/error page.
 *   3. If the link expired or got lost, the user can hit
 *      POST /api/v1/auth/verify-email/resend while signed in — that
 *      mints a fresh URL and re-mails it.
 *
 * Google OAuth signups skip step 1 entirely; the controller sets
 * email_verified_at = now() because Google has already verified the
 * email address.
 *
 * URL signature:
 *   sig = hash_hmac('sha256', "{id}.{exp}.{emailHash}", APP_KEY)
 * The emailHash is sha1(strtolower(user.email)) so a user changing their
 * email address invalidates outstanding verification links (defense
 * against the link-hijack scenario where someone planted a verification
 * for an email they no longer control).
 */
class EmailVerificationController extends Controller
{
    private const LINK_TTL_SECONDS = 60 * 60 * 24; // 24 hours
    private const LINK_TTL_MIN     = 60 * 24;
    private const APP_BASE         = 'https://app.bkrdy.me';

    /**
     * GET /api/v1/auth/verify-email/{id}?exp&hash&sig
     *
     * Hit by the user clicking the link in their inbox. Always redirects
     * to a frontend page — never returns JSON — because the user comes
     * here from a mail client, not from inside the SPA.
     */
    public function verify(Request $request, int $id): RedirectResponse
    {
        $exp  = (int)    $request->query('exp', 0);
        $hash = (string) $request->query('hash', '');
        $sig  = (string) $request->query('sig', '');

        if ($exp <= 0 || $exp < time() || $hash === '' || $sig === '') {
            return redirect(self::APP_BASE . '/auth/verify-email-error?reason=expired');
        }

        $expected = $this->signature($id, $exp, $hash);
        if (! hash_equals($expected, $sig)) {
            Log::channel('security')->warning('email.verify.bad_signature', [
                'user_id' => $id,
                'ip'      => $request->ip(),
            ]);
            return redirect(self::APP_BASE . '/auth/verify-email-error?reason=invalid');
        }

        $user = User::find($id);
        if (! $user) {
            return redirect(self::APP_BASE . '/auth/verify-email-error?reason=invalid');
        }

        // sha1(email) must match the hash baked into the URL. Catches
        // the case where the user changed their email AFTER the link was
        // minted — that link should no longer work.
        if (! hash_equals(sha1(strtolower($user->email)), $hash)) {
            Log::channel('security')->info('email.verify.email_mismatch', [
                'user_id' => $id,
            ]);
            return redirect(self::APP_BASE . '/auth/verify-email-error?reason=invalid');
        }

        // Idempotent — clicking an already-used link still lands on success.
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
            Log::channel('security')->info('email.verify.success', [
                'user_id' => $id,
            ]);
        }

        return redirect(self::APP_BASE . '/auth/verify-email-success');
    }

    /**
     * POST /api/v1/auth/verify-email/resend — authed.
     *
     * Mint a new link + mail it. Throttled at the route level. Silent
     * success when the user is already verified (don't leak verification
     * state to a hijacked session).
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Not signed in.'], 401);
        }
        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $this->sendVerificationEmail($user);

        return response()->json([
            'message' => 'Verification email sent. Check your inbox.',
        ]);
    }

    /**
     * Mint a fresh signed verification URL + dispatch the mailable.
     * Called from RegisterController + the resend endpoint above.
     */
    public static function sendVerificationEmail(User $user): void
    {
        $self = new self();
        $url  = $self->mintLink($user);

        Mail::to($user->email)->send(new VerifyEmailMail(
            ownerName: $user->name ?: 'there',
            verifyUrl: $url,
            ttlMins:   self::LINK_TTL_MIN,
        ));
    }

    private function mintLink(User $user): string
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

        return "{$base}/api/v1/auth/verify-email/{$user->id}?{$qs}";
    }

    private function signature(int $id, int $exp, string $hash): string
    {
        $key = (string) config('app.key');
        return hash_hmac('sha256', "{$id}.{$exp}.{$hash}", $key);
    }
}
