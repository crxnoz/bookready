<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\EnsureTenantOwner;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Middleware feature tests for the tenant-owner gate. Applied to
 * /editor/* routes — must reject any user that isn't both is_owner=true
 * AND has a tenant_id stamped. Both halves matter: a tenant_id alone
 * isn't enough (admins have null tenant_id by design), and is_owner
 * alone isn't enough (legacy rows may have the flag without a tenant).
 */
class EnsureTenantOwnerTest extends TestCase
{
    public function test_unauthenticated_request_returns_401(): void
    {
        $request    = Request::create('/editor/anything', 'GET');
        $middleware = new EnsureTenantOwner();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_is_owner_false_returns_403(): void
    {
        $request = Request::create('/editor/anything', 'GET');
        $user    = new User(['is_owner' => false, 'tenant_id' => 'lushstudio']);
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureTenantOwner();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_owner_without_tenant_id_returns_403(): void
    {
        $request = Request::create('/editor/anything', 'GET');
        $user    = new User(['is_owner' => true, 'tenant_id' => null]);
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureTenantOwner();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_owner_with_tenant_id_passes(): void
    {
        $request = Request::create('/editor/anything', 'GET');
        $user    = new User(['is_owner' => true, 'tenant_id' => 'lushstudio']);
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureTenantOwner();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(200, $response->getStatusCode());
    }
}
