<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Controller;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RegisterController extends Controller
{
    public function __construct(
        private readonly TenantProvisioningService $provisioner
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'owner_name'    => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:8', 'confirmed'],
            'business_name' => ['required', 'string', 'max:100'],
            'template'      => ['sometimes', 'string', 'in:the-fade-room'],
        ]);

        ['tenant' => $tenant, 'owner' => $owner] = $this->provisioner->provision($data);

        $token = $owner->createToken('api')->plainTextToken;

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
        return response()
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
            ->withCookie(AuthCookie::make($token))
            ->withCookie(AuthCookie::forgetLegacySharedDomain());
    }
}
