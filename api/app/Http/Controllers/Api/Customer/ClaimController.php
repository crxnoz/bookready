<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Mail\CustomerWelcomeMail;
use App\Models\CustomerUser;
use App\Models\Tenant;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Phase 2 of the customer-accounts feature — booking-confirmation
 * claim flow.
 *
 * After a customer books anonymously, the confirmation email includes
 * a "Save this booking" CTA linking to /account/claim?token=<X>.
 * The token is HMAC-signed and carries the customer's email + an
 * expiry. Clicking it proves they own the email; we use that to
 * pre-verify on account creation.
 *
 * Two endpoints:
 *
 *   GET /api/v1/customer/claim/preview/{token}
 *     Validates HMAC + expiry, returns email + suggested name from
 *     the booking. Does NOT consume the token; the frontend can
 *     render a register form with the email shown as verified.
 *
 *   POST /api/v1/customer/claim
 *     body: { token, password, name? }
 *     - Re-validates HMAC + expiry
 *     - Refuses if the email already has a customer_users row (in
 *       which case the frontend should bounce them to login)
 *     - Creates the customer_users row with email_verified_at set
 *       (the click proves ownership)
 *     - Scans every tenant's clients table for matching email and
 *       stamps customer_user_id on every row found — this is the
 *       cross-tenant link the whole product hinges on
 *     - Mints a Sanctum token, sets the customer auth cookie
 *
 * The cross-tenant scan is the only operation in the codebase that
 * touches every tenant database in one request. Performance is fine
 * because claims are rare (once per customer per BookReady lifetime),
 * but the loop bounds — and the fact that a tenant's failure should
 * NOT block the claim — are documented in linkExistingClients().
 *
 * Token shape (base64url of JSON):
 *   { email, exp, sig }
 *   sig = HMAC-SHA256("claim." + email + "." + exp, APP_KEY)
 *
 * No single-use nonce here — the claim itself is gated by the
 * already-exists check on customer_users.email, which is naturally
 * single-use (a second claim with the same token would 409 because
 * the account exists). 7-day expiry caps the replay window.
 */
class ClaimController extends Controller
{
    private const CLAIM_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

    public function preview(string $token): JsonResponse
    {
        $envelope = $this->verifyToken($token);
        if ($envelope === null) {
            return response()->json([
                'message' => 'This save-booking link is invalid or has expired.',
            ], 410);
        }

        $email = $envelope['email'];

        return response()->json([
            'email'         => $email,
            'already_account' => CustomerUser::where('email', $email)->exists(),
        ]);
    }

