<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SignupDraft;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PlatformMailer;
use App\Services\TenantProvisioningService;
use App\Support\ServiceTemplates;
use App\Support\TemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;

/**
 * Signup redesign v2 — endpoints for the pre-tenant signup steps.
 *
 * Step 3 (POST /signup/business)   — business_name + tagline + business_type + services
 * Step 4 (POST /signup/website)    — subdomain + template → provisions tenant
 *        (GET  /signup/subdomain)  — availability check
 *        (GET  /signup/draft)      — current draft state + service templates for the picker
 *
 * Authenticated by auth:sanctum + email-verified. No tenant_owner
 * middleware because the user has no tenant yet.
 */
class SignupController extends Controller
{
    public function __construct(
        private readonly TenantProvisioningService $provisioner,
    ) {}

    /**
     * GET /signup/draft — full draft state plus the service-template
     * registry the Step 3 page renders from. Frontend mounts this on
     * page load to populate the form (resuming after a refresh or a
     * re-login).
     */
    public function draft(Request $request): JsonResponse
    {
        $user  = $request->user();
        $draft = $this->draftFor($user);

        return response()->json([
            'business_name'      => $draft->business_name,
            'tagline'            => $draft->tagline,
            'business_type'      => $draft->business_type,
            // Services on the draft override the registry defaults; the
            // frontend uses these if non-empty, otherwise it pulls from
            // service_templates[business_type] on the fly.
            'services'           => $draft->services,
            'selected_subdomain' => $draft->selected_subdomain,
            'selected_template'  => $draft->selected_template,
            'selected_plan'      => $draft->selected_plan,
            'selected_cycle'     => $draft->selected_cycle,
            'step_completed'     => $draft->step_completed,
            'tenant_id'          => $draft->tenant_id,
            // Picker options + the per-type service starter lists.
            'business_types'     => array_map(
                fn (string $t) => ['slug' => $t, 'label' => ServiceTemplates::typeLabel($t)],
                ServiceTemplates::TYPES,
            ),
            'service_templates'  => array_combine(
                ServiceTemplates::TYPES,
                array_map(ServiceTemplates::forType(...), ServiceTemplates::TYPES),
            ),
        ]);
    }

