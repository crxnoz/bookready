<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * v2 Theme 1 — counts how many tenants of each plan tier are linked
 * to a given identity (via users.identity_id JOIN tenants.plan),
 * and enforces the founder's per-tier cap policy.
 *
 * Used by:
 *   - StaffController::sendInvite — refuse when the invited email's
 *     identity is at cap for THIS tenant's plan tier.
 *   - StaffInviteController::accept — final guard, in case the cap
 *     filled up between invite send and accept (race).
 *   - RegisterController::store (Phase 1.2+) — refuse owner signup
 *     when the email's identity is at cap for the requested tier.
 *
 * Per-tier caps (founder decision 2026-06-12):
 *   - 1 Solo per identity (Solo means single-operator by definition)
 *   - 2 Studio per identity (covers chair-renter Mon-Tue / Wed-Sat)
 *   - Salon TBD (decided when Salon ships in v3, see docs/v3-roadmap.md)
 *
 * Beyond cap: refuse with a clear "email hello@mybookready.com"
 * overflow message. Forces a human touchpoint for the long-tail
 * volume use case so we never have to build "stylist works at 8
 * studios" abuse handling.
 */
class IdentityCapResolver
{
    /** Per-tier hard caps. */
    public const CAPS = [
        'solo'   => 1,
        'studio' => 2,
        // 'salon' added when Salon ships.
    ];

    /**
     * Count linked tenants per plan tier for an identity.
     * Returns ['solo' => N, 'studio' => N, ...] keyed by plan slug.
     * Tenants with a missing or unknown plan are counted as 'solo'
     * (matches PlanFeatures::planOf fail-closed default).
     */
    public static function countsFor(int $identityId): array
    {
        if (! Schema::hasTable('identities')) {
            return [];
        }

        $rows = DB::table('users')
            ->join('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->where('users.identity_id', $identityId)
            ->selectRaw('tenants.plan as plan, COUNT(*) as cnt')
            ->groupBy('tenants.plan')
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $plan = is_string($row->plan) ? $row->plan : '';
            if (! array_key_exists($plan, self::CAPS)) {
                $plan = 'solo'; // Fail-closed default.
            }
            $counts[$plan] = ($counts[$plan] ?? 0) + (int) $row->cnt;
        }
        return $counts;
    }

    /**
     * Returns true if attaching one more tenant of $tier to this
     * identity stays within the cap. Returns false on unknown tier
     * (fail closed).
     */
    public static function canAttach(int $identityId, string $tier): bool
    {
        $cap = self::CAPS[$tier] ?? null;
        if ($cap === null) {
            return false;
        }
        $counts = self::countsFor($identityId);
        $current = $counts[$tier] ?? 0;
        return $current < $cap;
    }

    /**
     * Public cap getter for error messaging.
     */
    public static function capFor(string $tier): ?int
    {
        return self::CAPS[$tier] ?? null;
    }

    /**
     * Render a uniform owner-facing refusal message for cap exhaustion.
     * Kept here so the wording stays consistent across the three call
     * sites (sendInvite, accept, register) and is easy to tweak in one
     * place if support gets confusing inquiries.
     */
    public static function refusalMessage(string $tier, string $subjectPronoun = 'They'): string
    {
        $cap = self::CAPS[$tier] ?? 1;
        $tierLabel = ucfirst($tier);
        $businessWord = $cap === 1 ? 'business' : 'businesses';
        return $subjectPronoun . ' are already linked to the maximum of '
            . $cap . ' ' . $tierLabel . ' ' . $businessWord
            . '. Email hello@mybookready.com to request an exception.';
    }
}
