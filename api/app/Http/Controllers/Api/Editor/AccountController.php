<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Controller;
use App\Mail\EmailChangedMail;
use App\Mail\PasswordChangedMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Account Settings — owner profile + password + session management.
 *
 * Lives on the CENTRAL database (no tenancy()->initialize() needed) —
 * the User model lives in the central bookready_central DB just like
 * personal_access_tokens. Stripe SaaS subscription wiring and Cashier
 * are intentionally untouched here.
 */
class AccountController extends Controller
{
    /**
     * Plain-array snapshot of the owner's account profile.
     */
    private function format($user): array
    {
        return [
            'id'         => (int) $user->id,
            'name'       =>        $user->name,
            'email'      =>        $user->email,
            'is_owner'   => (bool) ($user->is_owner ?? false),
            'tenant_id'  =>        $user->tenant_id,
            'created_at' =>        $user->created_at,
            'updated_at' =>        $user->updated_at,
        ];
    }

    // GET /editor/account
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->format($request->user()));
    }

    // PATCH /editor/account
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'sometimes|string|min:1|max:100',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $oldEmail = $user->email;

        if (array_key_exists('name', $validated))  $user->name  = $validated['name'];
        if (array_key_exists('email', $validated)) $user->email = $validated['email'];

        $emailChanged = $user->isDirty('email');
        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        if ($user->isDirty()) {
            $user->save();
        }

        // Security notice when email changes — sent to BOTH old + new so
        // the legit user always sees it even if their account was hijacked.
        if ($emailChanged) {
            $changedAt = now()->toRfc2822String();
            try {
                Mail::to($oldEmail)->send(new EmailChangedMail(
                    ownerName:     $user->name,
                    oldEmail:      $oldEmail,
                    newEmail:      $user->email,
                    changedAt:     $changedAt,
                    recipientRole: 'old',
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] EmailChangedMail to old address failed', [
                    'old_email' => $oldEmail, 'error' => $e->getMessage(),
                ]);
            }
            try {
                Mail::to($user->email)->send(new EmailChangedMail(
                    ownerName:     $user->name,
                    oldEmail:      $oldEmail,
                    newEmail:      $user->email,
                    changedAt:     $changedAt,
                    recipientRole: 'new',
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] EmailChangedMail to new address failed', [
                    'new_email' => $user->email, 'error' => $e->getMessage(),
                ]);
            }

            try {
                EmailVerificationController::sendVerificationEmail($user);
            } catch (\Throwable $e) {
                Log::warning('verify-email send failed after email change', [
                    'user_id' => $user->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        return response()->json($this->format($user->refresh()));
    }

    // POST /editor/account/password
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        // After #159, the canonical password lives on identities.password
        // (that's what login checks). users.password is kept in sync but
        // is no longer authoritative — check against identities first so
        // a previously-busted password reset can't trap a user behind
        // their own stale users.password hash.
        $identityHash = null;
        if ($user->identity_id) {
            $identityHash = DB::table('identities')->where('id', $user->identity_id)->value('password');
        }
        $authoritativeHash = $identityHash ?: $user->password;

        if (! Hash::check($validated['current_password'], $authoritativeHash)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        // Write to BOTH users.password AND identities.password so login
        // sees the new hash. Skipping either side silently breaks the user.
        $hash = Hash::make($validated['new_password']);
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

        // Phase S6 followup — revoke every other Sanctum token after a
        // successful password change. If an attacker had stolen the old
        // password and is currently signed in, their token survives the
        // password rotation unless we kill it here. Preserve the current
        // request's token so the user isn't logged out of the tab they
        // just changed the password in.
        $currentTokenId = $request->user()->currentAccessToken()?->id;
        $query = $user->tokens();
        if ($currentTokenId) {
            $query->where('id', '!=', $currentTokenId);
        }
        $revoked = (int) $query->count();
        $query->delete();

        // Security notice. Best-effort — don't block the response on mail failure.
        try {
            Mail::to($user->email)->send(new PasswordChangedMail(
                ownerName: $user->name,
                changedAt: now()->toRfc2822String(),
            ));
        } catch (\Throwable $e) {
            Log::error('[BookReady] PasswordChangedMail failed', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message'        => 'Password updated.',
            'revoked_count'  => $revoked,
        ]);
    }

    // POST /editor/account/sign-out-everywhere
    // Revokes every Sanctum token for this user EXCEPT the one on this request.
    public function signOutEverywhere(Request $request): JsonResponse
    {
        $user           = $request->user();
        $currentTokenId = $request->user()->currentAccessToken()?->id;

        $query = $user->tokens();
        if ($currentTokenId) {
            $query->where('id', '!=', $currentTokenId);
        }
        $revoked = $query->count();
        $query->delete();

        return response()->json([
            'message'        => 'Other sessions signed out.',
            'revoked_count'  => (int) $revoked,
        ]);
    }

    /**
     * GET /editor/account/welcome-state
     *
     * Whether the operator has dismissed the first-run /editor tour.
     * Used by the dashboard mount to decide whether to show the
     * WelcomeTour overlay. Tiny payload — no need to bundle it into
     * /auth/me (which is owned by the auth track).
     */
    public function welcomeState(Request $request): JsonResponse
    {
        return response()->json([
            'welcomed' => $request->user()->welcomed_at !== null,
        ]);
    }

    /**
     * POST /editor/account/welcomed
     *
     * Stamp users.welcomed_at = now() so the tour never shows again
     * for this user. Idempotent — re-dismissing is harmless.
     */
    public function markWelcomed(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->welcomed_at === null) {
            $user->welcomed_at = now();
            $user->save();
        }
        return response()->json(['welcomed' => true]);
    }
}
