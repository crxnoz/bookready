<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TenantDatabaseSeeder extends Seeder
{
    /**
     * Run via: php artisan tenants:seed --tenants=slug
     * TenantProvisioningService::seedDefaults() handles the real first-run seed.
     * This seeder is a hook for dev/test data.
     */
    public function run(): void
    {
        // Add dev seed data here when needed
    }
}
