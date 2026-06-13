<?php

namespace App\Support;

/**
 * Internal-account allowlist.
 *
 * A small list of founder / staff / QA emails that bypass the billing
 * gates entirely — they can sign up, edit, and switch plans without
 * the /checkout/trial card-capture step or the EnforceWriteGate
 * subscription state check.
 *
 * Driven by the BILLING_INTERNAL_EMAILS env var (comma-separated).
 * Case-insensitive match, trimmed, lowercased. Empty / unset →
 * everyone is treated as a paying customer (production-default
 * behavior).
 *
 * Do NOT use this for granting paid-tier features (PlanFeatures::planOf
 * still reads tenants.plan, which the provisioning service stamps to
 * the chosen tier). It only controls whether the trial card-capture
 * and write-gate are bypassed.
 */
class BillingInternal
{
    public static function isInternal(?string $email): bool
    {
        if (! $email) return false;
        $needle = strtolower(trim($email));
        foreach (self::emails() as $allowed) {
            if ($needle === $allowed) return true;
        }
        return false;
    }

    /**
     * Normalized list of allowlisted emails. Cached at request scope
     * via a static — the env never changes mid-request.
     */
    public static function emails(): array
    {
        static $cached = null;
        if ($cached !== null) return $cached;

        $raw = (string) config('billing.internal_emails', '');
        $parts = preg_split('/[,\s]+/', $raw, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $cached = array_values(array_unique(array_map(
            fn($e) => strtolower(trim($e)),
            $parts,
        )));
        return $cached;
    }
}
