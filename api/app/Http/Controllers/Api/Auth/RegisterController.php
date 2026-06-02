<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Controller;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegisterController extends Controller
{
    /**
     * Current Terms of Service version stamped on every new user record.
     * Matches the effective date shown at the top of /terms in the web
     * app. Bump this when the Terms are materially updated AND require
     * existing users to re-accept.
     */
    public const TERMS_VERSION = '2026-05-27';

    public function __construct(
        private readonly TenantProvisioningService $provisioner
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'owner_name'     => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'unique:users,email'],
            'password'       => ['required', 'string', 'min:8', 'confirmed'],
            'business_name'  => ['required', 'string', 'max:100'],
            // Accept any of the real template slugs (dash-less canonical or
            // the legacy "the-fade-room" form). Provisioning normalizes +
            // re-validates via TemplateDefaults::normalizeSlug, so an unknown
            // value still degrades safely to the default.
            'template'       => ['sometimes', 'string', 'in:the-fade-room,thefaderoom,lushstudio,velvettheory,blackline,opaline'],
            // Explicit ToS acceptance — must be a truthy (1/true/yes/on)
            // boolean. Laravel's "accepted" rule covers all of these.
            'terms_accepted' => ['required', 'accepted'],
        ]);

        ['tenant' => $tenant, 'owner' => $owner] = $this->provisioner->provision($data);

        // Stamp the Terms acceptance on the freshly-provisioned user. Done
        // post-provision (rather than in the provisioner) so existing
        // service signatures stay stable. timestamp + version both go on
        // the central users row so an audit can prove what was on screen
        // when the user clicked. See migration
        // 2026_06_02_000001_add_terms_acceptance_to_users.
        DB::table('users')->where('id', $owner->id)->update([
            'terms_accepted_at' => now(),
            'terms_version'     => self::TERMS_VERSION,
        ]);

        $token = $owner->createToken(
            'api',
            ['*'],
            now()->addMinutes(AuthCookie::TOKEN_TTL_MIN),
        )->plainTextToken;

        // Welcome email — best-effort, never blocks signup. PlatformMailer
        // catches and logs failures internally.
        PlatformMailer::sendWelcome(
            ownerEmail:   $owner->email,
            ownerName:    $owner->name,
            businessName: $data['business_name'],
        );

        // Phase S6 part 2 — send the verify-email link. Best-effort; the
        // user can also resend from the dashboard if the first attempt
        // bounces or hits spam.
        try {
            EmailVerificationController::sendVerificationEmail($owner);
        } catch (\Throwable $e) {
            Log::warning('verify-email send failed at signup', [
                'user_id' => $owner->id,
                'error'   => $e->getMessage(),
            ]);
        }

        // Same cookie-attach flow as login. The bearer token is only sent as an httpOnly cookie.
        $response = response()
            ->json([
                'tenant_id' => $tenant->id,
                'domain'    => $tenant->domains()->first()?->domain,
                'user'      => [
                    'id'        => $owner->id,
                    'name'      => $owner->name,
                    'email'     => $owner->email,
                    'tenant_id' => $owner->tenant_id,
                    'is_owner'  => (bool) ($owner->is_owner ?? false),
                    'is_admin'  => (bool) ($owner->is_admin ?? false),
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
