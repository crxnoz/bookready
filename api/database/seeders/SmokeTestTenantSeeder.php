<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Deterministic seed for the Playwright smoke-test tenant.
 *
 * Creates (or repairs) a tenant whose id is `smoketest` with a known,
 * predictable shape so the booking-flow tests under
 * `web/tests/booking/` can run against it without per-developer drift:
 *
 *   - business profile: "Smoke Test Salon"
 *   - 3 services: Haircut ($30, 30m) / Beard Trim ($20, 15m) / Combo ($45, 45m)
 *   - 1 active staff: "Alex" (owner)
 *   - hours: Mon-Fri 09:00-17:00, weekends closed
 *   - payment_settings: deposits OFF, payments OFF (no Stripe required to book)
 *   - booking_settings: defaults from the migration
 *   - business_policies: simple, on-brand text the test can assert against
 *
 * The seeder is FULLY IDEMPOTENT. Re-running it does not duplicate any
 * row — every section either tests for existing data + skips, or uses
 * an updateOrInsert keyed on a stable identifier. Safe to run on every
 * Playwright invocation:
 *
 *   php artisan db:seed --class=SmokeTestTenantSeeder
 *
 * Playwright integration (web/tests/booking/):
 *
 *   1. Global setup (or first test's beforeAll) shells out to:
 *        php /var/www/bookready-api/api/artisan db:seed \
 *          --class=SmokeTestTenantSeeder --force
 *      (or equivalent from the dev box's working tree)
 *   2. Tests then drive the public booking flow at:
 *        http://smoketest.lvh.me:3000/                 (local dev)
 *        https://smoketest.staging.bkrdy.me/           (staging)
 *      lvh.me resolves *.lvh.me to 127.0.0.1, which lets Playwright's
 *      auto-started Next dev server respond to the tenant subdomain
 *      pattern without any /etc/hosts editing. Make sure
 *      NEXT_PUBLIC_TENANT_BASE_DOMAIN=lvh.me when running locally.
 *
 * Failure mode: each seed section is wrapped so a single bad insert
 * (a constraint surprise on an older schema, etc.) degrades the seed
 * rather than aborting it. Subsequent re-runs will heal whatever
 * sections succeeded the second time. See the section-guard comment on
 * TenantProvisioningService::seedSection — same pattern.
 *
 * Safety: refuses to run in production (APP_ENV=production) because
 * seeding a fake tenant onto prod would surface in /admin and could
 * be confused for a real signup. Override with --force on artisan if
 * you ever actually need to (you probably don't).
 */
class SmokeTestTenantSeeder extends Seeder
{
    public const TENANT_ID = 'smoketest';

    /**
     * Stable identifiers used across sections so re-runs match existing
     * rows. Keep these in sync with anything the Playwright tests
     * assert against.
     */
    private const STAFF_EMAIL = 'staff@smoketest.test';
    private const SERVICES = [
        ['name' => 'Haircut',    'duration' => 30, 'price' => '30.00', 'description' => 'Classic cut — Playwright smoke-test fixture.', 'sort' => 0],
        ['name' => 'Beard Trim', 'duration' => 15, 'price' => '20.00', 'description' => 'Tidy + line-up — Playwright smoke-test fixture.', 'sort' => 1],
        ['name' => 'Combo',      'duration' => 45, 'price' => '45.00', 'description' => 'Haircut + beard trim — Playwright smoke-test fixture.', 'sort' => 2],
        // The Playwright booking suite under web/tests/booking/ targets a
        // service named literally "Smoke Test Service" by getByText.
        // Keep this entry in lock-step with the tests — if the suite ever
        // renames the target service, rename here too. Kept at 30/$40 so
        // the booking flow exercises a "real-looking" price + duration
        // rather than something obviously fake.
        ['name' => 'Smoke Test Service', 'duration' => 30, 'price' => '40.00', 'description' => 'Playwright happy-path target. Do not rename without updating web/tests/booking/*.spec.ts.', 'sort' => 3],
    ];

    public function run(): void
    {
        // Hard refuse to run in prod. The smoke tenant is fixture data
        // and would clutter the admin tenant list + activity feed.
        if (app()->environment('production')) {
            $this->command->warn('[SmokeTestTenantSeeder] APP_ENV=production — refusing to seed. Use staging/local.');
            return;
        }

        // ── Central DB: ensure the Tenant row exists ─────────────────
        // firstOrCreate is keyed only on `id`. Re-running does not bump
        // updated_at or churn the row.
        $tenant = Tenant::firstOrCreate(
            ['id' => self::TENANT_ID],
            [
                'plan'               => 'studio',
                'subscription_state' => Tenant::STATE_ACTIVE,
            ],
        );

        // ── Tenant DB: ensure it exists + migrations are caught up ──
        // stancl/tenancy's TenantCreated event creates the DB on insert,
        // but if the DB was dropped or this is a re-run after a manual
        // delete we need to create it explicitly. Manager::databaseExists
        // is the idiomatic check.
        try {
            $manager = $tenant->database()->manager();
            if (! $manager->databaseExists($tenant->database()->getName())) {
                $manager->createDatabase($tenant);
            }
        } catch (\Throwable $e) {
            $this->command->error('[SmokeTestTenantSeeder] failed to create tenant DB: ' . $e->getMessage());
            return;
        }

        // tenants:migrate is itself idempotent (only runs migrations not
        // already in the tenant's migrations table). Use --force so we
        // don't prompt for confirmation in non-interactive contexts.
        Artisan::call('tenants:migrate', [
            '--tenants' => [self::TENANT_ID],
            '--force'   => true,
        ]);

        // ── Seed the tenant DB ──────────────────────────────────────
        tenancy()->initialize($tenant);
        try {
            $this->seedBusinessProfile();
            $this->seedHours();
            $this->seedServices();
            $this->seedStaff();
            $this->seedPaymentSettings();
            $this->seedBookingSettings();
            $this->seedBusinessPolicies();
        } finally {
            tenancy()->end();
        }

        $this->command->info('[SmokeTestTenantSeeder] tenant=' . self::TENANT_ID . ' ready.');
    }

    /**
     * Singleton row. Skip if any row exists — we never want to write a
     * second profile, and tests can read whatever is there.
     */
    private function seedBusinessProfile(): void
    {
        $this->section('business_profiles', function () {
            if (! Schema::hasTable('business_profiles')) return;
            if (DB::table('business_profiles')->exists()) return;

            DB::table('business_profiles')->insert([
                'business_name'    => 'Smoke Test Salon',
                'booking_enabled'  => 1,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        });
    }

    /**
     * Mon-Fri 09:00-17:00, weekends closed. Note that the existing
     * seedDefaults() uses 09:00-18:00 — we deliberately use 17:00 here
     * so the Playwright tests can encode a known shift boundary in
     * after-hours / availability tests.
     */
    private function seedHours(): void
    {
        $this->section('hours', function () {
            if (! Schema::hasTable('hours')) return;
            if (DB::table('hours')->exists()) return;

            $rows = [];
            foreach (range(0, 6) as $day) {
                $closed = in_array($day, [0, 6], true);
                $rows[] = [
                    'day_of_week' => $day,
                    'open_time'   => $closed ? null : '09:00:00',
                    'close_time'  => $closed ? null : '17:00:00',
                    'is_closed'   => $closed,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            }
            DB::table('hours')->insert($rows);
        });
    }

    /**
     * 3 services, identified by `name` for idempotent re-runs. We don't
     * use updateOrInsert because services has a JSON column
     * (available_days) and on some MySQL versions updateOrInsert with
     * JSON in the update set causes "duplicate column" errors.
     * Insert-if-missing keeps it simple.
     */
    private function seedServices(): void
    {
        $this->section('services', function () {
            if (! Schema::hasTable('services')) return;

            // Ensure a single category exists. Tests can assert any
            // service is in this category if useful.
            $categoryId = DB::table('service_categories')
                ->where('name', 'Services')
                ->value('id');
            if (! $categoryId) {
                $categoryId = DB::table('service_categories')->insertGetId([
                    'name'        => 'Services',
                    'description' => null,
                    'sort_order'  => 0,
                    'is_active'   => 1,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }

            $allDays = json_encode([0, 1, 2, 3, 4, 5, 6]);
            foreach (self::SERVICES as $svc) {
                $exists = DB::table('services')->where('name', $svc['name'])->exists();
                if ($exists) continue;

                DB::table('services')->insert([
                    'category_id'    => $categoryId,
                    'name'           => $svc['name'],
                    'description'    => $svc['description'],
                    'duration'       => $svc['duration'],
                    'available_days' => $allDays,
                    'price'          => $svc['price'],
                    'deposit'        => '0.00',
                    'sort_order'     => $svc['sort'],
                    'is_active'      => 1,
                    'category'       => 'Services',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }
        });
    }

    /**
     * One staff member keyed on email so re-runs match.
     */
    private function seedStaff(): void
    {
        $this->section('staff', function () {
            if (! Schema::hasTable('staff')) return;
            if (DB::table('staff')->where('email', self::STAFF_EMAIL)->exists()) return;

            DB::table('staff')->insert([
                'name'       => 'Alex',
                'role'       => 'Owner',
                'email'      => self::STAFF_EMAIL,
                'is_active'  => 1,
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    /**
     * Singleton. Deposits OFF + payments OFF so the booking flow can
     * complete without any Stripe Connect setup — the seed tenant never
     * onboards through Stripe.
     */
    private function seedPaymentSettings(): void
    {
        $this->section('payment_settings', function () {
            if (! Schema::hasTable('payment_settings')) return;
            if (DB::table('payment_settings')->exists()) return;

            DB::table('payment_settings')->insert([
                'deposits_enabled'   => 0,
                'allow_full_payment' => 0,
                'currency'           => 'USD',
                'payments_enabled'   => 0,
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
        });
    }

    /**
     * Singleton — defaults from the migration are exactly what we want
     * for the smoke test (30 days ahead, 30-minute slots, 12 hours
     * minimum notice, auto-confirm enabled per the recent migration).
     * Just insert if missing.
     */
    private function seedBookingSettings(): void
    {
        $this->section('booking_settings', function () {
            if (! Schema::hasTable('booking_settings')) return;
            if (DB::table('booking_settings')->exists()) return;

            DB::table('booking_settings')->insert([
                'buffer_before_minutes'    => 0,
                'buffer_after_minutes'     => 15,
                'minimum_notice_minutes'   => 720,
                'booking_interval_minutes' => 30,
                'max_days_ahead'           => 30,
                'auto_confirm_bookings'    => 1,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        });
    }

    /**
     * Singleton policies. Short copy so Playwright can assert on
     * substring matches without brittle 200-character snapshots.
     */
    private function seedBusinessPolicies(): void
    {
        $this->section('business_policies', function () {
            if (! Schema::hasTable('business_policies')) return;
            if (DB::table('business_policies')->exists()) return;

            DB::table('business_policies')->insert([
                'cancellation_policy' => 'Please give 24 hours notice to cancel or reschedule.',
                'late_policy'         => 'Arriving more than 15 minutes late may shorten your appointment.',
                'no_show_policy'      => 'No-shows may forfeit any deposit.',
                'deposit_policy'      => 'A deposit may be required at booking and is applied to your total.',
                'require_policy_agreement' => 0,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        });
    }

    /**
     * Wrap a seed step so one failure does not stop the next. Same
     * pattern as TenantProvisioningService::seedSection — see the
     * comment there for the rationale. Logs to laravel.log so a
     * partial-seed bug is debuggable after the test run.
     */
    private function section(string $label, callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            Log::warning("SmokeTestTenantSeeder section '{$label}' failed", [
                'error' => $e->getMessage(),
            ]);
            $this->command->warn("[SmokeTestTenantSeeder] section '{$label}' failed: " . $e->getMessage());
        }
    }
}
