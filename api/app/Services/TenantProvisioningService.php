<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TemplateDefaults;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    /**
     * Create a new tenant, its database, run migrations, and seed defaults.
     * Returns the tenant and owner user.
     */
    public function provision(array $data): array
    {
        $slug = $this->generateSlug($data['business_name']);

        $tenant = DB::transaction(function () use ($data, $slug) {
            $tenant = Tenant::create([
                'id'            => $slug,
                'plan'          => 'trial',
                'business_name' => $data['business_name'], // stored in tenants.data JSON
            ]);

            $baseDomain = env('APP_DOMAIN', 'bookready.app');
            $tenant->domains()->create([
                'domain' => "{$slug}.{$baseDomain}",
            ]);

            // Owner lives on the central DB so they can log in before tenancy bootstraps
            User::create([
                'name'      => $data['owner_name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'tenant_id' => $tenant->id,
                'is_owner'  => true,
            ]);

            return $tenant;
        });

        // Create the isolated MySQL database for this tenant
        $tenant->database()->manager()->createDatabase($tenant);

        // Run tenant migrations (this does NOT auto-initialize tenancy)
        Artisan::call('tenants:migrate', [
            '--tenants' => [$tenant->id],
            '--force'   => true,
        ]);

        // Initialize tenancy so seedDefaults() writes to the tenant DB
        tenancy()->initialize($tenant);
        $this->seedDefaults($data);
        tenancy()->end();

        $owner = User::where('tenant_id', $tenant->id)->where('is_owner', true)->first();

        return compact('tenant', 'owner');
    }

    /**
     * Seed sensible defaults into the fresh tenant database.
     * Called while tenancy is already initialized.
     *
     * Pre-launch (#133): a brand-new tenant now lands with enough content
     * that (a) the public booking site renders end-to-end instead of an
     * empty shell, and (b) the onboarding wizard (#130) has real rows to
     * pre-fill. Everything seeded here is generic and immediately
     * editable — the wizard walks the owner through replacing it.
     *
     * Each section is guarded so a single failure (a table missing on an
     * older schema, a constraint surprise) degrades to "less seed content"
     * rather than 500-ing the whole signup. The owner can always finish
     * setup manually from the editor.
     */
    private function seedDefaults(array $data): void
    {
        $template = $this->normalizeTemplateSlug($data['template'] ?? 'the-fade-room');

        // ── Legacy businesses row (template marker; kept for back-compat) ──
        $this->seedSection('businesses', fn () => DB::table('businesses')->insert([
            'name'       => $data['business_name'],
            'template'   => $data['template'] ?? 'the-fade-room',
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        // ── Business profile (primary metadata table the app reads) ──
        // Only business_name is set from signup; everything else uses the
        // column defaults (public/active, 12h, 60-min default duration).
        // The wizard collects email / phone / city. onboarding_completed_at
        // stays null so the wizard fires on first editor load.
        $this->seedSection('business_profiles', function () use ($data) {
            if (DB::table('business_profiles')->count() === 0) {
                DB::table('business_profiles')->insert([
                    'business_name' => $data['business_name'],
                    'booking_enabled' => 1,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        });

        // ── Business hours (Mon–Fri 9–6, weekends closed) ──
        $this->seedSection('hours', function () {
            $hours = [];
            foreach (range(0, 6) as $day) {
                $closed = in_array($day, [0, 6]);
                $hours[] = [
                    'day_of_week' => $day,
                    'open_time'   => $closed ? null : '09:00:00',
                    'close_time'  => $closed ? null : '18:00:00',
                    'is_closed'   => $closed,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            }
            DB::table('hours')->insert($hours);
        });

        // ── Template settings + section skeleton (so the Website editor
        //    + public site render the RIGHT template immediately; without
        //    a template_settings row WebsiteTemplateController falls back
        //    to thefaderoom regardless of the chosen template). ──
        $this->seedSection('template_settings', function () use ($template) {
            if (DB::table('template_settings')->where('template_slug', $template)->doesntExist()) {
                DB::table('template_settings')->insert([
                    'template_slug' => $template,
                    'settings_json' => json_encode(TemplateDefaults::settingsFor($template)),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        });

        $this->seedSection('website_sections', function () use ($template) {
            if (DB::table('website_sections')->where('template_slug', $template)->doesntExist()) {
                $rows = array_map(fn (array $s) => [
                    'template_slug' => $template,
                    'section_key'   => $s['section_key'],
                    'section_type'  => $s['section_type'],
                    'title'         => $s['title'],
                    'subtitle'      => null,
                    'content_json'  => null,
                    'is_enabled'    => true,
                    'is_locked'     => $s['is_locked'],
                    'sort_order'    => $s['sort_order'],
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ], TemplateDefaults::sectionsFor($template));
                DB::table('website_sections')->insert($rows);
            }
        });

        // ── Sample services + a single category, so the booking flow has
        //    something bookable on day one. available_days = all 7; the
        //    business `hours` rows (weekends closed) gate actual slots, so
        //    if the owner later opens weekends these are already eligible. ──
        $this->seedSection('services', function () {
            $categoryId = DB::table('service_categories')->insertGetId([
                'name'        => 'Services',
                'description' => null,
                'sort_order'  => 0,
                'is_active'   => 1,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

            $allDays = json_encode([0, 1, 2, 3, 4, 5, 6]);
            $samples = [
                ['name' => 'Signature Service', 'description' => 'Your most-requested service. Edit the name, price, and details to match what you offer.', 'duration' => 45, 'price' => '45.00', 'sort' => 0],
                ['name' => 'Quick Service',     'description' => 'A shorter appointment for touch-ups or express visits. Rename or remove this anytime.',     'duration' => 30, 'price' => '30.00', 'sort' => 1],
                ['name' => 'Premium Service',   'description' => 'A longer, full-experience appointment. Update the details to fit your premium offering.',    'duration' => 60, 'price' => '80.00', 'sort' => 2],
            ];
            $rows = array_map(fn (array $s) => [
                'category_id'    => $categoryId,
                'name'           => $s['name'],
                'description'    => $s['description'],
                'duration'       => $s['duration'],
                'available_days' => $allDays,
                'price'          => $s['price'],
                'deposit'        => '0.00',
                'sort_order'     => $s['sort'],
                'is_active'      => 1,
                'category'       => 'Services',
                'created_at'     => now(),
                'updated_at'     => now(),
            ], $samples);
            DB::table('services')->insert($rows);
        });

        // ── One staff member = the owner (display only; bookability runs
        //    off business hours, not staff_hours, so no staff_hours needed.
        //    staff.email is NOT NULL → seed the owner's email). ──
        $this->seedSection('staff', fn () => DB::table('staff')->insert([
            'name'       => $data['owner_name'],
            'role'       => 'Owner',
            'email'      => $data['email'],
            'is_active'  => 1,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        // ── Booking policies (singleton). NOTE: the editor + public site
        //    read business_policies, NOT the legacy `policies` table the
        //    old seed wrote to — so seed the table that actually shows. ──
        $this->seedSection('business_policies', function () {
            if (DB::table('business_policies')->count() === 0) {
                DB::table('business_policies')->insert([
                    'cancellation_policy' => 'Please give at least 24 hours notice to cancel or reschedule. Cancellations within 24 hours may be charged a fee.',
                    'late_policy'         => 'Arriving more than 15 minutes late may mean we have to shorten or reschedule your appointment to protect the next booking.',
                    'no_show_policy'      => 'No-shows may forfeit any deposit and could require pre-payment for future bookings.',
                    'deposit_policy'      => 'A deposit may be required to confirm your booking. It is applied toward your final service cost.',
                    'require_policy_agreement' => 0,
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
            }
        });
    }

    /**
     * Run one seed section, swallowing + logging any failure so a single
     * bad insert can't abort the whole signup. The tenant + login already
     * exist by the time this runs; partial seed content is recoverable
     * from the editor.
     */
    private function seedSection(string $label, callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            Log::warning("TenantProvisioning seed section '{$label}' failed", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map a signup/registry template value to the canonical dash-less
     * slug TemplateDefaults + the registry + template_settings all key on
     * (e.g. "the-fade-room" → "thefaderoom"). Unknown slugs fall through
     * to TemplateDefaults' own default.
     */
    private function normalizeTemplateSlug(string $slug): string
    {
        // Delegate to the single source of truth, which also validates the
        // slug against the set of templates that actually exist (so an
        // unknown value like "cleanbeauty" degrades to the default instead
        // of seeding a tenant with a slug no registry/template can render).
        return TemplateDefaults::normalizeSlug($slug);
    }

    /**
     * Generate a URL-safe slug from a business name, ensuring uniqueness.
     */
    private function generateSlug(string $name): string
    {
        // Lowercase letters and numbers only — no dashes, spaces, or special chars
        $base = preg_replace('/[^a-z0-9]/', '', strtolower($name));
        $base = $base ?: 'tenant';
        $slug = $base;
        $i    = 1;

        while (Tenant::find($slug)) {
            $slug = "{$base}{$i}";
            $i++;
        }

        return $slug;
    }
}
