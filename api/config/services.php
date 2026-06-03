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
        // send for the cost dashboard. Twilio US A2P long-code is ~$0.0079
        // + carrier fees as of late 2026. Override via env if pricing
        // shifts so we don't have to redeploy.
        'cost_cents_per_message' => (float) env('TWILIO_COST_CENTS', 0.79),

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
    ],

];
