<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * admin:activity-digest — daily snapshot of platform activity.
 *
 * Sends once a day (14:00 UTC, ~10am ET). Reuses the cached trends
 * endpoint's payload so we share probe code with the dashboard.
 *
 * Skipped on flat days unless --force: if every headline KPI is within
 * ±5% and no tenant moved by >50% and no newcomers, there's nothing
 * worth interrupting the operator for. A genuinely quiet week stays
 * quiet — the digest never becomes ignorable noise.
 */
class SendActivityDigest extends Command
{
    protected $signature = 'admin:activity-digest
                            {--force : Send even when nothing notable changed}
                            {--dry-run : Print body, no email}';

    protected $description = 'Daily platform activity digest with WoW deltas + top movers + anomalies.';

    public function handle(AdminDashboardController $controller): int
    {
        // Bust the trends cache so the digest reflects the latest snapshot.
        Cache::forget('admin:dashboard:trends:v1');
        $trends = json_decode($controller->trends()->getContent(), true);

        $to    = env('ALERTS_EMAIL_TO') ?: 'carrenoluis318@gmail.com';
        $force = (bool) $this->option('force');
        $dry   = (bool) $this->option('dry-run');

        if (! ($trends['snapshot_date'] ?? null)) {
            $this->info('No snapshot yet — nothing to digest.');
            return self::SUCCESS;
        }

        $kpis    = $trends['kpis']    ?? null;
        $tenants = $trends['tenants'] ?? [];
        if (! $kpis) {
            $this->info('Snapshot is missing KPIs — re-run admin:snapshot first.');
            return self::SUCCESS;
        }

        // Classify tenants into movers.
        [$surging, $declining, $newcomers, $anomalies] = $this->classifyMovers($tenants);

        // Worth-sending check.
        $notable = $this->isNotable($kpis, $surging, $declining, $newcomers, $anomalies);
        if (! $notable && ! $force) {
            $this->info('Nothing notable in the last 7d — digest skipped (--force to send anyway).');
            return self::SUCCESS;
        }

        $subject = $this->renderSubject($kpis, $surging, $declining, $newcomers);
        $body    = $this->renderBody($trends, $kpis, $surging, $declining, $newcomers, $anomalies);

        if ($dry) {
            $this->line("DRY-RUN would send: {$subject}");
            $this->line($body);
            return self::SUCCESS;
        }

        try {
            Mail::raw($body, function ($m) use ($to, $subject) {
                $m->to($to)->subject($subject);
            });
            Log::info('admin:activity-digest sent', ['to' => $to]);
            $this->info("Digest sent to {$to}.");
        } catch (\Throwable $e) {
            Log::error('admin:activity-digest failed', ['error' => $e->getMessage()]);
            $this->error('Send failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * Bucket per-tenant rows into surging / declining / newcomers and
     * flag anomalies (>5× or <0.2× of prior pace, both with non-trivial
     * volume so a single weird booking can't qualify).
     */
    private function classifyMovers(array $tenants): array
    {
        $surging = $declining = $newcomers = $anomalies = [];
        foreach ($tenants as $t) {
            $cur = (int) ($t['bookings_7d']       ?? 0);
            $pri = (int) ($t['bookings_prior_7d'] ?? 0);
            if ($cur === 0 && $pri === 0) continue;

            if ($pri === 0 && $cur > 0) {
                $newcomers[] = ['id' => $t['id'], 'cur' => $cur, 'pri' => 0, 'pct' => null];
                continue;
            }
            $pct = $pri > 0 ? (($cur - $pri) / $pri) * 100 : 0;
            if ($pct > 10)  $surging[]   = ['id' => $t['id'], 'cur' => $cur, 'pri' => $pri, 'pct' => $pct];
            if ($pct < -10) $declining[] = ['id' => $t['id'], 'cur' => $cur, 'pri' => $pri, 'pct' => $pct];

            // Anomalies need real volume on at least one side so a single
            // weird outlier booking can't qualify.
            $vol = max($cur, $pri);
            if ($vol >= 5) {
                if ($pri > 0 && $cur / max(1, $pri) >= 5) {
                    $anomalies[] = ['id' => $t['id'], 'kind' => 'surge', 'cur' => $cur, 'pri' => $pri];
                }
                if ($pri > 0 && $cur / max(1, $pri) <= 0.2) {
                    $anomalies[] = ['id' => $t['id'], 'kind' => 'drop', 'cur' => $cur, 'pri' => $pri];
                }
            }
        }
        usort($surging,   fn ($a, $b) => $b['pct'] <=> $a['pct']);
        usort($declining, fn ($a, $b) => $a['pct'] <=> $b['pct']);
        usort($newcomers, fn ($a, $b) => $b['cur'] <=> $a['cur']);
        return [$surging, $declining, $newcomers, $anomalies];
    }

    private function isNotable(array $kpis, array $surging, array $declining, array $newcomers, array $anomalies): bool
    {
        if (! empty($newcomers) || ! empty($anomalies)) return true;
        if (! empty($surging)   && abs(($surging[0]['pct']   ?? 0))     > 50) return true;
        if (! empty($declining) && abs(($declining[0]['pct'] ?? 0))     > 50) return true;

        $bookings7d      = (int) ($kpis['bookings_7d']       ?? 0);
        $bookingsPrior7d = (int) ($kpis['bookings_prior_7d'] ?? 0);
        if ($bookingsPrior7d > 0) {
            $pct = abs(($bookings7d - $bookingsPrior7d) / $bookingsPrior7d * 100);
            if ($pct > 5) return true;
        } elseif ($bookings7d > 0) {
            // First-ever bookings this week.
            return true;
        }
        return false;
    }

    private function renderSubject(array $kpis, array $surging, array $declining, array $newcomers): string
    {
        $bookings = (int) ($kpis['bookings_7d'] ?? 0);
        $delta    = $this->wowPct($kpis['bookings_7d'] ?? 0, $kpis['bookings_prior_7d'] ?? 0);
        $arrow    = $delta === null ? '·' : ($delta >= 0 ? '↑' : '↓');
        $pct      = $delta === null ? 'new' : (abs($delta) < 100 ? round(abs($delta)) . '%' : '>100%');

        $moverNotes = [];
        if (! empty($surging))   $moverNotes[] = count($surging)   . ' surging';
        if (! empty($declining)) $moverNotes[] = count($declining) . ' declining';
        if (! empty($newcomers)) $moverNotes[] = count($newcomers) . ' new';
        $moverTail = empty($moverNotes) ? '' : ' · ' . implode(', ', $moverNotes);

        return "[BookReady] Activity — {$bookings} bookings {$arrow}{$pct} WoW{$moverTail}";
    }

    private function renderBody(
        array $trends, array $kpis, array $surging, array $declining, array $newcomers, array $anomalies,
    ): string {
        $date = Carbon::now()->format('M j, Y');
        $snapDate = $trends['snapshot_date'] ?? '—';

        $kpiBlock = $this->renderKpis($kpis);

        $moversBlock = $this->renderMovers($surging, $declining, $newcomers);

        $anomBlock = empty($anomalies)
            ? "⚠ ANOMALIES\n  (none — no tenant swung by 5× or to 20% of prior pace)\n"
            : "⚠ ANOMALIES\n" . implode("\n", array_map(function ($a) {
                return $a['kind'] === 'surge'
                    ? "  • {$a['id']} surged to {$a['cur']} bookings (prior 7d: {$a['pri']})"
                    : "  • {$a['id']} dropped to {$a['cur']} bookings (prior 7d: {$a['pri']})";
            }, $anomalies)) . "\n";

        return <<<TXT
BookReady Activity digest — {$date}

📊 HEADLINE (7d vs prior 7d)
{$kpiBlock}

📈 TOP MOVERS
{$moversBlock}

{$anomBlock}
────────────────────────────────────────────────────────────
Snapshot date: {$snapDate}
Dashboard: https://app.bkrdy.me/admin/activity
Drill-ins:
  https://app.bkrdy.me/admin/activity/patterns
  https://app.bkrdy.me/admin/activity/movers
  https://app.bkrdy.me/admin/activity/revenue

— BookReady ops (admin:activity-digest, daily)
TXT;
    }

    private function renderKpis(array $kpis): string
    {
        $line = function (string $label, ?string $cur, ?string $prior, ?int $deltaPct, string $deltaSuffix = '%') {
            $padded = str_pad($label . ':', 22);
            $arrow = $deltaPct === null ? '·'
                : ($deltaPct > 0  ? '↑'
                : ($deltaPct < 0  ? '↓'
                :                   '·'));
            $deltaText = $deltaPct === null ? '(no baseline)'
                : '(' . ($deltaPct >= 0 ? '+' : '') . $deltaPct . $deltaSuffix . ' WoW)';
            return "  {$padded}{$cur} {$arrow} {$deltaText}";
        };

        $bookings = $kpis['bookings_7d']       ?? 0;
        $bookPri  = $kpis['bookings_prior_7d'] ?? 0;
        $active   = $kpis['active_tenants_7d']        ?? 0;
        $actPri   = $kpis['active_tenants_prior_7d']  ?? 0;
        $cancel   = $kpis['cancellation_pct_7d']       ?? null;
        $cancPri  = $kpis['cancellation_pct_prior_7d'] ?? null;
        $lead     = $kpis['lead_hours_7d']             ?? null;
        $leadPri  = $kpis['lead_hours_prior_7d']       ?? null;
        $rev      = (int) ($kpis['revenue_7d_cents']       ?? 0);
        $revPri   = (int) ($kpis['revenue_prior_7d_cents'] ?? 0);

        return implode("\n", [
            $line('Bookings',          (string) $bookings,            (string) $bookPri,  $this->wowPct($bookings, $bookPri)),
            $line('Active tenants',    (string) $active,              (string) $actPri,   $this->wowPct($active, $actPri)),
            $line('Cancellation',      $cancel !== null ? $cancel . '%' : '—',
                                       $cancPri !== null ? $cancPri . '%' : '—',
                                       $this->wowPct($cancel, $cancPri)),
            $line('Avg lead time',     $lead !== null ? $lead . 'h' : '—',
                                       $leadPri !== null ? $leadPri . 'h' : '—',
                                       $this->wowPct($lead, $leadPri)),
            $line('Revenue (est)',     '$' . number_format($rev / 100, 0),
                                       '$' . number_format($revPri / 100, 0),
                                       $this->wowPct($rev, $revPri)),
        ]);
    }

    private function renderMovers(array $surging, array $declining, array $newcomers): string
    {
        $lines = [];
        if (! empty($surging)) {
            $s = $surging[0];
            $pct = round($s['pct']);
            $lines[] = "  Surging   · {$s['id']}  {$s['pri']} → {$s['cur']} bookings ("
                . ($pct >= 0 ? '+' : '') . $pct . '%)';
        } else {
            $lines[] = '  Surging   · —';
        }

        if (! empty($declining)) {
            $d = $declining[0];
            $pct = round($d['pct']);
            $lines[] = "  Declining · {$d['id']}  {$d['pri']} → {$d['cur']} bookings ("
                . ($pct >= 0 ? '+' : '') . $pct . '%)';
        } else {
            $lines[] = '  Declining · —';
        }

        if (! empty($newcomers)) {
            $n = $newcomers[0];
            $lines[] = "  Newcomer  · {$n['id']}  0 → {$n['cur']} bookings (first week)";
        } else {
            $lines[] = '  Newcomer  · —';
        }
        return implode("\n", $lines);
    }

    /** Percent change, rounded to int. null when prior is 0/null (no baseline). */
    private function wowPct(int|float|null $cur, int|float|null $prior): ?int
    {
        if ($cur === null && $prior === null) return null;
        if ($prior === null || $prior == 0) return null;
        if ($cur === null) return null;
        return (int) round((($cur - $prior) / $prior) * 100);
    }
}
