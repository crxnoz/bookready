<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\PublicSiteController;
use Illuminate\Support\Facades\Route;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;

/*
|--------------------------------------------------------------------------
| Central / Landlord API Routes
|--------------------------------------------------------------------------
| These routes run on the central database (no tenant context).
| Auth here creates or validates the central User record.
|
*/

Route::prefix('v1')->group(function () {

    // ── Public tenant lookup (no auth) ────────────────────────────────────
    Route::get('public/sites/{slug}', [PublicSiteController::class, 'show']);

    // ── Authentication (central) ───────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [RegisterController::class, 'store']);
        Route::post('login',    [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',      [AuthController::class, 'me']);
        });
    });

    // ── Billing / subscription management ─────────────────────────────────
    Route::middleware('auth:sanctum')->prefix('billing')->group(function () {
        Route::get('plans',           [BillingController::class, 'plans']);
        Route::post('checkout',       [BillingController::class, 'checkout']);
        Route::get('portal',          [BillingController::class, 'portal']);
        Route::get('subscription',    [BillingController::class, 'subscription']);
    });

    // ── Stripe webhook (no auth, no CSRF) — routed directly to Cashier ────
    Route::post('webhooks/stripe', [CashierWebhookController::class, 'handleWebhook']);
});