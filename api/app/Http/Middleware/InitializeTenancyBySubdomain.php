<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Resolvers\DomainTenantResolver;
use Stancl\Tenancy\Exceptions\TenantCouldNotBeIdentifiedException;

class InitializeTenancyBySubdomain extends InitializeTenancyByDomain
{
    /**
     * Central domains bypass tenancy entirely.
     * Tenant routes call this middleware explicitly via route definition.
     */
    public function handle($request, Closure $next)
    {
        $host = $request->getHost();
        $centralDomains = config('tenancy.central_domains', []);

        // Pass central-domain requests straight through
        if (in_array($host, $centralDomains, true)) {
            return $next($request);
        }

        // Strip port just in case
        $hostname = strtok($host, ':');
        $subdomain = explode('.', $hostname)[0] ?? null;

        if (! $subdomain) {
            abort(404, 'Tenant not found.');
        }

        try {
            $tenant = app(DomainTenantResolver::class)->resolve($hostname);
        } catch (TenantCouldNotBeIdentifiedException) {
            abort(404, 'No tenant for this subdomain.');
        }

        tenancy()->initialize($tenant);

        return $next($request);
    }
}
