<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Controller;
use App\Models\Identity;
use App\Models\SignupDraft;
use App\Models\User;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class RegisterController extends Controller
{
    /**
     * Current Terms of Service version stamped on every new user record.
     * Matches the effective date shown at the top of /terms in the web
     * app. Bump this when the Terms are materially updated AND require
     * existing users to re-accept.
     */
    public const TERMS_VERSION = '2026-06-04';

    public function store(Request $request): JsonResponse
    {
        // #159 — Conflict check BEFORE validation. If the email already
        // exists as an identity, surface a "sign in instead" 422 with
        // the existing role so the frontend can route them. This is
        // the "Block + ask to sign in" UX per founder decision.
        $emailIn = strtolower(trim((string) $request->input('email')));
        if ($emailIn && Schema::hasTable('identities')) {
            $existing = Identity::with(['user', 'customerUser'])->where('email', $emailIn)->first();
            if ($existing) {
                if ($existing->user) {
                    return response()->json([
                        'message'       => 'An owner account already exists with this email. Sign in instead.',
                        'existing_role' => 'owner',
                        'redirect_url'  => '/login',
                    ], 422);
                }
                if ($existing->customerUser) {
                    return response()->json([
                        'message'       => 'You already have a customer account with this email. Sign in to your customer account, then use "Become a business owner" from your dashboard.',
                        'existing_role' => 'customer',
                        'redirect_url'  => '/account/login',
                    ], 422);
                }
            }
        }

        // Signup redesign v2 — registration is now ONLY identity. No
        // business name, no template, no tenant provisioning. Steps 3+4
        // (/signup/business + /signup/website) collect the rest and
        // provisioning fires at Step 4 submit. This shortens the form
        // to 4 fields + ToS + Turnstile and drops first-screen friction.
        $data = $request->validate([
            'owner_name'     => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'unique:users,email'],
            'password'       => ['required', 'string', 'min:8', 'confirmed'],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        // Create the user with NO tenant. tenant_id stays null until
        // /signup/website provisions one and updates the row. Use a
        // central DB::transaction so a mid-step failure rolls back the
        // user + draft together — no orphan rows.
        $owner = DB::transaction(function () use ($data) {
            $owner = User::create([
                'name'              => $data['owner_name'],
                'email'             => $data['email'],
                'password'          => Hash::make($data['password']),
                'tenant_id'         => null,
                'is_owner'          => true,
                'terms_accepted_at' => now(),
                'terms_version'     => self::TERMS_VERSION,
            ]);
            if (Schema::hasTable('signup_drafts')) {
                SignupDraft::create(['user_id' => $owner->id]);
            }
            return $owner;
        });

        // #159 — Create the unified identity row and link the new user
        // to it. Password mirrors the just-hashed users.password so the
        // identity has a valid credential from day one. Guarded by
        // Schema check so the controller stays bootable on environments
        // where the create-identities migration hasn't run yet.
        //
        // Adopt orphan identities. The pre-check above refuses signups
        // when an identity is LINKED to a user or customer_user, but it
        // doesn't refuse unlinked orphans — those can land in the table
        // when a prior signup attempt died after the identity insert but
        // before the user link, or when a customer auth flow failed
        // mid-write. If we treated orphans as hard blocks the user would
        // be permanently locked out of their own email. Instead we
        // upsert: if a row with this email exists, refresh it with the
        // new owner's credentials and reuse its id; otherwise insert
        // fresh. Defends against a real 500 we hit 2026-06-11 on
        // RegisterController:97.
        if (Schema::hasTable('identities')) {
            $identityEmail = strtolower($owner->email);
            $existingIdentityId = DB::table('identities')
                ->where('email', $identityEmail)
                ->value('id');

            if ($existingIdentityId) {
                DB::table('identities')->where('id', $existingIdentityId)->update([
                    'password'          => $owner->password,
                    'name'              => $owner->name,
                    'email_verified_at' => $owner->email_verified_at,
                    'updated_at'        => now(),
                ]);
                $identityId = $existingIdentityId;
            } else {
                $identityId = DB::table('identities')->insertGetId([
                    'email'             => $identityEmail,
                    'password'          => $owner->password,
                    'name'              => $owner->name,
                    'phone'             => null,
                    'email_verified_at' => $owner->email_verified_at,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }
            DB::table('users')->where('id', $owner->id)->update(['identity_id' => $identityId]);
        }

        $token = $owner->createToken(
            'api',
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        // Welcome email moves to /signup/website (when the site is real
        // and we have a URL to celebrate). Skipping it here keeps the
        // registration response fast.

        // Send the verify-email code. Best-effort; the user can resend
        // from /verify-email if the first attempt bounces.
        try {
            EmailVerificationController::sendVerificationEmail($owner);
        } catch (\Throwable $e) {
            Log::warning('verify-email send failed at signup', [
                'user_id' => $owner->id,
                'error'   => $e->getMessage(),
            ]);
        }

        // Cookie-attach is identical to login.
        $response = response()
            ->json([
                'tenant_id' => null,
                'domain'    => null,
                'user'      => [
                    'id'        => $owner->id,
                    'name'      => $owner->name,
                    'email'     => $owner->email,
                    'tenant_id' => null,
                    'is_owner'  => true,
                    'is_admin'  => false,
                ],
            ], 201)
            ->withCookie(AuthCookie::make($token));

        // Phase S6+ — only attach the legacy-domain delete cookie when the
        // request actually has a stale bookready_token. Otherwise we
        // double-stack same-named Set-Cookie headers and Chrome incognito
        // rejects the response. See AuthController::login for the full
        // explanation.
        if ($request->cookies->has(AuthCookie::NAME)) {
            $response->withCookie(AuthCookie::forgetLegacySharedDomain());
        }

        return $response;
    }
}
