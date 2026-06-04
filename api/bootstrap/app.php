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
            'tenancy'                  => \App\Http\Middleware\InitializeTenancyBySubdomain::class,
            'admin'                    => \App\Http\Middleware\EnsureAdmin::class,
            'verified_email'           => \App\Http\Middleware\EnsureEmailVerified::class,
            'tenant_owner'             => \App\Http\Middleware\EnsureTenantOwner::class,
            'trusted_origin'           => \App\Http\Middleware\EnsureTrustedBrowserOrigin::class,
            // #161 — Cloudflare Turnstile gate on signup + sensitive auth
            // endpoints. Reads turnstile_token from JSON body, 422s on
            // verification failure. Disable via TURNSTILE_DISABLED=true.
            'turnstile'                => \App\Http\Middleware\VerifyTurnstile::class,
            // Phase 2 customer-accounts aliases. Mirror of owner's
            // verified_email + tenant_owner pair, but for the
            // CustomerUser tokenable. Applied to /customer/* routes.
            'customer_session'         => \App\Http\Middleware\EnsureCustomerSession::class,
            'customer_verified_email'  => \App\Http\Middleware\EnsureCustomerEmailVerified::class,
        ]);

        // Phase S6 — disable the default "redirect guests to route('login')"
        // behavior. Laravel 11 ships with a default redirectGuestsTo
        // callback that tries to resolve a `login` named route; we're an
        // API-only app and don't define one, so the callback throws
        // RouteNotFoundException and surfaces as a 500 for any non-JSON
        // request to a protected endpoint. Returning null makes
        // Authenticate->redirectTo() return null, AuthenticationException
        // is thrown cleanly, and our exception handler (below) renders
        // it as 401 JSON.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Phase S6 — force JSON responses for /api/* paths regardless of
        // the request's Accept header. Without this, Laravel's
        // Authenticate middleware tries to redirect unauthenticated
        // HTML-accepting requests to route('login'), which doesn't exist
        // in this API-only application — that throws RouteNotFoundException
        // and surfaces as a 500. Pinning JSON keeps everything as proper
        // 401/422/etc responses.
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));
    })->create();
