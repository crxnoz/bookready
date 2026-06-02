<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Cashier\Cashier;

/**
 * Idempotently create / upsert the 18 BookReady SKUs in Stripe.
 *
 * Reads config/plans.php as the single source of truth and creates a
 * Stripe Product per plan (solo / studio / salon) plus a Price per
 * (plan × cycle × sms_mult). Uses Stripe's `lookup_key` so re-running
 * the command finds existing prices and updates metadata in place —
 * no duplicates.
 *
 * What this command DOES change in Stripe:
 *   - Creates products (if missing).
 *   - Creates prices (if missing — Stripe prices are immutable so we
 *     "create new + archive old" if the cents value drifts from
 *     config/plans.php).
 *   - Updates product metadata (description, sms_base, etc.) in place.
 *
 * What it does NOT do:
 *   - Touch existing subscriptions or invoices.
 *   - Delete anything (Stripe archives instead).
 *
 * Usage:
 *   php artisan stripe:create-products             # live run
 *   php artisan stripe:create-products --dry-run   # no API calls
 *
 * The output prints a table of (lookup_key, price_id, status) so you
 * can paste the price IDs into the editor / config if needed. The
 * canonical lookup happens at runtime via config('plans') + Stripe
 * lookup_key, so storing the IDs separately is optional.
 */
class CreateStripeProducts extends Command
{
    protected $signature = 'stripe:create-products {--dry-run : Print the plan without hitting Stripe}';

    protected $description = 'Create / upsert the 18 BookReady Stripe SKUs (3 plans × 3 SMS multipliers × 2 cycles) from config/plans.php';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $stripe = $dryRun ? null : Cashier::stripe();

        $plans         = config('plans.plans', []);
        $multipliers   = config('plans.sms_multipliers', []);
        $cycles        = config('plans.cycles', []);
        $perSmsUplift  = (float) config('plans.per_sms_uplift_dollars', 0);

        if (empty($plans) || empty($multipliers) || empty($cycles)) {
            $this->error('config/plans.php is missing required keys. Aborting.');
            return self::FAILURE;
        }

        $rows = [];

        foreach ($plans as $planKey => $plan) {
            // ── Product (one per plan) ─────────────────────────────
            $productLookup = "br_{$planKey}";
            $product       = null;

            if (! $dryRun) {
                // Stripe doesn't index products by lookup_key, only prices,
                // so we use the legacy "search by metadata.bookready_plan" path.
                $existing = $stripe->products->search([
                    'query' => "metadata['bookready_plan']:'{$planKey}' AND active:'true'",
                    'limit' => 1,
                ]);

                if (count($existing->data) > 0) {
                    $product = $existing->data[0];
                    $stripe->products->update($product->id, [
                        'name'        => "BookReady {$plan['label']}",
                        'description' => $plan['description'],
                        'metadata'    => [
                            'bookready_plan' => $planKey,
                            'sms_base'       => (string) $plan['sms_base'],
                            'staff_seats'    => (string) $plan['staff_seats'],
                        ],
                    ]);
                    $this->line("Product br_{$planKey}: updated {$product->id}");
                } else {
                    $product = $stripe->products->create([
                        'name'        => "BookReady {$plan['label']}",
                        'description' => $plan['description'],
                        'metadata'    => [
                            'bookready_plan' => $planKey,
                            'sms_base'       => (string) $plan['sms_base'],
                            'staff_seats'    => (string) $plan['staff_seats'],
                        ],
                    ]);
                    $this->line("Product br_{$planKey}: created {$product->id}");
                }
            } else {
                $this->line("[dry-run] would upsert product br_{$planKey} ({$plan['label']})");
            }

            // ── Prices (one per cycle × multiplier) ────────────────
            foreach ($cycles as $cycleKey => $cycle) {
                foreach ($multipliers as $mult => $upliftRow) {
                    $lookupKey = "br_{$planKey}_{$cycleKey}_{$mult}x";

                    // Base price in cents.
                    $baseCents = $cycleKey === 'monthly'
                        ? $plan['monthly_base_cents']
                        : $plan['annual_base_cents'];

                    // Compute monthly uplift from per-SMS rate × additional SMS
                    // count (sms_factor - 1, since 1× is the base). For annual
                    // the uplift is monthly × 12 so the bundle math reads the
                    // same on either cycle. Keeps margin uniform across plans.
                    $extraSms           = ($upliftRow['sms_factor'] - 1) * $plan['sms_base'];
                    $upliftCentsMonthly = (int) round($extraSms * $perSmsUplift * 100);
                    $upliftCents        = $cycleKey === 'monthly'
                        ? $upliftCentsMonthly
                        : $upliftCentsMonthly * 12;

                    $finalCents = $baseCents + $upliftCents;

                    if ($dryRun) {
                        $rows[] = [
                            $lookupKey,
                            'dry-run',
                            '$' . number_format($finalCents / 100, 2),
                            $cycle['interval'],
                            (string) ($plan['sms_base'] * $upliftRow['sms_factor']),
                        ];
                        continue;
                    }

                    // Search by lookup_key — Stripe enforces uniqueness on
                    // active prices with the same key.
                    $existingPrice = $stripe->prices->all([
                        'lookup_keys' => [$lookupKey],
                        'limit'       => 1,
                    ]);

                    $status = 'unchanged';
                    $priceId = null;

                    if (count($existingPrice->data) > 0) {
                        $existing = $existingPrice->data[0];
                        // Stripe prices are immutable on unit_amount. If the
                        // amount drifted, archive the old and create new.
                        if ((int) $existing->unit_amount !== $finalCents
                            || $existing->recurring->interval !== $cycle['interval']) {
                            $stripe->prices->update($existing->id, [
                                'active'      => false,
                                'lookup_key'  => $lookupKey . '_archived_' . time(),
                            ]);
                            $priceId = null; // will create below
                            $status = 'replaced';
                        } else {
                            $priceId = $existing->id;
                            $status = 'kept';
                        }
                    }

                    if ($priceId === null) {
                        $created = $stripe->prices->create([
                            'product'     => $product->id,
                            'unit_amount' => $finalCents,
                            'currency'    => 'usd',
                            'recurring'   => [
                                'interval'       => $cycle['interval'],
                                'interval_count' => $cycle['interval_count'],
                            ],
                            'lookup_key'  => $lookupKey,
                            'nickname'    => "{$plan['label']} · {$cycle['label']} · {$upliftRow['label']} SMS",
                            'metadata'    => [
                                'bookready_plan'  => $planKey,
                                'bookready_cycle' => $cycleKey,
                                'bookready_mult'  => (string) $mult,
                                'sms_included'    => (string) ($plan['sms_base'] * $upliftRow['sms_factor']),
                            ],
                        ]);
                        $priceId = $created->id;
                        if ($status === 'unchanged') $status = 'created';
                    }

                    $rows[] = [
                        $lookupKey,
                        $priceId,
                        '$' . number_format($finalCents / 100, 2),
                        $cycle['interval'],
                        (string) ($plan['sms_base'] * $upliftRow['sms_factor']),
                        $status,
                    ];
                }
            }
        }

        $this->newLine();
        $this->table(
            ['lookup_key', 'price_id', 'price', 'interval', 'sms', 'status'],
            $rows,
        );

        $this->newLine();
        if ($dryRun) {
            $this->info('Dry run complete. ' . count($rows) . ' prices would be upserted.');
        } else {
            $this->info('Done. ' . count($rows) . ' prices upserted. Look up at runtime via Stripe lookup_key (e.g. br_solo_monthly_1x).');
        }

        return self::SUCCESS;
    }
}
