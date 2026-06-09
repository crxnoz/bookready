<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\EnsureCustomerEmailVerified;
use Tests\Stubs\StubCustomerUser as CustomerUser;
use Tests\Stubs\StubUser as User;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Middleware feature tests for the customer-side email verification
 * gate (#39). Pre-launch security audit (#189) confirmed this gate is
 * load-bearing for the cancel + reschedule + integrations paths under
 * /customer/* — so we cover the three branches the middleware takes:
 *
 *   - Unauthenticated         → 401
 *   - Authenticated but wrong type (owner User on a customer route) → 401
 *   - Authenticated as customer but unverified email                → 403
 *   - Authenticated as customer with verified email                 → pass
 *
 * The "wrong type" branch is the load-bearing one — without the
 * instanceof CustomerUser check, an owner token could pass through.
 */
class EnsureCustomerEmailVerifiedTest extends TestCase
{
    public function test_unauthenticated_request_returns_401(): void
    {
        $request    = Request::create('/customer/anything', 'POST');
        $middleware = new EnsureCustomerEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_owner_user_on_customer_route_returns_401(): void
    {
        $request = Request::create('/customer/anything', 'POST');
        // An owner (App\Models\User) is not a CustomerUser. The middleware
        // must reject — otherwise an owner token could reach customer
        // surfaces. Assign email_verified_at directly because it isn't in
        // User::$fillable.
        $owner = new User(['is_owner' => true]);
        $owner->email_verified_at = now();
        $request->setUserResolver(fn () => $owner);

        $middleware = new EnsureCustomerEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_unverified_customer_returns_403_with_code(): void
    {
        $request = Request::create('/customer/anything', 'POST');
        // Default CustomerUser() has email_verified_at unset — unverified.
        $customer = new CustomerUser();
        $request->setUserResolver(fn () => $customer);

        $middleware = new EnsureCustomerEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(403, $response->getStatusCode());
        $this->assertEquals('email_unverified', $response->getData()->code);
    }

    public function test_verified_customer_passes(): void
    {
        $request = Request::create('/customer/anything', 'POST');
        $customer = new CustomerUser();
        $customer->email_verified_at = now();
        $request->setUserResolver(fn () => $customer);

        $middleware = new EnsureCustomerEmailVerified();
        $response   = $middleware->handle($request, fn () => response('ok', 200));

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('ok', $response->getContent());
    }
}
