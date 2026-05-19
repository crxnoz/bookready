<?php

declare(strict_types=1);

use Stancl\Tenancy\Bootstrappers;

return [
    'tenant_model' => App\Models\Tenant::class,
    'id_generator' => Stancl\Tenancy\UUIDGenerator::class,
    'domain_model' => App\Models\Domain::class,

    /**
     * Domains that belong to the central application (not tenants).
     * Add your production domain + any local dev domains.
     */
    'central_domains' => array_filter(array_map('trim', explode(',', env('CENTRAL_DOMAINS', 'bookready.app,bookready.test,localhost,127.0.0.1')))),

    /**
     * Tenancy bootstrappers — order matters.
     * Database must be first so subsequent bootstrappers use the tenant connection.
     */
    'bootstrappers' => [
        Bootstrappers\DatabaseTenancyBootstrapper::class,
        // CacheTenancyBootstrapper and QueueTenancyBootstrapper require Redis in local dev
        // Bootstrappers\CacheTenancyBootstrapper::class,
        // Bootstrappers\QueueTenancyBootstrapper::class,
        // Bootstrappers\RedisTenancyBootstrapper::class,
    ],

    'database' => [
        // Connection used as the "landlord" / central connection
        'central_connection' => env('DB_CONNECTION', 'mysql'),

        // Connection cloned as a template for each tenant — null means use central_connection
        'template_tenant_connection' => null,

        // tenant database name = prefix + tenant_id + suffix
        'prefix' => env('TENANCY_DB_PREFIX', 'tenant_'),
        'suffix' => '',

        // Drivers → TenantDatabaseManager implementations
        'managers' => [
            'mysql'    => Stancl\Tenancy\TenantDatabaseManagers\MySQLDatabaseManager::class,
            'mariadb'  => Stancl\Tenancy\TenantDatabaseManagers\MySQLDatabaseManager::class,
            'pgsql'    => Stancl\Tenancy\TenantDatabaseManagers\PostgreSQLDatabaseManager::class,
            'sqlite'   => Stancl\Tenancy\TenantDatabaseManagers\SQLiteDatabaseManager::class,
        ],
    ],

    'cache' => [
        'tag' => 'tenancy',
    ],

    'filesystem' => [
        'suffix_base' => 'tenant',
        'disks' => [
            'local',
            'public',
            // 's3',
        ],
    ],

    'redis' => [
        'prefixed_connections' => ['default', 'cache'],
    ],

    'features' => [
        // Stancl\Tenancy\Features\UserImpersonation::class,
        // Stancl\Tenancy\Features\TelescopeTags::class,
    ],

    'migration_parameters' => [
        '--force' => true,
        '--path' => [database_path('migrations/tenant')],
        '--realpath' => true,
    ],

    'seeder_parameters' => [
        '--class' => 'Database\Seeders\TenantDatabaseSeeder',
        '--force' => true,
    ],
];
