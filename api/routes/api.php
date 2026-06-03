<?php

use App\Http\Controllers\Api\Admin\AdminTenantsController;
use App\Http\Controllers\Api\TwilioWebhookController;
use App\Http\Controllers\Api\PlatformAnnouncementsController;
use App\Http\Controllers\Api\AppointmentPaymentWebhookController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Api\Auth\GoogleAuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Customer\AuthController                as CustomerAuthController;
use App\Http\Controllers\Api\Customer\BookingsController            as CustomerBookingsController;
use App\Http\Controllers\Api\Customer\ClaimController               as CustomerClaimController;
use App\Http\Controllers\Api\Customer\DangerController              as CustomerDangerController;
use App\Http\Controllers\Api\Customer\EmailVerificationController   as CustomerEmailVerificationController;
use App\Http\Controllers\Api\Customer\PasswordResetController       as CustomerPasswordResetController;
use App\Http\Controllers\Api\Customer\ProfileController             as CustomerProfileController;
use App\Http\Controllers\Api\Customer\RegisterController            as CustomerRegisterController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\Editor\AccountController;
use App\Http\Controllers\Api\Editor\DangerController;
use App\Http\Controllers\Api\Editor\AppointmentsController;
use App\Http\Controllers\Api\Editor\AvailabilityController;
use App\Http\Controllers\Api\Editor\BlockedDatesController;
use App\Http\Controllers\Api\Editor\BusinessPolicyController;
use App\Http\Controllers\Api\Editor\BusinessProfileController;
use App\Http\Controllers\Api\Editor\CustomerTagsController;
use App\Http\Controllers\Api\Editor\CustomersController;
use App\Http\Controllers\Api\Editor\PaymentsPayoutsController;
use App\Http\Controllers\Api\Editor\PaymentsTransactionsController;
use App\Http\Controllers\Api\Editor\HoursController;
use App\Http\Controllers\Api\Editor\BookingSettingsController;
use App\Http\Controllers\Api\Editor\NotificationSettingsController;
use App\Http\Controllers\Api\Editor\PaymentSettingsController;
use App\Http\Controllers\Api\Editor\StripeConnectController;
use App\Http\Controllers\Api\Editor\ResultsGroupController;
use App\Http\Controllers\Api\Editor\ResultsItemsController;
use App\Http\Controllers\Api\Editor\GalleryGroupController;
use App\Http\Controllers\Api\Editor\GalleryItemsController;
use App\Http\Controllers\Api\Editor\ServicesController;
use App\Http\Controllers\Api\Editor\ServiceCategoriesController;
use App\Http\Controllers\Api\Editor\ServiceAddonsController;
use App\Http\Controllers\Api\Editor\BookingQuestionsController;
use App\Http\Controllers\Api\PublicBookingAnswerUploadController;
use App\Http\Controllers\Api\PublicSiteUnlockController;
use App\Http\Controllers\Api\Editor\StaffController;
use App\Http\Controllers\Api\Editor\StaffHoursController;
use App\Http\Controllers\Api\Editor\StaffBlockedDatesController;
use App\Http\Controllers\Api\Editor\UploadsController;
use App\Http\Controllers\Api\Editor\WebsiteSectionsController;
use App\Http\Controllers\Api\Editor\WebsiteTemplateController;
use App\Http\Controllers\Api\PublicAvailabilityController;
use App\Http\Controllers\Api\PublicBookingController;
use App\Http\Controllers\Api\PublicManageBookingController;
use App\Http\Controllers\Api\PublicSiteController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\MarketingLeadController;
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

    // ── Marketing lead capture (no auth, from mybookready.com) ──────────
    Route::post('leads', [MarketingLeadController::class, 'store'])
        ->middleware('throttle:5,1');

    // ── Public tenant lookup, availability + booking (no auth) ──────────
    // Phase S5++ — throttle anonymous reads to slow automated scraping
    // of tenant payloads + availability calendars. 60/min per IP is well
    // above any legitimate browsing pattern (the editor preview uses the
    // same endpoint but is rare). Bumps to 429 with Retry-After under
    // attack rather than 200-ing every burst.
    Route::get('public/sites/{slug}',                     [PublicSiteController::class,       'show'])
        ->middleware('throttle:60,1');
    Route::get('public/sites/{slug}/availability',        [PublicAvailabilityController::class, 'show'])
        ->middleware('throttle:60,1');
    // Phase S5 — booking POST throttled to 10/min per IP. Tight enough
    // to deter scripted abuse, loose enough that a real client retrying
    // a flaky network does not lock themselves out.
    Route::post('public/sites/{slug}/appointments',       [PublicBookingController::class,     'store'])
        ->middleware('throttle:10,1');
    // Phase S3 — public upload throttled to 5/min per IP. Combined with
    // the active-question + daily-cap gates in the controller this kills
    // anonymous R2 storage abuse.
    Route::post('public/sites/{slug}/booking-answer-upload', [PublicBookingAnswerUploadController::class, 'store'])
        ->middleware('throttle:5,1');
    // Phase S1 — site unlock for password-protected sites. Throttled to
    // make brute-force impractical.
    Route::post('public/sites/{slug}/unlock', [PublicSiteUnlockController::class, 'unlock'])
        ->middleware('throttle:8,1');

    // ── Public manage-booking (token-gated) ──────────────────────────────
    // Phase S5+ — throttled even though the URL token already gates access.
    // Without a throttle, a leaked token could be hammered indefinitely
    // (e.g. inside a reschedule loop probing for available slots). 30/min
    // is loose enough for legitimate retries on flaky networks.
    Route::get ('public/sites/{slug}/manage/{token}',             [PublicManageBookingController::class, 'show'])
        ->middleware('throttle:30,1');
    Route::post('public/sites/{slug}/manage/{token}/cancel',      [PublicManageBookingController::class, 'cancel'])
        ->middleware('throttle:10,1');
    Route::post('public/sites/{slug}/manage/{token}/reschedule',  [PublicManageBookingController::class, 'reschedule'])
        ->middleware('throttle:10,1');

    // ── Public tip flow (token-gated) ────────────────────────────────────
    // Phase S5+ — same reasoning as manage routes above.
    Route::get ('public/sites/{slug}/tip/{token}',                [\App\Http\Controllers\Api\PublicTipController::class, 'show'])
        ->middleware('throttle:30,1');
    Route::post('public/sites/{slug}/tip/{token}',                [\App\Http\Controllers\Api\PublicTipController::class, 'create'])
        ->middleware('throttle:10,1');

    // ── Authentication (central) ───────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        // Phase S5 — credential endpoints throttled to slow brute-force
        // attacks. Login is tighter than register since attackers loop
        // login attempts against known emails.
        Route::post('register', [RegisterController::class, 'store'])->middleware(['trusted_origin', 'throttle:5,1']);
        Route::post('login',    [AuthController::class, 'login'])->middleware(['trusted_origin', 'throttle:10,1']);

        // Google sign-in / sign-up.
        Route::get ('google/redirect',         [GoogleAuthController::class, 'redirect'])->middleware('throttle:20,1');
        Route::get ('google/callback',         [GoogleAuthController::class, 'callback'])->middleware('throttle:20,1');
        Route::post('google/complete-signup',  [GoogleAuthController::class, 'completeSignup'])->middleware(['trusted_origin', 'throttle:10,1']);
        // Phase S4 — exchange the short-lived ?code= for the real Sanctum
        // token. Throttled so a leaked code can't be brute-forced.
        Route::post('google/exchange',         [GoogleAuthController::class, 'exchange'])
            ->middleware(['trusted_origin', 'throttle:30,1']);

        // Forgot / reset password.
        Route::post('password/forgot', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
        Route::post('password/reset',  [PasswordResetController::class, 'reset'])->middleware('throttle:10,1');

        // Phase S6 part 2 — email verification.
        // verify is GET because it's clicked from a mail client (browser
        // top-level navigation). The handler redirects to a frontend
        // success/error page rather than returning JSON. Throttle keeps
        // a brute-force sig guesser slow even though the HMAC space is
        // already infeasible to scan.
        Route::get('verify-email/{id}', [EmailVerificationController::class, 'verify'])
            ->whereNumber('id')
            ->middleware('throttle:30,1');

        // NOTE: this group intentionally omits `verified_email`. Unverified
        // users still need to log out, hit /me (to drive the "please verify"
        // banner from email_verified_at), and request a fresh verification
        // mail. Gating these behind verified_email would lock them out of
        // ever finishing verification.
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',      [AuthController::class, 'me']);
            // Resend the verification email — authed so we don't expose
            // verification state to anonymous probing. Throttled to
            // 3 sends per hour per IP.
            Route::post('verify-email/resend', [EmailVerificationController::class, 'resend'])
                ->middleware('throttle:3,60');
        });
    });

    // ── Billing / subscription management ─────────────────────────────────
    Route::middleware(['auth:sanctum', 'verified_email', 'tenant_owner'])->prefix('billing')->group(function () {
        // Plan catalog — pulls from config/plans.php (3 plans × 3 SMS mults
        // × 2 cycles = 18 SKUs). Returned to the editor billing page +
        // the upgrade dialog so the same shape drives both the marketing
        // site and the in-app picker.
        Route::get('plans',                              [BillingController::class, 'plans']);
        Route::post('checkout',                          [BillingController::class, 'checkout']);
        Route::get('checkout-session/{sessionId}',       [BillingController::class, 'checkoutSession']);
        Route::get('portal',                             [BillingController::class, 'portal']);
        Route::get('subscription',                       [BillingController::class, 'subscription']);
    });

    // ── Editor (central routes, manual tenancy init) ──────────────────────
    Route::middleware(['auth:sanctum', 'verified_email', 'tenant_owner'])->prefix('editor')->group(function () {
        Route::get('business',  [BusinessProfileController::class, 'show']);
        Route::patch('business', [BusinessProfileController::class, 'update']);

        // #130 — onboarding wizard completion marker.
        Route::post('onboarding/complete', [BusinessProfileController::class, 'completeOnboarding']);

        // Categories + add-ons MUST come before /services/{service} so
        // the static segments aren't swallowed by the dynamic matcher.
        Route::get   ('services/categories',          [ServiceCategoriesController::class, 'index']);
        Route::post  ('services/categories',          [ServiceCategoriesController::class, 'store']);
        Route::patch ('services/categories/{id}',     [ServiceCategoriesController::class, 'update']);
        Route::delete('services/categories/{id}',     [ServiceCategoriesController::class, 'destroy']);
        Route::get   ('services/addons',              [ServiceAddonsController::class, 'index']);
        Route::post  ('services/addons',              [ServiceAddonsController::class, 'store']);
        Route::patch ('services/addons/{id}',         [ServiceAddonsController::class, 'update']);
        Route::delete('services/addons/{id}',         [ServiceAddonsController::class, 'destroy']);

        // Phase 16 — booking questions (form builder).
        Route::get   ('booking-questions',            [BookingQuestionsController::class, 'index']);
        Route::post  ('booking-questions',            [BookingQuestionsController::class, 'store']);
        Route::patch ('booking-questions/{id}',       [BookingQuestionsController::class, 'update']);
        Route::delete('booking-questions/{id}',       [BookingQuestionsController::class, 'destroy']);
        Route::get('services',              [ServicesController::class, 'index']);
        Route::post('services',             [ServicesController::class, 'store']);
        Route::patch('services/{service}',  [ServicesController::class, 'update']);
        Route::delete('services/{service}', [ServicesController::class, 'destroy']);

        Route::get('hours',  [HoursController::class, 'index']);
        Route::patch('hours', [HoursController::class, 'update']);

        Route::get('availability',  [AvailabilityController::class, 'show']);
        Route::patch('availability', [AvailabilityController::class, 'update']);

        // Phase 6: tenant-wide blocked dates. Per-staff blocks live under
        // /editor/staff/{staff}/blocked-dates (Phase 2).
        Route::get   ('blocked-dates',          [BlockedDatesController::class, 'index']);
        Route::post  ('blocked-dates',          [BlockedDatesController::class, 'store']);
        Route::delete('blocked-dates/{id}',     [BlockedDatesController::class, 'destroy']);

        Route::get('policies',  [BusinessPolicyController::class, 'show']);
        Route::patch('policies', [BusinessPolicyController::class, 'update']);

        Route::get('appointments',                   [AppointmentsController::class, 'index']);
        Route::post('appointments',                  [AppointmentsController::class, 'store']);
        Route::get('appointments/{appointment}',     [AppointmentsController::class, 'show']);
        Route::patch('appointments/{appointment}',         [AppointmentsController::class, 'update']);
        Route::delete('appointments/{appointment}',        [AppointmentsController::class, 'destroy']);
        Route::post('appointments/{appointment}/refund',            [AppointmentsController::class, 'refund']);
        Route::post('appointments/{appointment}/mark-paid',         [AppointmentsController::class, 'markPaid']);
        Route::post('appointments/{appointment}/charge-balance',    [AppointmentsController::class, 'chargeBalance']);
        Route::post('appointments/{appointment}/request-tip',       [AppointmentsController::class, 'requestTip']);
        Route::post('appointments/{appointment}/charge-late-fee',   [AppointmentsController::class, 'chargeLateFee']);

        Route::get('customers',                     [CustomersController::class, 'index']);
        Route::get('customers/{customer}',          [CustomersController::class, 'show']);
        Route::post('customers',                    [CustomersController::class, 'store']);
        Route::patch('customers/{customer}',        [CustomersController::class, 'update']);
        Route::post('customers/{customer}/toggle-vip', [CustomersController::class, 'toggleVip']);
        // Phase 14 — customer tag CRUD (assignment lives on customers PATCH).
        Route::get('customer-tags',                 [CustomerTagsController::class, 'index']);
        Route::post('customer-tags',                [CustomerTagsController::class, 'store']);
        Route::patch('customer-tags/{tag}',         [CustomerTagsController::class, 'update']);
        Route::delete('customer-tags/{tag}',        [CustomerTagsController::class, 'destroy']);

        // Phase 15 — Payments ledger + Stripe payouts feed.
        Route::get('payments/transactions',         [PaymentsTransactionsController::class, 'index']);
        Route::get('payments/payouts',              [PaymentsPayoutsController::class, 'index']);

        Route::get('staff',              [StaffController::class, 'index']);
        Route::post('staff',             [StaffController::class, 'store']);
        Route::patch('staff/{staff}',    [StaffController::class, 'update']);
        Route::delete('staff/{staff}',   [StaffController::class, 'destroy']);
        // Per-staff hours + blocked dates. Same /{staff}/* shape Laravel
        // would generate via apiResource, but kept flat for consistency
        // with the rest of the editor namespace.
        Route::get  ('staff/{staff}/hours',                    [StaffHoursController::class,        'index']);
        Route::patch('staff/{staff}/hours',                    [StaffHoursController::class,        'update']);
        Route::get   ('staff/{staff}/blocked-dates',           [StaffBlockedDatesController::class, 'index']);
        Route::post  ('staff/{staff}/blocked-dates',           [StaffBlockedDatesController::class, 'store']);
        Route::delete('staff/{staff}/blocked-dates/{id}',      [StaffBlockedDatesController::class, 'destroy']);

        // Groups routes MUST come before /{item} so the static 'groups'
        // segment isn't swallowed by the dynamic {item} matcher.
        Route::get   ('gallery/groups',               [GalleryGroupController::class, 'index']);
        Route::post  ('gallery/groups',               [GalleryGroupController::class, 'store']);
        Route::patch ('gallery/groups/{group}',       [GalleryGroupController::class, 'update']);
        Route::delete('gallery/groups/{group}',       [GalleryGroupController::class, 'destroy']);
        Route::get   ('gallery',                      [GalleryItemsController::class, 'index']);
        Route::post  ('gallery',                      [GalleryItemsController::class, 'store']);
        Route::patch ('gallery/{item}',               [GalleryItemsController::class, 'update']);
        Route::delete('gallery/{item}',               [GalleryItemsController::class, 'destroy']);

        Route::get   ('results/groups',          [ResultsGroupController::class, 'index']);
        Route::post  ('results/groups',          [ResultsGroupController::class, 'store']);
        Route::patch ('results/groups/{group}',  [ResultsGroupController::class, 'update']);
        Route::delete('results/groups/{group}',  [ResultsGroupController::class, 'destroy']);
        Route::get   ('results',                 [ResultsItemsController::class, 'index']);
        Route::post  ('results',                 [ResultsItemsController::class, 'store']);
        Route::patch ('results/{item}',          [ResultsItemsController::class, 'update']);
        Route::delete('results/{item}',          [ResultsItemsController::class, 'destroy']);

        Route::post('uploads',                        [UploadsController::class, 'store']);

        Route::get('settings/bookings',               [BookingSettingsController::class, 'show']);
        Route::patch('settings/bookings',             [BookingSettingsController::class, 'update']);

        Route::get('settings/notifications',          [NotificationSettingsController::class, 'show']);
        Route::patch('settings/notifications',        [NotificationSettingsController::class, 'update']);
        Route::post('settings/notifications/test-send', [NotificationSettingsController::class, 'testSend']);

        // ── Account (central User, no tenancy init) ─────────────────────────
        Route::get   ('account',                              [AccountController::class, 'show']);
        Route::patch ('account',                              [AccountController::class, 'update']);
        Route::post  ('account/password',                     [AccountController::class, 'changePassword']);
        Route::post  ('account/sign-out-everywhere',          [AccountController::class, 'signOutEverywhere']);

        // ── Danger Zone (destructive owner actions) ────────────────────
        Route::get   ('danger/export/{type}',                 [DangerController::class, 'export'])
            ->where('type', 'appointments|customers');
        Route::post  ('danger/delete-account',                [DangerController::class, 'deleteAccount']);

        Route::get('settings/payments',               [PaymentSettingsController::class, 'show']);
        Route::patch('settings/payments',             [PaymentSettingsController::class, 'update']);

        // ── Stripe Connect (customer payments only — NOT the SaaS subscription) ──
        Route::post('settings/payments/connect/start',          [StripeConnectController::class, 'start']);
        Route::get ('settings/payments/connect/status',          [StripeConnectController::class, 'status']);
        Route::post('settings/payments/connect/refresh',         [StripeConnectController::class, 'refresh']);
        Route::get ('settings/payments/connect/dashboard-link',  [StripeConnectController::class, 'dashboardLink']);

        Route::get('website/template',                [WebsiteTemplateController::class, 'show']);
        Route::patch('website/template',              [WebsiteTemplateController::class, 'update']);
        Route::put('website/template/active',         [WebsiteTemplateController::class, 'setTemplate']);
        Route::get('website/sections',                [WebsiteSectionsController::class, 'index']);
        Route::post('website/sections',               [WebsiteSectionsController::class, 'store']);
        Route::patch('website/sections/{section}',    [WebsiteSectionsController::class, 'update']);
        Route::delete('website/sections/{section}',   [WebsiteSectionsController::class, 'destroy']);
    });

    // ── BookReady platform admin (super-admin only) ──────────────────────
    Route::middleware(['auth:sanctum', 'verified_email', 'admin'])->prefix('admin')->group(function () {
        Route::get   ('stats',            [AdminTenantsController::class, 'stats']);
        Route::get   ('tenants',          [AdminTenantsController::class, 'index']);
        Route::delete('tenants/{id}',     [AdminTenantsController::class, 'destroy']);
        // Platform announcements (admin CRUD)
        Route::get   ('announcements',        [PlatformAnnouncementsController::class, 'adminIndex']);
        Route::post  ('announcements',        [PlatformAnnouncementsController::class, 'store']);
        Route::patch ('announcements/{id}',   [PlatformAnnouncementsController::class, 'update']);
        Route::delete('announcements/{id}',   [PlatformAnnouncementsController::class, 'destroy']);
    });

    // ── Platform announcements — read for any authed user (every owner
    //    needs them on their dashboard) ───────────────────────────────────
    // NOTE: `verified_email` intentionally omitted — unverified users still
    // see the dashboard wrapper that renders the "please verify your email"
    // banner, which itself reads platform announcements.
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('platform/announcements', [PlatformAnnouncementsController::class, 'index']);
    });

    // ── Customer accounts (Phase 2) ──────────────────────────────────────
    // Distinct surface for end-clients who book appointments via tenant
    // public sites — NOT the business owners. The auth flow is fully
    // separate (different cookie name, different tokenable, different
    // mail templates) and only the path-aware AuthFromCookie middleware
    // bridges the gap by promoting the right cookie per request.
    //
    // Inside the customer-session-protected block we also stack
    // `customer_session` to defensively reject owner tokens that hit
    // these endpoints with a Bearer header — auth:sanctum alone would
    // happily resolve an owner token (different tokenable_type).
    Route::prefix('customer')->group(function () {
        // Auth — same throttle ladder as owner side.
        Route::prefix('auth')->group(function () {
            Route::post('register', [CustomerRegisterController::class, 'store'])
                ->middleware(['trusted_origin', 'throttle:5,1']);
            Route::post('login',    [CustomerAuthController::class, 'login'])
                ->middleware(['trusted_origin', 'throttle:10,1']);

            Route::post('password/forgot', [CustomerPasswordResetController::class, 'forgot'])
                ->middleware('throttle:5,1');
            Route::post('password/reset',  [CustomerPasswordResetController::class, 'reset'])
                ->middleware('throttle:10,1');

            // Verify-email click — GET because it lands from a mail
            // client (top-level browser navigation). Throttled even
            // though the HMAC space is infeasible to brute-force.
            Route::get('verify-email/{id}', [CustomerEmailVerificationController::class, 'verify'])
                ->whereNumber('id')
                ->middleware('throttle:30,1');

            // Authed surface — logout, /me, resend verification.
            // NOTE: `customer_verified_email` intentionally omitted
            // here. Unverified customers must still be able to log out,
            // see their own profile (to drive the "please verify"
            // banner), and request a fresh verification email.
            Route::middleware(['auth:sanctum', 'customer_session'])->group(function () {
                Route::post('logout', [CustomerAuthController::class, 'logout']);
                Route::get('me',      [CustomerAuthController::class, 'me']);
                Route::post('verify-email/resend', [CustomerEmailVerificationController::class, 'resend'])
                    ->middleware('throttle:3,60');
            });
        });

        // Claim flow — public preview + public claim POST. Both
        // gated by the HMAC token in the body/path, so no Sanctum
        // auth needed. trusted_origin so an attacker page can't
        // POST a captured token from a malicious origin.
        Route::get ('claim/preview/{token}', [CustomerClaimController::class, 'preview'])
            ->where('token', '[A-Za-z0-9_\-]+')
            ->middleware('throttle:30,1');
        Route::post('claim',                 [CustomerClaimController::class, 'claim'])
            ->middleware(['trusted_origin', 'throttle:5,1']);

        // Phase 3 — authed customer surface.
        //
        // Base stack on everything:
        //   - auth:sanctum          (resolve the cookie/Bearer token)
        //   - customer_session      (reject owner tokens — defense in depth)
        //
        // The customer_verified_email gate is applied SELECTIVELY below.
        // We deliberately do NOT require email verification to view or
        // manage bookings — a customer who just signed up via the in-page
        // modal on a tenant site should still be able to see what they
        // booked. The verify-email banner in AccountShell nudges them
        // without blocking the core flow.
        Route::middleware(['auth:sanctum', 'customer_session'])->group(function () {
            // Bookings — cross-tenant index, per-booking detail/cancel/
            // reschedule. NO email verification required.
            Route::get   ('bookings',                                       [CustomerBookingsController::class, 'index']);
            Route::get   ('bookings/{tenant_slug}/{id}',                    [CustomerBookingsController::class, 'show'])
                ->whereNumber('id')->where('tenant_slug', '[a-z0-9-]+');
            Route::post  ('bookings/{tenant_slug}/{id}/cancel',             [CustomerBookingsController::class, 'cancel'])
                ->whereNumber('id')->where('tenant_slug', '[a-z0-9-]+')
                ->middleware('throttle:10,1');
            Route::post  ('bookings/{tenant_slug}/{id}/reschedule',         [CustomerBookingsController::class, 'reschedule'])
                ->whereNumber('id')->where('tenant_slug', '[a-z0-9-]+')
                ->middleware('throttle:10,1');

            // Profile + Danger Zone DO require a verified email. Both
            // can change identity or perform irreversible operations —
            // we need confirmation that the email on file actually
            // reaches the human who's clicking these buttons.
            Route::middleware('customer_verified_email')->group(function () {
                // Profile — identity + contact only. Per-business
                // preferences stay owner-controlled in the tenant
                // clients table.
                Route::get   ('profile',          [CustomerProfileController::class, 'show']);
                Route::patch ('profile',          [CustomerProfileController::class, 'update']);
                Route::patch ('profile/email',    [CustomerProfileController::class, 'updateEmail']);
                Route::post  ('profile/password', [CustomerProfileController::class, 'changePassword'])
                    ->middleware('throttle:5,1');

                // ── Danger Zone (Phase 6) — data export + account delete ──
                Route::get   ('danger/export',          [CustomerDangerController::class, 'export'])
                    ->middleware('throttle:3,1');
                Route::post  ('danger/delete-account',  [CustomerDangerController::class, 'deleteAccount'])
                    ->middleware('throttle:3,1');
            });
        });
    });

    // ── Stripe webhook (no auth, no CSRF) ────────────────────────────────
    // Signature verified by Cashier using STRIPE_WEBHOOK_SECRET
    Route::post('webhooks/stripe', [WebhookController::class, 'handleWebhook']);

    // ── Stripe webhook (customer APPOINTMENT payments) ───────────────────
    // INTENTIONALLY a separate endpoint + secret from the SaaS webhook above.
    // Signature verified manually with STRIPE_APPOINTMENT_WEBHOOK_SECRET.
    Route::post('webhooks/stripe/appointments', [AppointmentPaymentWebhookController::class, 'handle']);

    // ── Twilio SMS webhooks (no auth — X-Twilio-Signature HMAC-SHA1) ──────
    // Twilio uses two distinct webhooks (unlike Telnyx's single URL):
    //   /status  ← StatusCallback URL (set per-message by SmsService) for
    //              delivery receipts (sent / delivered / undelivered / failed).
    //   /inbound ← the "A message comes in" URL on the number / Messaging
    //              Service, for replies (STOP / START / HELP + free text).
    // Both verify X-Twilio-Signature against TWILIO_AUTH_TOKEN before
    // doing anything. Throttled defensively even though the signature is
    // the real gate.
    Route::post('webhooks/twilio/status',  [TwilioWebhookController::class, 'status'])
        ->middleware('throttle:120,1');
    Route::post('webhooks/twilio/inbound', [TwilioWebhookController::class, 'inbound'])
        ->middleware('throttle:120,1');
});
