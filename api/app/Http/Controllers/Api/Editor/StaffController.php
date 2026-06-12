<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PlatformMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class StaffController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'         => (int)  $row->id,
            'name'       =>         $row->name,
            'role'       =>         $row->role,
            'bio'        =>         $row->bio,
            'email'      =>         $row->email      ?? null,
            'phone'      =>         $row->phone      ?? null,
            'photo_url'  =>         $row->avatar_url ?? null,
            'is_active'  => (bool)  $row->is_active,
            'sort_order' => (int)   $row->sort_order,
            'created_at' =>         $row->created_at,
            'updated_at' =>         $row->updated_at,
            // Wave D — derived login status drives the StaffEditor pill +
            // invite/revoke affordances. 'active' once linked to a central
            // users row; 'invited' while a single-use token is pending and
            // unexpired; otherwise 'none'. Guarded against the pre-migration
            // schema (Wave D tenant migration adds these columns) so the
            // staff list never crashes if a tenant hasn't migrated yet.
            'login_status' => $this->loginStatusOf($row),
        ];
    }

    // Resolve the Wave D login status for a staff row. Defensive against
    // the columns not existing yet (tenants:migrate may not have run).
    private function loginStatusOf(object $row): string
    {
        if (! Schema::hasColumn('staff', 'user_id')) {
            return 'none';
        }
        if (! empty($row->user_id)) {
            return 'active';
        }
        // A pending invite: token still set AND not past its expiry.
        $hasToken = ! empty($row->invite_token ?? null);
        if ($hasToken) {
            $expires = $row->invite_token_expires_at ?? null;
            if ($expires === null || strtotime((string) $expires) > time()) {
                return 'invited';
            }
        }
        return 'none';
    }

    // Shared login teardown for a staff row. MUST be called while tenancy
    // is ACTIVE for the staff-row writes; it ends tenancy itself before the
    // central-DB cleanup, since `users` lives in the central DB and querying
    // it under the tenant connection 500s.
    //
    // Steps:
    //   1. (tenant scope) NULL out the soft pointer + invite columns on the
    //      staff row. NULL (never 0) so the UNIQUE index allows multiple
    //      severed rows.
    //   2. end tenancy.
    //   3. (central scope) delete the linked users row and revoke its Sanctum
    //      tokens — scoped to id + tenant_id + role=staff so it can NEVER
    //      remove an owner or a cross-tenant user.
    //
    // Pass the linked user_id captured from the staff row BEFORE the staff
    // write zeroed it out. Used by both revokeLogin() and destroy().
    private function tearDownStaffLogin(Tenant $tenant, int $staff, ?int $linkedUserId): void
    {
        DB::table('staff')->where('id', $staff)->update([
            'user_id'                 => null,
            'invite_token'            => null,
            'invite_token_expires_at' => null,
            'invited_at'              => null,
            'updated_at'              => now(),
        ]);

        tenancy()->end();

        // Central-DB cleanup: revoke tokens + delete the staff login row.
        // Only touch a user that is actually a staff login for THIS tenant
        // — never an owner row, never a cross-tenant row.
        if ($linkedUserId !== null) {
            $user = User::where('id', $linkedUserId)
                ->where('tenant_id', $tenant->id)
                ->where('role', 'staff')
                ->first();
            if ($user) {
                $user->tokens()->delete();
                $user->delete();
            }
        }
    }

    // GET /editor/staff
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('staff')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        $staff = $query->get()->map(fn ($r) => $this->format($r))->values()->all();

        tenancy()->end();

        return response()->json($staff);
    }

    // POST /editor/staff
    public function store(Request $request): JsonResponse
    {
        // Phase 2: email is now required on create (column is NOT NULL).
        // Existing legacy rows that were backfilled with a placeholder are
        // updated through the PATCH path, which keeps the email rule loose
        // enough to accept a real email replacement without forcing a
        // simultaneous edit of every other field.
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'required|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        // Plan gate: refuse if the tenant is at their staff seats cap.
        // Counts only ACTIVE staff so deactivating frees a seat without
        // a hard delete. PlanFeatures returns the most-restrictive
        // default (Solo's 1) when the plan is missing or unrecognized,
        // so this never accidentally lets a misconfigured tenant past
        // the gate. Frontend reads `code` + `limit` + `upgrade_to` to
        // render the "Upgrade to Studio" CTA in place of the add button.
        $seatLimit = \App\Services\PlanFeatures::staffSeatsFor($tenant);

        tenancy()->initialize($tenant);

        $activeCount = (int) DB::table('staff')->where('is_active', 1)->count();
        if ($activeCount >= $seatLimit) {
            tenancy()->end();
            $currentPlan = \App\Services\PlanFeatures::planOf($tenant);
            return response()->json([
                'message'    => 'Your plan includes ' . $seatLimit . ' staff seat' . ($seatLimit === 1 ? '' : 's') . '. Upgrade your plan to add more.',
                'code'       => 'plan_limit_reached',
                'limit'      => $seatLimit,
                'current'    => $activeCount,
                'upgrade_to' => $currentPlan === 'solo' ? 'studio' : 'salon',
            ], 422);
        }

        $nextOrder = (int) DB::table('staff')->max('sort_order') + 1;

        $id = DB::table('staff')->insertGetId([
            'name'       => $validated['name'],
            'role'       => $validated['role']       ?? null,
            'bio'        => $validated['bio']        ?? null,
            'email'      => $validated['email']      ?? null,
            'phone'      => $validated['phone']      ?? null,
            'avatar_url' => $validated['photo_url']  ?? null,
            'is_active'  => $validated['is_active']  ?? true,
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row    = DB::table('staff')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    // GET /editor/staff/{staff}
    //
    // In the tenant_member group: owners can read any staff row; a staff
    // login can read ONLY its own (the "My profile" view). Cross-staff
    // access 404s (not 403) so other rows aren't enumerable.
    public function show(Request $request, int $staff): JsonResponse
    {
        $user       = $request->user();
        // Fail CLOSED: scope/self-match applies to ANY non-owner, computed
        // from is_owner rather than role === 'staff'. If the role column ever
        // drifts (NULL/unexpected value), a role-based check would fail OPEN
        // and expose every staff row; an owner-based check still restricts.
        $isScoped   = ! ($user->is_owner ?? false);
        $ownStaffId = $user->staff_id !== null ? (int) $user->staff_id : null;

        if ($isScoped && ($ownStaffId === null || $ownStaffId !== $staff)) {
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $tenant = Tenant::findOrFail($user->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    // PATCH /editor/staff/{staff}
    public function update(Request $request, int $staff): JsonResponse
    {
        // Same shape as store(), but email can be omitted to leave the
        // current value untouched. When present it still has to be valid.
        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'sometimes|required|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        // Wave D — a logged-in staff member may edit ONLY their own profile
        // and ONLY bio/phone/photo_url. name/role/email/is_active/
        // sort_order stay owner-controlled (email especially, since it
        // would drift from the central users identity). Resolve role +
        // staff_id from the central users row BEFORE tenancy.
        $user      = $request->user();
        // Fail CLOSED: any caller that is NOT an owner is scoped to their own
        // row + the bio/phone/photo_url whitelist, computed from is_owner
        // rather than role === 'staff'. A role-based check would fail OPEN if
        // the role column drifted (NULL/unexpected) and let a non-owner edit
        // owner-controlled fields on any row.
        $isScoped   = ! ($user->is_owner ?? false);
        $ownStaffId = $user->staff_id !== null ? (int) $user->staff_id : null;

        if ($isScoped) {
            // Self-match: a non-owner can only target their own row. 404
            // (not 403) so other staff rows aren't enumerable. A null
            // staff_id can never match.
            if ($ownStaffId === null || $ownStaffId !== $staff) {
                return response()->json(['message' => 'Staff member not found'], 404);
            }
            // Restrict the editable field set.
            $validated = array_intersect_key($validated, array_flip(['bio', 'phone', 'photo_url']));
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $data = ['updated_at' => now()];

        foreach (['name', 'role', 'bio', 'email', 'phone'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }

        if (array_key_exists('photo_url', $validated)) {
            $data['avatar_url'] = $validated['photo_url'];
        }

        if (array_key_exists('is_active', $validated)) {
            $data['is_active'] = $validated['is_active'];
        }

        if (array_key_exists('sort_order', $validated)) {
            $data['sort_order'] = $validated['sort_order'];
        }

        DB::table('staff')->where('id', $staff)->update($data);
        $updated = DB::table('staff')->find($staff);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    // DELETE /editor/staff/{staff}
    // Soft archive: sets is_active = false, preserves the record.
    public function destroy(Request $request, int $staff): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        // Capture the linked login BEFORE the teardown nulls user_id, so the
        // central users row + tokens can be removed. Archiving a staff member
        // MUST sever their login — otherwise the central session lives on for
        // its full 30-day window. (DESTROY-1.)
        $linkedUserId = (Schema::hasColumn('staff', 'user_id') && $row->user_id !== null)
            ? (int) $row->user_id
            : null;

        DB::table('staff')->where('id', $staff)->update([
            'is_active'  => false,
            'updated_at' => now(),
        ]);

        // Snapshot the archived row for the response BEFORE the shared
        // teardown ends tenancy. Reflect the severed login on the snapshot so
        // login_status comes back as 'none' (the teardown about to run nulls
        // these columns; mirror revokeLogin()'s post-null response shape).
        $updated = DB::table('staff')->find($staff);
        if ($updated) {
            $updated->user_id                 = null;
            $updated->invite_token            = null;
            $updated->invite_token_expires_at = null;
        }
        $result = $this->format($updated);

        // Shared teardown: nulls the soft pointer + invite columns, ends
        // tenancy, then deletes the central login scoped to tenant + staff.
        $this->tearDownStaffLogin($tenant, $staff, $linkedUserId);

        return response()->json($result);
    }

    // POST /editor/staff/{staff}/invite
    //
    // Owner-only (route is in the tenant_owner group). Generates a
    // single-use accept-invite token, stores its HASH + 24h expiry on the
    // staff row, and emails the staff member a link to set a password.
    //
    // Wave D refusals:
    //   - 403 when the tenant's staff_login_enabled master switch is off.
    //   - 422 when the staff row has no real email to send to.
    //   - 422 when that email already belongs to ANY central user (owner
    //     OR staff). v1 is single-identity-per-email: multi-tenant staff
    //     identity is v2, so we refuse rather than silently re-link.
    public function sendInvite(Request $request, int $staff): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        // Master kill switch — read from the central tenants row before
        // initializing tenancy.
        if (! (bool) ($tenant->staff_login_enabled ?? false)) {
            return response()->json([
                'message' => 'Staff logins are turned off for this business.',
                'code'    => 'staff_login_disabled',
            ], 403);
        }

        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('staff', 'invite_token')) {
            tenancy()->end();
            return response()->json(['message' => 'Staff logins are not available yet.'], 409);
        }

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $email = strtolower(trim((string) ($row->email ?? '')));
        // Guard against the legacy placeholder backfill (no '@') and empty.
        if ($email === '' || ! str_contains($email, '@')) {
            tenancy()->end();
            return response()->json([
                'message' => 'Add a real email to this staff member before inviting them.',
                'code'    => 'staff_email_missing',
            ], 422);
        }

        // Already linked to a login? Nothing to do.
        if (! empty($row->user_id)) {
            tenancy()->end();
            return response()->json([
                'message' => 'This staff member already has a login.',
                'code'    => 'already_linked',
            ], 422);
        }

        // Flatten everything we need (staff name + business name) BEFORE
        // leaving tenant scope — the central-DB user check and the email
        // both happen outside tenancy.
        $staffName    = (string) ($row->name ?? 'there');
        $businessName = (string) (
            (Schema::hasTable('business_profiles')
                ? DB::table('business_profiles')->value('business_name')
                : null)
            ?: $tenant->id
        );

        tenancy()->end();

        // v2 Theme 1 — multi-tenant staff identity (chair-renter case).
        // Refusals tighten to:
        //   (a) email already has a User AT THIS TENANT → already linked,
        //   (b) email's identity is at the per-tier cap → overflow path.
        //
        // Cross-tenant linkages (User at a DIFFERENT tenant) are now
        // ALLOWED if under cap — the staff member signs in with their
        // existing cross-tenant credential and the dropdown handles
        // switching context. Per-tier caps live in IdentityCapResolver
        // and reflect the founder's 1 Solo / 2 Studios policy.
        //
        // MUST run with tenancy ENDED — `users` and `tenants` live in the
        // central DB, so querying them while the tenant connection is
        // active 500s with "Table tenant_*.users doesn't exist."
        $userAtThisTenant = User::where('email', $email)
            ->where('tenant_id', $tenant->id)
            ->exists();
        if ($userAtThisTenant) {
            return response()->json([
                'message' => 'This email already has a login at your business. They cannot be invited again.',
                'code'    => 'email_already_at_this_tenant',
            ], 422);
        }

        $existingIdentity = Schema::hasTable('identities')
            ? DB::table('identities')->where('email', $email)->first()
            : null;
        if ($existingIdentity) {
            $tenantTier = \App\Services\PlanFeatures::planOf($tenant);
            if (! \App\Services\IdentityCapResolver::canAttach((int) $existingIdentity->id, $tenantTier)) {
                return response()->json([
                    'message' => \App\Services\IdentityCapResolver::refusalMessage($tenantTier, 'They'),
                    'code'    => 'identity_cap_reached',
                    'tier'    => $tenantTier,
                    'cap'     => \App\Services\IdentityCapResolver::capFor($tenantTier),
                ], 422);
            }
        }

        // Single-use token: send the PLAIN value in the email, store only
        // its hash. 24h expiry. Re-enter tenant scope just to write it back.
        $plain     = Str::random(48);
        $tokenHash = hash('sha256', $plain);
        $expires   = now()->addHours(24);

        tenancy()->initialize($tenant);
        DB::table('staff')->where('id', $staff)->update([
            'invite_token'            => $tokenHash,
            'invite_token_expires_at' => $expires,
            'invited_at'              => now(),
            'updated_at'              => now(),
        ]);
        tenancy()->end();

        // v2 Theme 1 (task #233) — also write a central staff_invites row
        // so the in-editor invite inbox can list pending invites for an
        // identity in one query. updateOrInsert handles resend cleanly
        // (overwrites the prior token_hash + expires_at + updated_at).
        // Schema-guarded so the controller stays bootable on
        // pre-migration environments.
        if (Schema::hasTable('staff_invites')) {
            DB::table('staff_invites')->updateOrInsert(
                ['tenant_id' => $tenant->id, 'staff_id' => $staff],
                [
                    'email'                  => $email,
                    'token_hash'             => $tokenHash,
                    'expires_at'             => $expires,
                    'invited_by_user_id'     => $request->user()?->id,
                    'inviting_business_name' => $businessName,
                    'inviting_staff_name'    => $staffName,
                    'updated_at'             => now(),
                    'created_at'             => now(),
                ]
            );
        }

        $acceptUrl = 'https://app.bkrdy.me/staff/accept-invite?'
            . http_build_query(['token' => $plain, 'tenant' => $tenant->id]);

        PlatformMailer::sendStaffInvite(
            staffEmail:   $email,
            staffName:    $staffName,
            businessName: $businessName,
            acceptUrl:    $acceptUrl,
        );

        return response()->json([
            'message'    => 'Invite sent.',
            'invited_at' => now()->toAtomString(),
            'expires_at' => $expires->toAtomString(),
        ]);
    }

    // POST /editor/staff/{staff}/revoke-login
    //
    // Owner-only. Severs a staff member's login: clears the soft pointer +
    // invite columns on the tenant staff row, then deletes the linked
    // central users row and revokes its Sanctum tokens. NULL (never 0) is
    // written to user_id so the UNIQUE index allows multiple revoked rows.
    public function revokeLogin(Request $request, int $staff): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('staff', 'user_id')) {
            tenancy()->end();
            return response()->json(['message' => 'Staff logins are not available yet.'], 409);
        }

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $linkedUserId = $row->user_id !== null ? (int) $row->user_id : null;

        // Flatten the severed-state snapshot before leaving tenant scope so we
        // can return it. The shared teardown (below) nulls these columns; mirror
        // the post-null state here so login_status comes back as 'none'.
        $row->user_id                 = null;
        $row->invite_token            = null;
        $row->invite_token_expires_at = null;
        $result = $this->format($row);

        // Shared teardown: nulls the soft pointer + invite columns, ends
        // tenancy, then deletes the central login scoped to tenant + staff.
        $this->tearDownStaffLogin($tenant, $staff, $linkedUserId);

        return response()->json($result);
    }
}
