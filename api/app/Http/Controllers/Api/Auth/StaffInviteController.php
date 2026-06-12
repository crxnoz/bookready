<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Wave D — public staff accept-invite endpoint.
 *
 * Pairs with StaffController::sendInvite (owner-only). The owner mints a
 * single-use token, stores its hash on the tenant staff row, and emails
 * the staff member a link to app.bkrdy.me/staff/accept-invite. That page
 * collects a password and POSTs here.
 *
 * On success this:
 *   - validates the token + expiry against the tenant staff row,
 *   - refuses if the email already belongs to ANY central user (v1
 *     single-identity-per-email; multi-tenant staff identity is v2),
 *   - find-or-creates the shared identities row (so a customer can also
 *     be staff under one credential),
 *   - creates the central users row (role=staff, email_verified_at=now),
 *   - writes staff.user_id back, clears the invite token,
 *   - issues the same httpOnly Sanctum cookie as owner login.
 *
 * No tenant_owner / tenant_member gate — this is the bootstrap path that
 * CREATES the staff login, so it has to be reachable without one.
 */
class StaffInviteController extends Controller
{
    public function accept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'    => ['required', 'string', 'max:128'],
            'tenant'   => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $tenant = Tenant::find($validated['tenant']);
        if (! $tenant) {
            return response()->json(['message' => 'This invite link is no longer valid.'], 404);
        }

        // Master kill switch — a tenant that turned the feature off can't
        // have its pending invites accepted.
        if (! (bool) ($tenant->staff_login_enabled ?? false)) {
            return response()->json(['message' => 'Staff logins are turned off for this business.'], 403);
        }

