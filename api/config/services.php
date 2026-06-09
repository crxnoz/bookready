<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY', ''),
    ],

    // Cloudflare Turnstile (#161) — CAPTCHA on signup + sensitive auth
    // endpoints. Get keys at https://dash.cloudflare.com/?to=/:account/turnstile.
    // - site_key: public, exposed to the frontend via
    //   NEXT_PUBLIC_TURNSTILE_SITE_KEY in the Next app.
    // - secret: backend only, used by TurnstileVerifier.
    // - disabled: set to true to bypass verification entirely (local dev
    //   or before Cloudflare account is provisioned). Production .env
    //   must leave this false.
    // - test_site_key: Cloudflare's "always passes" public key, used as
    //   a fallback in the frontend when no real key is set so the dev
    //   build doesn't break.
    'turnstile' => [
        'site_key'      => env('TURNSTILE_SITE_KEY', ''),
        'secret'        => env('TURNSTILE_SECRET', ''),
        'disabled'      => (bool) env('TURNSTILE_DISABLED', false),
        'test_site_key' => '1x00000000000000000000AA',
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'prices' => [
            'starter' => env('STRIPE_PRICE_STARTER'),
            'pro'     => env('STRIPE_PRICE_PRO'),
        ],
    ],

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI', 'https://api.bkrdy.me/api/v1/auth/google/callback'),
        // T1.4 — Calendar OAuth uses a DIFFERENT redirect URI than sign-in
        // so the consent-screen flow + the BookReady-app-name-on-Google's-
        // settings-page stay scoped to the calendar integration. Must be
        // registered as an Authorized redirect URI in the Google Cloud
        // Console alongside the sign-in callback above.
        'calendar_redirect_uri' => env(
            'GOOGLE_CALENDAR_REDIRECT_URI',
            'https://api.bkrdy.me/api/v1/integrations/google-calendar/callback',
        ),
    ],

    'twilio' => [
        // Account SID + Auth Token from the Twilio Console dashboard.
        // The Auth Token also keys the webhook X-Twilio-Signature HMAC,
        // so a single value gates both outbound sends and inbound
        // callback verification.
        'account_sid' => env('TWILIO_ACCOUNT_SID', ''),
        'auth_token'  => env('TWILIO_AUTH_TOKEN', ''),

        // Sender. Prefer a Messaging Service SID (MGxxxx) — it handles
        // A2P 10DLC number pooling, sticky sender, and opt-out
        // compliance. Falls back to a single E.164 From number
        // ("+13125551234") when no service SID is set.
        'from'                  => env('TWILIO_FROM_NUMBER', ''),
        'messaging_service_sid' => env('TWILIO_MESSAGING_SERVICE_SID', ''),

        // Marginal cost per outbound segment, in cents, recorded on every
        // send for the cost dashboard. Twilio A2P all-in (message + carrier
        // fees) is ~$0.0083 = 0.83¢ as of late 2026. Drives the bundle
        // uplift margin math in config/plans.php. Override via env if
        // pricing shifts so we don't have to redeploy.
        'cost_cents_per_message' => (float) env('TWILIO_COST_CENTS', 0.83),

        // Live mode requires the Account SID, Auth Token, AND a sender
        // (either a Messaging Service SID or a From number). When any is
        // missing we operate in dry-run mode: messages get logged to
        // notification_send_log with status='dry_run' and no API call is
        // made. Lets us build and deploy the code before Twilio A2P
        // onboarding is complete.
        'live' => env('TWILIO_ACCOUNT_SID', '') !== ''
            && env('TWILIO_AUTH_TOKEN', '') !== ''
            && (env('TWILIO_MESSAGING_SERVICE_SID', '') !== '' || env('TWILIO_FROM_NUMBER', '') !== ''),

        // Optional override for the public base URL Twilio calls back on,
        // used to reconstruct the exact URL for X-Twilio-Signature
        // verification. Defaults to app.url when blank.
        'webhook_base_url' => env('TWILIO_WEBHOOK_BASE_URL', ''),

        // Quota enforcement. Default true: SmsQuotaService gates every
        // send and blocks at allowance * 1.10 grace. Runaway-cost
        // backstop — without this, a misconfigured booking flow can
        // burn through a tenant's A2P budget before we notice. Flip to
        // false only for a platform-wide pause (e.g. mass replay during
        // a webhook backfill).
        'enforce_quota' => filter_var(env('TWILIO_ENFORCE_QUOTA', true), FILTER_VALIDATE_BOOLEAN),
    ],

];
