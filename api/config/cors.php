<?php

/**
 * Phase S6 — explicit CORS config.
 *
 * Previously Laravel's default cors.php (with allowed_origins=['*'],
 * supports_credentials=false) was sufficient because the editor sent
 * Authorization: Bearer headers and didn't need cookies. With the move
 * to httpOnly cookies (bookready_token), the browser requires both:
 *
 *   - Access-Control-Allow-Origin: <specific origin>  (NOT '*')
 *   - Access-Control-Allow-Credentials: true
 *
 * Origins listed below cover:
 *   - https://app.bkrdy.me  → the editor SPA
 *   - https://bkrdy.me      → the apex/marketing surface that links to /login
 *   - https://*.bkrdy.me    → tenant booking sites that hit /api/v1/public/*
 *                             with credentials: 'include' (the cookie is
 *                             ignored on anonymous routes but the preflight
 *                             still requires allow-credentials matching)
 *   - http(s)://localhost:3000 → local Next.js dev
 */

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://app.bkrdy.me',
        // The apex domain serves the same Next.js app and people land on
        // /login from there (the marketing surface links straight to the
        // login route). Without this entry the browser sees Origin:
        // https://bkrdy.me, the backend refuses to emit a matching
        // Access-Control-Allow-Origin, and the preflight fails with
        // "No 'Access-Control-Allow-Origin' header is present on the
        // requested resource." — surfacing as "Failed to fetch" on the
        // login submit (incognito-only because logged-in browsers don't
        // re-hit /login). The subdomain pattern below intentionally
        // requires a leading label so it does not match the apex on its own.
        'https://bkrdy.me',
        'http://app.daysbookings.site',
        'https://app.daysbookings.site',
        'http://localhost:3000',
        'https://localhost:3000',
    ],

    // Pattern match for the tenant subdomains: {slug}.bkrdy.me — these
    // make anonymous public/* requests but the browser still needs the
    // origin to be allow-listed for the credentials preflight to pass.
    'allowed_origins_patterns' => [
        '#^https://[a-z0-9][a-z0-9-]*\.bkrdy\.me$#i',
        '#^https?://[a-z0-9][a-z0-9-]*\.daysbookings\.site$#i',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
