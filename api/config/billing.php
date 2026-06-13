<?php

return [
    /*
    |---------------------------------------------------------------------------
    | Internal-account allowlist
    |---------------------------------------------------------------------------
    |
    | Comma-separated list of owner emails that bypass the billing gates —
    | trial card-capture screen (/checkout/trial) and EnforceWriteGate. Used
    | for founder / QA accounts so they can sign up and edit freely without
    | a real card on file.
    |
    | Read by App\Support\BillingInternal::emails(). Empty / unset means the
    | normal paying-customer flow applies to everyone.
    |
    */
    'internal_emails' => env('BILLING_INTERNAL_EMAILS', ''),
];
