<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\EnsureAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Middleware unit-style feature tests for the admin gate.
 *
 * The middleware does not query the database — it reads $user->is_admin
 * from whatever Sanctum (or the test's setUserResolver) hands it. So
 * these tests inject a fake user via setUserResolver and assert the
 * middleware's response status + body, no migrations or HTTP routing
 * required. Fast, isolated, and exactly the behavior the production
 * stack relies on at every /admin/* route.
 */
class EnsureAdminTest extends TestCase
{
    public function test_unauthenticated_request_returns_401(): void
    {
        $request    = Request::create('/test/admin-only', 'GET');
        $middleware = new EnsureAdmin();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(401, $response->getStatusCode());
        $this->assertEquals('Unauthenticated.', $response->getData()->message);
    }

    public function test_non_admin_user_returns_403(): void
    {
        $request = Request::create('/test/admin-only', 'GET');
        $user    = new User(['is_admin' => false, 'is_owner' => true, 'tenant_id' => 'someone']);
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureAdmin();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(403, $response->getStatusCode());
        $this->assertEquals('Admin access required.', $response->getData()->message);
    }

    public function test_admin_user_passes(): void
    {
        $request = Request::create('/test/admin-only', 'GET');
        $user    = new User(['is_admin' => true]);
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureAdmin();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('ok', $response->getContent());
    }
}
