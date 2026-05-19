<?php

use App\Http\Controllers\Api\Editor\BusinessController;
use App\Http\Controllers\Api\Editor\ContactButtonController;
use App\Http\Controllers\Api\Editor\GalleryController;
use App\Http\Controllers\Api\Editor\HoursController;
use App\Http\Controllers\Api\Editor\MediaController;
use App\Http\Controllers\Api\Editor\PolicyController;
use App\Http\Controllers\Api\Editor\ServiceCategoryController;
use App\Http\Controllers\Api\Editor\ServiceController;
use App\Http\Controllers\Api\Editor\StaffController;
use App\Http\Controllers\Api\PublicTemplateController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Tenant API Routes
|--------------------------------------------------------------------------
| Registered by TenancyServiceProvider with InitializeTenancyBySubdomain
| and PreventAccessFromCentralDomains already applied.
| All DB queries run against the current tenant's database.
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Public — no auth, any visitor ─────────────────────────────────────
    Route::prefix('public')->group(function () {
        Route::get('template', [PublicTemplateController::class, 'show']);
    });

    // ── Editor — requires Sanctum token ────────────────────────────────────
    Route::middleware('auth:sanctum')->prefix('editor')->group(function () {

        // Business profile
        Route::get('business', [BusinessController::class, 'show']);
        Route::put('business', [BusinessController::class, 'update']);

        // Services
        Route::get('services',           [ServiceController::class, 'index']);
        Route::post('services',          [ServiceController::class, 'store']);
        Route::put('services/{id}',      [ServiceController::class, 'update']);
        Route::delete('services/{id}',   [ServiceController::class, 'destroy']);
        Route::post('services/reorder',  [ServiceController::class, 'reorder']);

        // Service categories
        Route::get('service-categories',              [ServiceCategoryController::class, 'index']);
        Route::post('service-categories',             [ServiceCategoryController::class, 'store']);
        Route::put('service-categories/{id}',         [ServiceCategoryController::class, 'update']);
        Route::delete('service-categories/{id}',      [ServiceCategoryController::class, 'destroy']);
        Route::post('service-categories/reorder',     [ServiceCategoryController::class, 'reorder']);

        // Gallery sections + images — explicit routes avoid parameter name ambiguity
        Route::get('gallery/sections',                        [GalleryController::class, 'index']);
        Route::post('gallery/sections',                       [GalleryController::class, 'store']);
        Route::put('gallery/sections/{section}',              [GalleryController::class, 'update']);
        Route::delete('gallery/sections/{section}',           [GalleryController::class, 'destroy']);
        Route::post('gallery/sections/reorder',               [GalleryController::class, 'reorderSections']);
        Route::post('gallery/sections/{section}/images',      [GalleryController::class, 'storeImage']);
        Route::delete('gallery/images/{image}',               [GalleryController::class, 'destroyImage']);
        Route::post('gallery/sections/{section}/images/reorder', [GalleryController::class, 'reorderImages']);

        // Hours (7-day bulk update)
        Route::get('hours', [HoursController::class, 'index']);
        Route::put('hours', [HoursController::class, 'bulkUpdate']);

        // Policies
        Route::get('policies',          [PolicyController::class, 'index']);
        Route::post('policies',         [PolicyController::class, 'store']);
        Route::put('policies/{id}',     [PolicyController::class, 'update']);
        Route::delete('policies/{id}',  [PolicyController::class, 'destroy']);

        // Contact buttons
        Route::get('contact-buttons',         [ContactButtonController::class, 'index']);
        Route::post('contact-buttons',        [ContactButtonController::class, 'store']);
        Route::put('contact-buttons/{id}',    [ContactButtonController::class, 'update']);
        Route::delete('contact-buttons/{id}', [ContactButtonController::class, 'destroy']);
        Route::post('contact-buttons/reorder',[ContactButtonController::class, 'reorder']);

        // Staff
        Route::get('staff',          [StaffController::class, 'index']);
        Route::post('staff',         [StaffController::class, 'store']);
        Route::put('staff/{id}',     [StaffController::class, 'update']);
        Route::delete('staff/{id}',  [StaffController::class, 'destroy']);
        Route::post('staff/reorder', [StaffController::class, 'reorder']);

        // Media
        Route::post('media/upload', [MediaController::class, 'upload']);
        Route::delete('media',      [MediaController::class, 'destroy']);
    });
});
