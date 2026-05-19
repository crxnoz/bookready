<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Services\TenantProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json([
            'token'     => $token,
            'tenant_id' => $tenant->id,
            'domain'    => $tenant->domains()->first()?->domain,
            'user'      => [
                'id'    => $owner->id,
                'name'  => $owner->name,
                'email' => $owner->email,
            ],
        ], 201);
    }
}