        $tokenHash = hash('sha256', $validated['token']);

        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('staff', 'invite_token')) {
            tenancy()->end();
            return response()->json(['message' => 'This invite link is no longer valid.'], 404);
        }

        $staff = DB::table('staff')->where('invite_token', $tokenHash)->first();
        if (! $staff) {
            tenancy()->end();
            return response()->json(['message' => 'This invite link is invalid or has already been used.'], 404);
        }

        // Expiry gate.
        $expires = $staff->invite_token_expires_at;
        if (! $expires || now()->greaterThan(\Carbon\Carbon::parse($expires))) {
            tenancy()->end();
            return response()->json(['message' => 'This invite link has expired. Ask for a new one.'], 410);
        }

        $email = strtolower(trim((string) ($staff->email ?? '')));
        if ($email === '' || ! str_contains($email, '@')) {
            tenancy()->end();
            return response()->json(['message' => 'This invite is missing an email. Ask for a new one.'], 422);
        }

        // Already linked (double-submit / replayed) — refuse rather than
        // mint a second login.
        if (! empty($staff->user_id)) {
            tenancy()->end();
            return response()->json(['message' => 'This invite has already been accepted.'], 409);
        }

        $staffId   = (int) $staff->id;
        $staffName = (string) ($staff->name ?? '');

        // Atomic single-use claim. The reads above are advisory (clean
        // error copy); this conditional update is the real gate. Two
        // concurrent accepts both pass the check-then-act reads above, but
        // only the first matches WHERE invite_token = ? AND user_id IS NULL
        // and clears the token; the loser updates 0 rows and 409s. We null
        // the token HERE so the write-back later only sets user_id — it must
        // not null the token again (already done) and must not re-claim.
        $claimed = DB::table('staff')
            ->where('id', $staffId)
            ->where('invite_token', $tokenHash)
            ->whereNull('user_id')
            ->update([
                'invite_token'            => null,
                'invite_token_expires_at' => null,
                'updated_at'              => now(),
            ]);

        if ($claimed !== 1) {
            tenancy()->end();
            return response()->json(['message' => 'This invite has already been accepted.'], 409);
        }

        tenancy()->end();

        // v2 Theme 1 — multi-tenant staff identity (chair-renter case).
        // Refusal logic:
        //   - User exists at THIS tenant → already linked (race / replay).
        //   - Identity exists at OTHER tenants → allowed if under cap AND
        //     the password matches the existing identity (so a malicious
        //     invite holder can't shadow someone's existing credential).
        //   - Identity at cap → overflow path (email hello@).
        //   - No existing identity → fresh stylist; create everything.
        $userAtThisTenant = User::where('email', $email)
            ->where('tenant_id', $tenant->id)
            ->exists();
        if ($userAtThisTenant) {
            return response()->json([
                'message' => 'This email already has a login at this business.',
                'code'    => 'already_linked_at_this_tenant',
            ], 422);
        }

        $existingIdentity = Schema::hasTable('identities')
            ? DB::table('identities')->where('email', $email)->first()
            : null;

        if ($existingIdentity) {
            // Cross-tenant invite. Require the password the staff member
            // entered to match the existing identity's password. Without
            // this, anyone who got their hands on the invite link could
            // pick a new password and quietly take over an existing
            // BookReady account.
            if (! Hash::check($validated['password'], $existingIdentity->password)) {
                return response()->json([
                    'message' => 'This email already has a BookReady account. Enter your existing BookReady password to add this business to your account.',
                    'code'    => 'existing_identity_password_mismatch',
                ], 422);
            }

            $tenantTier = \App\Services\PlanFeatures::planOf($tenant);
            if (! \App\Services\IdentityCapResolver::canAttach((int) $existingIdentity->id, $tenantTier)) {
                return response()->json([
                    'message' => \App\Services\IdentityCapResolver::refusalMessage($tenantTier, 'You'),
                    'code'    => 'identity_cap_reached',
                    'tier'    => $tenantTier,
                    'cap'     => \App\Services\IdentityCapResolver::capFor($tenantTier),
                ], 422);
            }
        }

        $hashedPassword = Hash::make($validated['password']);

        // find-or-create the unified identity. A customer or another
        // tenant's staff/owner may already hold this email — reuse so the
        // staff login shares one credential across tenants. Create it
        // otherwise. Guarded so the flow stays bootable where the
        // identities table doesn't exist.
        $identityId = null;
        if (Schema::hasTable('identities')) {
            if ($existingIdentity) {
                $identityId = (int) $existingIdentity->id;
            } else {
                $identityId = DB::table('identities')->insertGetId([
                    'email'             => $email,
                    'password'          => $hashedPassword,
                    'name'              => $staffName,
                    'phone'             => null,
                    'email_verified_at' => now(),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }
        }

        // Create the central staff-login user. email_verified_at + terms
        // are guarded columns (not in $fillable), so stamp them via
        // forceFill AFTER create — the documented owner-seed gotcha.
        $user = User::create([
            'name'        => $staffName ?: explode('@', $email, 2)[0],
            'email'       => $email,
            'password'    => $validated['password'], // hashed by the User cast
            'tenant_id'   => $tenant->id,
            'is_owner'    => false,
            'is_admin'    => false,
            'role'        => 'staff',
            'staff_id'    => $staffId,
            'identity_id' => $identityId,
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
            'terms_version'     => RegisterController::TERMS_VERSION,
        ])->save();

        // Write the soft pointer back. The invite token was already nulled
        // at claim time (FIX A), so this only sets user_id. If it throws,
        // the freshly created central user is orphaned and unrevocable —
        // compensate by deleting it (and its tokens) so the owner can
        // re-invite cleanly. The staff row is left with invite_token NULL
        // and user_id NULL, which is fine: the owner re-invites and a fresh
        // token is minted; we deliberately do not restore the old token.
        try {
            tenancy()->initialize($tenant);
            DB::table('staff')->where('id', $staffId)->update([
                'user_id'    => $user->id,
                'updated_at' => now(),
            ]);
            tenancy()->end();
        } catch (\Throwable $e) {
            tenancy()->end();
            $user->tokens()->delete();
            $user->delete();
            return response()->json([
                'message' => 'We could not finish setting up your staff login. Ask for a new invite and try again.',
            ], 500);
        }

        // v2 Theme 1 (task #233) — drop the central staff_invites row
        // now that the invite is claimed. Best-effort: if the table
        // doesn't exist (pre-migration) or the row's already gone, no
        // problem; the inbox endpoint validates rows against the tenant
        // staff row on read and prunes orphans lazily.
        if (Schema::hasTable('staff_invites')) {
            try {
                DB::table('staff_invites')
                    ->where('tenant_id', $tenant->id)
                    ->where('staff_id', $staffId)
                    ->delete();
            } catch (\Throwable $e) {
                // Ignore — orphan cleanup is best-effort.
            }
        }

        // Same httpOnly Sanctum cookie as owner login. Minted only after the
        // write-back succeeds so a failed link never hands out a session.
        $token = $user->createToken(
            'staff-accept-invite',
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        $response = response()
            ->json([
                'user' => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'tenant_id' => $user->tenant_id,
                    'is_owner'  => false,
                    'is_admin'  => false,
                    'role'      => 'staff',
                    'staff_id'  => $user->staff_id,
                ],
                'redirect_url' => '/editor/appointments?scope=mine',
            ])
            ->withCookie(AuthCookie::make($token));

        if ($request->cookies->has(AuthCookie::NAME)) {
            $response->withCookie(AuthCookie::forgetLegacySharedDomain());
        }

        return $response;
    }
}
