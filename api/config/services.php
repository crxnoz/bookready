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
    ],

    'telnyx' => [
        // V2 API key generated under Auth → V2 API Keys in the Telnyx portal.
        'api_key'              => env('TELNYX_API_KEY', ''),

        // Ed25519 public key for verifying webhook signatures. Shown on
        // the same page as the API key. Must be the PEM-formatted full
        // string from the portal (begins with -----BEGIN PUBLIC KEY-----).
        'public_key'           => env('TELNYX_PUBLIC_KEY', ''),

        // Default E.164 sender — the 10DLC number assigned to the
        // platform messaging profile. e.g. "+13125551234".
        'from'                 => env('TELNYX_FROM_NUMBER', ''),

        // UUID of the messaging profile that owns the sender number.
        // Telnyx will route through whichever number in the profile has
        // capacity, so the explicit 'from' above is optional once this
        // is set. We pass both for clarity.
        'messaging_profile_id' => env('TELNYX_MESSAGING_PROFILE_ID', ''),

        // Hard-coded marginal cost per outbound message, in cents.
        // Telnyx US 10DLC pricing as of late 2026 is ~$0.0040; we
        // record this on every send for cost dashboards. Override via
        // env if Telnyx pricing shifts so we don't have to redeploy.
        'cost_cents_per_message' => (float) env('TELNYX_COST_CENTS', 0.4),

        // Live mode requires BOTH an API key AND a sender number. When
        // either is missing we operate in dry-run mode: messages get
        // logged to notification_send_log with status='dry_run' and
        // no API call is made. Lets us build and deploy the code
        // before Telnyx onboarding is complete.
        'live' => env('TELNYX_API_KEY', '') !== '' && env('TELNYX_FROM_NUMBER', '') !== '',

        // Webhook signature freshness window — reject any callback
        // whose Telnyx-Timestamp header is older than this many seconds.
        // 5 minutes matches Stripe's webhook recommendation.
        'webhook_max_age_seconds' => 300,
    ],

];
