<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\IdentityCapResolver;
use App\Services\PlanFeatures;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * v2 Theme 1 (task #233) — in-editor invite inbox.
 *
 * GET /auth/invites/pending
 *   Lists pending staff invites for the authed identity's email so
 *   the sidebar dropdown can render the inbox without bouncing
 *   through the email link.
 *
 * POST /auth/invites/{id}/accept
 *   Accepts a specific invite while authed. No password re-entry —
 *   the identity that already owns this Sanctum session IS the
 *   credential. Creates the new User row at the target tenant
 *   pointing at the existing identity, claims the tenant staff row
 *   atomically, and deletes the central invite row.
 *
 * Cap enforcement, kill-switch, and expiry are all checked here so
 * a stale browser tab can't sneak past the same gates the email-
 * link flow already enforces.
 *
 * All routes are auth:sanctum-gated — the controller assumes a
 * real User session, not a CustomerUser.
 */
class InvitesController extends Controller
{
    public function pending(Request $request): JsonResponse
    {
        $authedUser = $request->user();
        if (! $authedUser instanceof User || ! $authedUser->identity_id) {
            return response()->json(['invites' => []]);
        }
        if (! Schema::hasTable('staff_invites') || ! Schema::hasTable('identities')) {
            return response()->json(['invites' => []]);
        }

        $identity = DB::table('identities')->where('id', $authedUser->identity_id)->first();
        if (! $identity || empty($identity->email)) {
            return response()->json(['invites' => []]);
        }

        $now = now();
        $rows = DB::table('staff_invites')
            ->where('email', strtolower((string) $identity->email))
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        // Suppress invites the identity already accepted (a User row exists
        // at that tenant already). Lazy cleanup: delete the orphan central
        // row so it stops appearing in the inbox on subsequent calls.
        $invites = [];
        foreach ($rows as $row) {
            $alreadyLinked = User::where('identity_id', $authedUser->identity_id)
                ->where('tenant_id', $row->tenant_id)
                ->exists();
            if ($alreadyLinked) {
                DB::table('staff_invites')->where('id', $row->id)->delete();
                continue;
            }
            $invites[] = [
                'id'                     => (int) $row->id,
                'tenant_id'              => (string) $row->tenant_id,
                'business_name'          => (string) ($row->inviting_business_name ?? $row->tenant_id),
                'inviting_staff_name'    => $row->inviting_staff_name !== null ? (string) $row->inviting_staff_name : null,
                'expires_at'             => $row->expires_at,
                'created_at'             => $row->created_at,
            ];
        }

        return response()->json(['invites' => $invites]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $authedUser = $request->user();
        if (! $authedUser instanceof User) {
            return response()->json(['message' => 'Sign in to accept this invite.'], 403);
        }
        if (! $authedUser->identity_id) {
            return response()->json([
                'message' => 'Your account is not linked to the identity system yet.',
                'code'    => 'no_identity',
            ], 422);
        }
        if (! Schema::hasTable('staff_invites') || ! Schema::hasTable('identities')) {
            return response()->json(['message' => 'Invites are not available yet.'], 409);
        }

        $invite = DB::table('staff_invites')->where('id', $id)->first();
        if (! $invite) {
            return response()->json(['message' => 'Invite not found.'], 404);
        }

        $identity = DB::table('identities')->where('id', $authedUser->identity_id)->first();
        if (! $identity || strtolower((string) $identity->email) !== strtolower((string) $invite->email)) {
            return response()->json([
                'message' => 'This invite was sent to a different email.',
                'code'    => 'email_mismatch',
            ], 403);
        }

        if ($invite->expires_at && now()->greaterThan(Carbon::parse($invite->expires_at))) {
            // Stale row — clean up so the inbox stops listing it.
            DB::table('staff_invites')->where('id', $id)->delete();
            return response()->json([
                'message' => 'This invite has expired. Ask the business owner for a new one.',
                'code'    => 'expired',
            ], 410);
        }

        $tenant = Tenant::find($invite->tenant_id);
        if (! $tenant) {
            DB::table('staff_invites')->where('id', $id)->delete();
            return response()->json(['message' => 'This business no longer exists.'], 404);
        }

        // Master kill switch — same gate the email-link flow checks.
        if (! (bool) ($tenant->staff_login_enabled ?? false)) {
            return response()->json([
                'message' => 'Staff logins are turned off for this business.',
                'code'    => 'staff_login_disabled',
            ], 403);
        }

        // Already linked? Clean up and return success-shaped 409 so the
        // frontend can refresh the inbox without showing an angry banner.
        if (User::where('identity_id', $authedUser->identity_id)->where('tenant_id', $tenant->id)->exists()) {
            DB::table('staff_invites')->where('id', $id)->delete();
            return response()->json([
                'message'   => 'You are already linked to this business.',
                'code'      => 'already_linked',
                'tenant_id' => $tenant->id,
            ], 409);
        }

        // Cap check.
        $tenantTier = PlanFeatures::planOf($tenant);
        if (! IdentityCapResolver::canAttach($authedUser->identity_id, $tenantTier)) {
            return response()->json([
                'message' => IdentityCapResolver::refusalMessage($tenantTier, 'You'),
                'code'    => 'identity_cap_reached',
                'tier'    => $tenantTier,
                'cap'     => IdentityCapResolver::capFor($tenantTier),
            ], 422);
        }

        // Atomic claim of the tenant.staff row. Same WHERE-clause shape as
        // StaffInviteController::accept so a concurrent email-link accept
        // and inbox accept race correctly: only one wins, the other gets
        // 409.
        tenancy()->initialize($tenant);
        if (! Schema::hasColumn('staff', 'invite_token')) {
            tenancy()->end();
            return response()->json(['message' => 'Staff logins are not available yet.'], 409);
        }

        $claimed = DB::table('staff')
            ->where('id', $invite->staff_id)
            ->where('invite_token', $invite->token_hash)
            ->whereNull('user_id')
            ->update([
                'invite_token'            => null,
                'invite_token_expires_at' => null,
                'updated_at'              => now(),
            ]);

        if ($claimed !== 1) {
            tenancy()->end();
            DB::table('staff_invites')->where('id', $id)->delete();
            return response()->json([
                'message' => 'This invite has already been used or expired.',
                'code'    => 'already_claimed',
            ], 409);
        }

        $staffRow  = DB::table('staff')->find($invite->staff_id);
        $staffName = (string) ($staffRow->name ?? $authedUser->name ?? '');
        tenancy()->end();

        // Create the central User row at the new tenant pointing at the
        // existing identity. Reuse the identity's password column so the
        // new User has a valid credential even though the user didn't
        // enter a password here.
        $newUser = User::create([
            'name'        => $staffName !== '' ? $staffName : $authedUser->name,
            'email'       => strtolower((string) $identity->email),
            'password'    => (string) $identity->password, // already hashed
            'tenant_id'   => $tenant->id,
            'is_owner'    => false,
            'is_admin'    => false,
            'role'        => 'staff',
            'staff_id'    => $invite->staff_id,
            'identity_id' => $authedUser->identity_id,
        ]);
        $newUser->forceFill([
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
            'terms_version'     => RegisterController::TERMS_VERSION,
        ])->save();

        // Write user_id back. Mirror the email-link compensation: if this
        // throws, undo the central User row + Sanctum tokens so the owner
        // can re-invite cleanly. The tenant staff row already had its
        // token nulled at claim time; that stays.
        try {
            tenancy()->initialize($tenant);
            DB::table('staff')->where('id', $invite->staff_id)->update([
                'user_id'    => $newUser->id,
                'updated_at' => now(),
            ]);
            tenancy()->end();
        } catch (\Throwable $e) {
            tenancy()->end();
            $newUser->tokens()->delete();
            $newUser->delete();
            return response()->json([
                'message' => 'We could not finish accepting this invite. Try again or ask for a new one.',
            ], 500);
        }

        // Clean up the central invite row.
        DB::table('staff_invites')->where('id', $id)->delete();

        return response()->json([
            'tenant_id'     => (string) $tenant->id,
            'business_name' => (string) ($invite->inviting_business_name ?? $tenant->id),
            'redirect_url'  => '/editor', // Stay where they are; let them switch via the sidebar dropdown.
        ]);
    }
}