    public function claim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'    => 'required|string|max:2000',
            'password' => 'required|string|min:8|confirmed',
            'name'     => 'sometimes|string|max:100',
        ]);

        $envelope = $this->verifyToken($validated['token']);
        if ($envelope === null) {
            return response()->json([
                'message' => 'This save-booking link is invalid or has expired.',
            ], 410);
        }

        $email = $envelope['email'];

        if (CustomerUser::where('email', $email)->exists()) {
            // The email already has an account — could be the same
            // human signed up earlier through the register flow. Bounce
            // them to login rather than silently re-using the claim.
            return response()->json([
                'message' => 'An account already exists for this email. Sign in to save the booking.',
                'code'    => 'account_exists',
            ], 409);
        }

        $name = $validated['name'] ?? '';
        if ($name === '') {
            // Suggest the customer_name from one of the bookings using
            // this email as a fallback — pick the most recent across
            // any tenant. Best-effort; on failure use the local-part.
            $name = $this->suggestName($email) ?? explode('@', $email, 2)[0];
        }
        $name = mb_substr($name, 0, 100);

        $user = CustomerUser::create([
            'name'              => $name,
            'email'             => $email,
            'password'          => $validated['password'],
            'email_verified_at' => now(),   // click on the claim link proves ownership
        ]);

        // Cross-tenant client linking — the whole reason this flow
        // exists. Errors in any one tenant don't block the claim.
        $linkedCount = $this->linkExistingClients($user);

        $user->last_login_at = now();
        $user->save();

        try {
            Mail::to($user->email)->send(new CustomerWelcomeMail(
                customerName: $user->name,
                accountUrl:   'https://app.bkrdy.me/account',
            ));
        } catch (\Throwable $e) {
            Log::warning('CustomerWelcomeMail failed in claim flow', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        $token = $user->createToken(
            'customer-claim',
            ['*'],
            now()->addMinutes(CustomerAuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        return response()
            ->json([
                'user' => [
                    'id'                => (int) $user->id,
                    'name'              => $user->name,
                    'email'             => $user->email,
                    'email_verified_at' => $user->email_verified_at?->toAtomString(),
                ],
                'linked_count' => $linkedCount,
            ], 201)
            ->withCookie(CustomerAuthCookie::make($token));
    }

    /**
     * Decode + verify a claim token envelope. Returns the envelope on
     * success, null on any failure (forged, tampered, expired, malformed).
     *
     * @return array{email: string, exp: int}|null
     */
    private function verifyToken(string $tokenRaw): ?array
    {
        if ($tokenRaw === '') return null;

        $padded = $tokenRaw . str_repeat('=', (4 - strlen($tokenRaw) % 4) % 4);
        $json   = base64_decode(strtr($padded, '-_', '+/'), true);
        if ($json === false) return null;

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) return null;

        $email = strtolower(trim((string) ($decoded['email'] ?? '')));
        $exp   = (int)                  ($decoded['exp']   ?? 0);
        $sig   = (string)               ($decoded['sig']   ?? '');

        if ($email === '' || $sig === '' || $exp <= time()) return null;

        $expected = $this->signature($email, $exp);
        if (! hash_equals($expected, $sig)) return null;

        return ['email' => $email, 'exp' => $exp];
    }

    private function signature(string $email, int $exp): string
    {
        $key = (string) config('app.key');
        return hash_hmac('sha256', "claim.{$email}.{$exp}", $key);
    }

    /**
     * Mint a claim token for a given email — used by the booking
     * confirmation mailer to embed in the "Save this booking" link.
     * Public static so the booking-create path can call it without
     * instantiating the controller.
     */
    public static function mintToken(string $email): string
    {
        $email = strtolower(trim($email));
        $exp   = time() + self::CLAIM_TTL_SECONDS;
        $sig   = hash_hmac('sha256', "claim.{$email}.{$exp}", (string) config('app.key'));

        $json = json_encode(['email' => $email, 'exp' => $exp, 'sig' => $sig]);
        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    /**
     * Walk every tenant once and stamp clients.customer_user_id where
     * the email matches the newly-created customer_users row.
     *
     * IMPORTANT design notes:
     *   - Each tenant initialization is wrapped in try/finally so a
     *     missing column or a transient DB error doesn't abort the
     *     scan and leave the customer half-linked.
     *   - The customer_user_id column is from the Phase 1 tenant
     *     migration; Schema::hasColumn() guards against tenants that
     *     haven't run that migration yet (e.g. mid-deploy).
     *   - The customer_users.email column is already lowercased by
     *     CustomerUser::setEmailAttribute(); existing clients rows
     *     may not be — match case-insensitively.
     *   - A LIMIT/OFFSET pager would be over-engineering: a single
     *     customer typically has 0–5 matching clients per tenant.
     *
     * Returns the number of clients rows linked across all tenants.
     */
    private function linkExistingClients(CustomerUser $user): int
    {
        $email = $user->email;   // already lowercased by the mutator
        $total = 0;

        foreach (Tenant::all() as $tenant) {
            try {
                tenancy()->initialize($tenant);

                if (! Schema::hasColumn('clients', 'customer_user_id')) {
                    continue;
                }

                $affected = DB::table('clients')
                    ->whereRaw('LOWER(email) = ?', [$email])
                    ->whereNull('customer_user_id')
                    ->update(['customer_user_id' => $user->id, 'updated_at' => now()]);

                $total += $affected;
            } catch (\Throwable $e) {
                Log::warning('claim.link_clients failed for tenant', [
                    'tenant_id' => $tenant->getKey(),
                    'user_id'   => $user->id,
                    'error'     => $e->getMessage(),
                ]);
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        return $total;
    }

    /**
     * Best-effort name lookup — find the most recent clients row
     * across any tenant whose email matches, return its `name`.
     * Null if nothing found or any error.
     */
    private function suggestName(string $email): ?string
    {
        foreach (Tenant::all() as $tenant) {
            try {
                tenancy()->initialize($tenant);

                $row = DB::table('clients')
                    ->whereRaw('LOWER(email) = ?', [$email])
                    ->orderByDesc('updated_at')
                    ->first();

                if ($row && ! empty($row->name)) {
                    return (string) $row->name;
                }
            } catch (\Throwable) {
                // Skip tenants that fail; not load-bearing.
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        return null;
    }
}