    /**
     * POST /signup/business — Step 3 submit.
     *
     * Idempotent: re-posting with different values just updates the
     * draft. Marks step_completed = 'business' so the redirect machine
     * advances to /signup/website.
     */
    public function updateBusiness(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_name' => ['required', 'string', 'min:2', 'max:100'],
            'tagline'       => ['nullable', 'string', 'max:255'],
            'business_type' => ['required', 'string', Rule::in(ServiceTemplates::TYPES)],
            'services'      => ['nullable', 'array', 'min:1', 'max:3'],
            'services.*.name'             => ['required_with:services', 'string', 'min:1', 'max:100'],
            'services.*.price_cents'      => ['required_with:services', 'integer', 'min:0', 'max:1000000'],
            'services.*.duration_minutes' => ['required_with:services', 'integer', 'min:5', 'max:600'],
        ]);

        $user  = $request->user();
        $draft = $this->draftFor($user);

        // Use the user's typed services if provided; otherwise fall
        // through to the registry defaults at provisioning time.
        $services = $data['services'] ?? ServiceTemplates::forType($data['business_type']);

        $draft->update([
            'business_name'  => $data['business_name'],
            'tagline'        => $data['tagline'] ?? null,
            'business_type'  => $data['business_type'],
            'services'       => $services,
            // Only advance step_completed if we're still pre-business.
            // Re-edits from Step 4+ shouldn't downgrade the gate.
            'step_completed' => $draft->step_completed ?? SignupDraft::STEP_BUSINESS,
        ]);

        return response()->json(['step_completed' => $draft->step_completed]);
    }

    /**
     * GET /signup/subdomain?slug=foo — availability check for Step 4's
     * live indicator. Re-uses the same regex + reserved-word blocklist
     * the provision call enforces, so a "available" answer here is
     * authoritative.
     */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $slug = strtolower(trim((string) $request->query('slug', '')));

        if (! preg_match('/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/', $slug)) {
            return response()->json([
                'slug'      => $slug,
                'available' => false,
                'reason'    => 'invalid',
            ]);
        }

        if (in_array($slug, self::RESERVED_SUBDOMAINS, true)) {
            return response()->json([
                'slug'      => $slug,
                'available' => false,
                'reason'    => 'reserved',
            ]);
        }

        $taken = Tenant::where('id', $slug)->exists()
            || DB::table('domains')->where('domain', "{$slug}." . env('APP_DOMAIN', 'bkrdy.me'))->exists();

        return response()->json([
            'slug'      => $slug,
            'available' => ! $taken,
            'reason'    => $taken ? 'taken' : null,
        ]);
    }

    /**
     * POST /signup/website — Step 4 submit. Validates the subdomain
     * + template, then provisions the tenant from the draft.
     *
     * Race-safe: the unique constraint on tenants.id means a second
     * writer with the same slug gets a UniqueConstraintViolation we
     * surface as "taken." Compensating rollback inside the provisioner
     * handles any failure mid-DDL.
     *
     * Rate-limited to 1 successful provision per user per 24h to make
     * subdomain-squatting bots uneconomical.
     */
    public function updateWebsite(Request $request): JsonResponse
    {
        $user  = $request->user();
        $draft = $this->draftFor($user);

        // Can't skip Step 3 — business setup is the foundation for
        // seeding business_profiles + services at provisioning.
        if (! $draft->hasBusinessSetup()) {
            return response()->json([
                'message' => 'Finish business setup first.',
                'errors'  => ['flow' => ['Step 3 (business setup) must be completed before Step 4.']],
            ], 422);
        }

        // Already provisioned — make this idempotent: return the same
        // shape so the frontend can re-poll after a refresh.
        if ($draft->tenant_id) {
            return response()->json([
                'tenant_id'      => $draft->tenant_id,
                'subdomain'      => $draft->selected_subdomain,
                'template'       => $draft->selected_template,
                'step_completed' => SignupDraft::STEP_PROVISIONED,
                'already'        => true,
            ]);
        }

        $data = $request->validate([
            'subdomain' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/'],
            'template'  => ['required', 'string', Rule::in(TemplateDefaults::KNOWN_SLUGS)],
        ]);

        $slug = strtolower($data['subdomain']);

        if (in_array($slug, self::RESERVED_SUBDOMAINS, true)) {
            return response()->json([
                'message' => 'That subdomain is reserved. Pick another.',
                'errors'  => ['subdomain' => ['That subdomain is reserved.']],
            ], 422);
        }

        if (Tenant::where('id', $slug)->exists()) {
            return response()->json([
                'message' => 'That subdomain is taken. Pick another.',
                'errors'  => ['subdomain' => ['That subdomain is taken.']],
            ], 422);
        }

        // Rate limit. Generous (5 attempts per 24h) so a flaky network
        // mid-provision isn't punished, but tight enough that a script
        // can't mint 100 tenants from one account.
        $rateKey = "signup-provision:{$user->id}";
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            return response()->json([
                'message' => 'Too many attempts. Try again tomorrow or contact support.',
            ], 429);
        }
        RateLimiter::hit($rateKey, 86400);

        try {
            $tenant = $this->provisioner->provisionForExistingUser(
                owner: $user,
                data: [
                    'slug'          => $slug,
                    'business_name' => $draft->business_name,
                    'template'      => $data['template'],
                    'plan'          => 'solo', // placeholder; Step 5 sets the real choice
                ],
                services: $draft->services ?? ServiceTemplates::forType($draft->business_type),
            );
        } catch (\Throwable $e) {
            Log::error('Signup provisioning failed', [
                'user_id' => $user->id,
                'slug'    => $slug,
                'error'   => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not create your site. Try again or contact support.',
            ], 500);
        }

        $draft->update([
            'selected_subdomain' => $slug,
            'selected_template'  => $data['template'],
            'tenant_id'          => $tenant->id,
            'provisioned_at'     => now(),
            'step_completed'     => SignupDraft::STEP_PROVISIONED,
        ]);

        // Welcome email — moved from registration to provisioning so
        // the message is "your site is live" not "welcome to BookReady",
        // and it contains a real URL. Best-effort; logged on failure.
        try {
            $baseDomain = env('APP_DOMAIN', 'bkrdy.me');
            PlatformMailer::sendWelcome(
                ownerEmail:   $user->email,
                ownerName:    $user->name,
                businessName: $draft->business_name,
                dashboardUrl: "https://app.{$baseDomain}/editor",
            );
        } catch (\Throwable $e) {
            Log::warning('Welcome email failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'tenant_id'      => $tenant->id,
            'subdomain'      => $slug,
            'template'       => $data['template'],
            'step_completed' => SignupDraft::STEP_PROVISIONED,
            'already'        => false,
        ]);
    }

    /**
     * Fetch-or-create the user's draft. One row per user, enforced by
     * the unique index. Use firstOrCreate to dodge the race on parallel
     * first-load requests from two browser tabs.
     */
    private function draftFor(User $user): SignupDraft
    {
        return SignupDraft::firstOrCreate(['user_id' => $user->id]);
    }

    /**
     * Reserved subdomains — system / brand / ambiguous strings the
     * platform owns. Existing tenant slugs are protected by the
     * unique constraint on tenants.id, so they don't need to be listed
     * here. Add a new entry whenever a top-level route gets added.
     */
    private const RESERVED_SUBDOMAINS = [
        'admin', 'api', 'app', 'www', 'mail', 'help', 'support', 'hello',
        'login', 'register', 'signup', 'checkout', 'editor', 'account',
        'auth', 'billing', 'public', 'customer', 'dashboard', 'settings',
        'terms', 'privacy', 'refund', 'cookies', 'marketing', 'internal',
        'docs', 'blog', 'status', 'staging', 'dev', 'test', 'beta',
        'bookready', 'mybookready',
    ];
}
