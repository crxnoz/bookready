<?php

namespace App\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Stancl\Tenancy\Events\TenancyInitialized;
use Stancl\Tenancy\Events\TenancyEnded;
use Stancl\Tenancy\Listeners\BootstrapTenancy;
use Stancl\Tenancy\Listeners\RevertToCentralContext;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->registerTenancyEvents();
        $this->bootTenantRoutes();
        $this->makeTenantDatabasesCollation();
    }

    protected function registerTenancyEvents(): void
    {
        Event::listen(TenancyInitialized::class, BootstrapTenancy::class);
        Event::listen(TenancyEnded::class, RevertToCentralContext::class);
    }

    protected function bootTenantRoutes(): void
    {
        Route::middleware([
            'api',
            PreventAccessFromCentralDomains::class,
            \App\Http\Middleware\InitializeTenancyBySubdomain::class,
        ])
        ->prefix('api')
        ->group(base_path('routes/tenant.php'));
    }

    /**
     * Ensure new tenant databases are created with utf8mb4 / utf8mb4_unicode_ci
     * to match the central database.
     */
    protected function makeTenantDatabasesCollation(): void
    {
        config([
            'database.connections.mysql.charset'   => 'utf8mb4',
            'database.connections.mysql.collation' => 'utf8mb4_unicode_ci',
        ]);
    }
}
