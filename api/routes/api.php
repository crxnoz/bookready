<?php

use App\Http\Controllers\Api\AppointmentPaymentWebhookController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\Editor\AppointmentsController;
use App\Http\Controllers\Api\Editor\AvailabilityController;
use App\Http\Controllers\Api\Editor\BusinessPolicyController;
use App\Http\Controllers\Api\Editor\BusinessProfileController;
use App\Http\Controllers\Api\Editor\CustomersController;
use App\Http\Controllers\Api\Editor\HoursController;
use App\Http\Controllers\Api\Editor\BookingSettingsController;
use App\Http\Controllers\Api\Editor\NotificationSettingsController;
use App\Http\Controllers\Api\Editor\PaymentSettingsController;
use App\Http\Controllers\Api\Editor\StripeConnectController;
use App\Http\Controllers\Api\Editor\BeforeAfterItemsController;
use App\Http\Controllers\Api\Editor\GalleryItemsController;
use App\Http\Controllers\Api\Editor\ServicesController;
use App\Http\Controllers\Api\Editor\StaffController;
use App\Http\Controllers\Api\Editor\UploadsController;
use App\Http\Controllers\Api\Editor\WebsiteSectionsController;
use App\Http\Controllers\Api\Editor\WebsiteTemplateController;
use App\Http\Controllers\Api\PublicAvailabilityController;
use App\Http\Controllers\Api\PublicBookingController;
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

    // ── Public tenant lookup, availability + booking (no auth) ──────────
    Route::get('public/sites/{slug}',                     [PublicSiteController::class,       'show']);
    Route::get('public/sites/{slug}/availability',        [PublicAvailabilityController::class, 'show']);
    Route::post('public/sites/{slug}/appointments',       [PublicBookingController::class,     'store']);

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

        Route::get('customers',              [CustomersController::class, 'index']);
        Route::post('customers',             [CustomersController::class, 'store']);
        Route::patch('customers/{customer}', [CustomersController::class, 'update']);

        Route::get('staff',              [StaffController::class, 'index']);
        Route::post('staff',             [StaffController::class, 'store']);
        Route::patch('staff/{staff}',    [StaffController::class, 'update']);
        Route::delete('staff/{staff}',   [StaffController::class, 'destroy']);

        Route::get('gallery',                         [GalleryItemsController::class, 'index']);
        Route::post('gallery',                        [GalleryItemsController::class, 'store']);
        Route::patch('gallery/{item}',                [GalleryItemsController::class, 'update']);
        Route::delete('gallery/{item}',               [GalleryItemsController::class, 'destroy']);

        Route::get('before-after',                    [BeforeAfterItemsController::class, 'index']);
        Route::post('before-after',                   [BeforeAfterItemsController::class, 'store']);
        Route::patch('before-after/{item}',           [BeforeAfterItemsController::class, 'update']);
        Route::delete('before-after/{item}',          [BeforeAfterItemsController::class, 'destroy']);

        Route::post('uploads',                        [UploadsController::class, 'store']);

        Route::get('settings/bookings',               [BookingSettingsController::class, 'show']);
        Route::patch('settings/bookings',             [BookingSettingsController::class, 'update']);

        Route::get('settings/notifications',          [NotificationSettingsController::class, 'show']);
        Route::patch('settings/notifications',        [NotificationSettingsController::class, 'update']);

        Route::get('settings/payments',               [PaymentSettingsController::class, 'show']);
        Route::patch('settings/payments',             [PaymentSettingsController::class, 'update']);

        // ── Stripe Connect (customer payments only — NOT the SaaS subscription) ──
        Route::post('settings/payments/connect/start',   [StripeConnectController::class, 'start']);
        Route::get('settings/payments/connect/status',   [StripeConnectController::class, 'status']);
        Route::post('settings/payments/connect/refresh', [StripeConnectController::class, 'refresh']);

        Route::get('website/template',                [WebsiteTemplateController::class, 'show']);
        Route::patch('website/template',              [WebsiteTemplateController::class, 'update']);
        Route::get('website/sections',                [WebsiteSectionsController::class, 'index']);
        Route::post('website/sections',               [WebsiteSectionsController::class, 'store']);
        Route::patch('website/sections/{section}',    [WebsiteSectionsController::class, 'update']);
        Route::delete('website/sections/{section}',   [WebsiteSectionsController::class, 'destroy']);
    });

    // ── Stripe webhook (no auth, no CSRF) ────────────────────────────────
    // Signature verified by Cashier using STRIPE_WEBHOOK_SECRET
    Route::post('webhooks/stripe', [WebhookController::class, 'handleWebhook']);

    // ── Stripe webhook (customer APPOINTMENT payments) ───────────────────
    // INTENTIONALLY a separate endpoint + secret from the SaaS webhook above.
    // Signature verified manually with STRIPE_APPOINTMENT_WEBHOOK_SECRET.
    Route::post('webhooks/stripe/appointments', [AppointmentPaymentWebhookController::class, 'handle']);
});