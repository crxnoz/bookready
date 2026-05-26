<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Tenant API Routes
|--------------------------------------------------------------------------
| Registered by TenancyServiceProvider with InitializeTenancyBySubdomain
| and PreventAccessFromCentralDomains already applied. All DB queries
| would run against the current tenant's database.
|
| This file is intentionally near-empty. The original tenant-resolved
| /api/v1/editor/* and /api/v1/public/template endpoints were pre-Phase-1
| code that queried tables (`businesses`, `policies`, `contact_buttons`,
| `gallery_sections`, `gallery_images`, `services`, `service_categories`)
| that no longer exist in the current schema, and were never wired up to
| any frontend code. The live editor + public site lookup both live in
| routes/api.php on the central api.bkrdy.me host, with tenancy initialized
| manually from $request->user()->tenant_id (or the {slug} URL param).
|
| The prefix('v1') wrapper is preserved so any future tenant-subdomain
| route slots straight into the same /api/v1/* path shape as the central
| API. TenancyServiceProvider still loads this file.
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    //
});
