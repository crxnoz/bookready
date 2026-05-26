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
        // Token-based API. statefulApi() would add Sanctum's CSRF
        // middleware which blocks unauthenticated POSTs from non-SPA
        // clients (the public booking endpoint, webhooks, etc.).
        //
        // Phase S6 — AuthFromCookie promotes the httpOnly bookready_token
        // cookie into an Authorization header BEFORE the auth:sanctum
        // guard runs. This is the cookie path; legacy Bearer-in-header
        // requests still work unchanged because the middleware short-
        // circuits when Authorization is already present.
        $middleware->api(prepend: [
            \App\Http\Middleware\AuthFromCookie::class,
        ]);

        $middleware->alias([
            'tenancy' => \App\Http\Middleware\InitializeTenancyBySubdomain::class,
            'admin'   => \App\Http\Middleware\EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
