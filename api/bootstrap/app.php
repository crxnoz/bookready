<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        using: function () {
            // Central routes only — tenant routes are registered by TenancyServiceProvider
            // with the InitializeTenancyBySubdomain middleware applied.
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));
        },
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Pure token-based API — no cookie/session auth needed.
        // statefulApi() would add Sanctum's CSRF middleware which blocks
        // unauthenticated POSTs from non-SPA clients.

        $middleware->alias([
            'tenancy' => \App\Http\Middleware\InitializeTenancyBySubdomain::class,
            'admin'   => \App\Http\Middleware\EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
