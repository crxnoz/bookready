<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
     */
    private function seedDefaults(array $data): void
    {
        DB::table('businesses')->insert([
            'name'       => $data['business_name'],
            'template'   => $data['template'] ?? 'the-fade-room',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

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

        DB::table('policies')->insert([
            'type'       => 'cancellation',
            'title'      => 'Cancellation Policy',
            'content'    => 'We require 24 hours notice for cancellations. Late cancellations may be subject to a fee.',
            'is_visible' => true,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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
