<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\Editor\AppointmentsController;
use App\Http\Controllers\Api\Editor\AvailabilityController;
use App\Http\Controllers\Api\Editor\BusinessPolicyController;
use App\Http\Controllers\Api\Editor\BusinessProfileController;
use App\Http\Controllers\Api\Editor\CustomersController;
use App\Http\Controllers\Api\Editor\HoursController;
use App\Http\Controllers\Api\Editor\ServicesController;
use App\Http\Controllers\Api\PublicSiteController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

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
        Route::get('plans',                              [BillingController::class, 'plans']);
        Route::post('checkout',                          [BillingController::class, 'checkout']);
        Route::get('checkout-session/{sessionId}',       [BillingController::class, 'checkoutSession']);
        Route::get('portal',                             [BillingController::class, 'portal']);
        Route::get('subscription',                       [BillingController::class, 'subscription']);
    });

    // ── Editor (central routes, manual tenancy init) ──────────────────────
    Route::middleware('auth:sanctum')->prefix('editor')->group(function () {
        Route::get('business',  [BusinessProfileController::class, 'show']);
        Route::patch('business', [BusinessProfileController::class, 'update']);

        Route::get('services',              [ServicesController::class, 'index']);
        Route::post('services',             [ServicesController::class, 'store']);
        Route::patch('services/{service}',  [ServicesController::class, 'update']);
        Route::delete('services/{service}', [ServicesController::class, 'destroy']);

        Route::get('hours',  [HoursController::class, 'index']);
        Route::patch('hours', [HoursController::class, 'update']);

        Route::get('availability',  [AvailabilityController::class, 'show']);
        Route::patch('availability', [AvailabilityController::class, 'update']);

        Route::get('policies',  [BusinessPolicyController::class, 'show']);
        Route::patch('policies', [BusinessPolicyController::class, 'update']);

        Route::get('appointments',                   [AppointmentsController::class, 'index']);
        Route::post('appointments',                  [AppointmentsController::class, 'store']);
        Route::get('appointments/{appointment}',     [AppointmentsController::class, 'show']);
        Route::patch('appointments/{appointment}',   [AppointmentsController::class, 'update']);
        Route::delete('appointments/{appointment}',  [AppointmentsController::class, 'destroy']);

        Route::get('customers', [CustomersController::class, 'index']);
    });

    // ── Stripe webhook (no auth, no CSRF) ────────────────────────────────
    // Signature verified by Cashier using STRIPE_WEBHOOK_SECRET
    Route::post('webhooks/stripe', [WebhookController::class, 'handleWebhook']);
});