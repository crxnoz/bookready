<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\EnsureEmailVerified;
use Tests\Stubs\StubUser as User;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Middleware unit-style feature tests for the owner-side email
 * verification gate. The middleware blocks any state-changing route
 * for an authenticated owner whose email_verified_at is still null.
 *
 * Same pattern as EnsureAdminTest — inject a fake user via
 * setUserResolver and assert the middleware response.
 */
class EnsureEmailVerifiedTest extends TestCase
{
    public function test_unauthenticated_request_returns_401(): void
    {
        $request    = Request::create('/editor/anything', 'PATCH');
        $middleware = new EnsureEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_unverified_user_returns_403_with_code(): void
    {
        $request = Request::create('/editor/anything', 'PATCH');
        // Default User() has email_verified_at unset (null) — the
        // unverified state we want to test.
        $user = new User();
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(403, $response->getStatusCode());
        // The frontend AccountShell looks for code='email_unverified' to
        // pick the verify-email banner over a generic toast. If we ever
        // rename the code, frontend has to follow.
        $this->assertEquals('email_unverified', $response->getData()->code);
    }

    public function test_verified_user_passes(): void
    {
        $request = Request::create('/editor/anything', 'PATCH');
        // email_verified_at is NOT in User::$fillable, so mass-assignment
        // via the constructor silently drops it. Assign directly.
        $user = new User();
        $user->email_verified_at = now();
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('ok', $response->getContent());
    }
}
