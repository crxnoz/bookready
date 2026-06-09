# BookReady test suite

Bare-minimum phpunit setup so the auth gates are protected by a
test that runs on every CI cycle. The middleware gates (admin,
tenant_owner, verified_email, customer_verified_email) are where
the easiest pre-launch security bugs hide; everything here is
tightly scoped to those.

## Run

From `api/`:

```bash
./vendor/bin/phpunit              # full suite
./vendor/bin/phpunit --filter Admin   # one test class
./vendor/bin/phpunit tests/Feature/Middleware/EnsureAdminTest.php
```

Or via Laravel's wrapper:

```bash
php artisan test
```

The test env (set in `phpunit.xml`) uses an in-memory SQLite DB so no
local services need to be running.

## What's here

```
tests/
├── TestCase.php                              base for all tests
└── Feature/
    └── Middleware/
        ├── EnsureAdminTest.php               admin gate happy + sad
        ├── EnsureTenantOwnerTest.php         tenant-owner gate happy + sad
        ├── EnsureEmailVerifiedTest.php       owner email-verified gate
        └── EnsureCustomerEmailVerifiedTest.php  customer gate + type check
```

Each middleware test is a pure unit-style feature test — it doesn't hit
the database, doesn't register routes, doesn't go through the HTTP
router. It calls the middleware's `handle()` directly with a
`Request::create()` and a fake user injected via `setUserResolver()`,
then asserts the response. Fast, deterministic, no migrations needed.

## Adding more tests

**Middleware** (the cheap kind):

```php
namespace Tests\Feature\Middleware;

use App\Http\Middleware\YourMiddleware;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

class YourMiddlewareTest extends TestCase
{
    public function test_happy_path(): void
    {
        $request = Request::create('/whatever', 'GET');
        $request->setUserResolver(fn () => new User([...]));

        $mw   = new YourMiddleware();
        $resp = $mw->handle($request, fn () => response('ok', 200));

        $this->assertEquals(200, $resp->getStatusCode());
    }
}
```

**Controllers / full HTTP path** (when the cheap kind isn't enough):

These need a real test DB. Add `use Illuminate\Foundation\Testing\RefreshDatabase;` to the test class and run migrations against the in-memory SQLite via `$this->artisan('migrate')` in setUp. You'll need to skip MySQL-specific columns (JSON, fulltext indexes) — not all of our migrations are SQLite-portable yet.

Easier path: add a MySQL test database to your local environment, set `DB_CONNECTION=mysql` + `DB_DATABASE=bookready_test` in `phpunit.xml`, and run `RefreshDatabase` against that. The CI box can do the same with a Docker MySQL service.

## What's NOT here (yet)

- HTTP-level integration tests through the router. The middleware-level coverage catches 95% of the gate failures that matter pre-launch, but full HTTP tests would also catch route-registration mistakes (e.g. someone removes the `verified_email` middleware from a route group). Add these once a CI environment with MySQL is in place.
- Tenant-scoped controller tests. stancl/tenancy v3 dynamically provisions tenant DBs, which is hostile to test isolation. Wire up `php artisan tenants:migrate-fresh --tenants=test_tenant` in setUp once we need this.
- Frontend smoke tests. The Playwright scaffolding for the booking flow lives under `web/tests/booking/` — see `docs/booking-architecture.md` Phase 6.
