<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * admin:health-digest — daily summary of warn + bad probes.
 *
 * Runs once daily via the scheduler. Skipped on completely-clean days
 * unless --force is passed, so a healthy week never adds noise. Covers
 * everything that's degraded (warn AND bad) — bad probes are already
 * getting immediate alerts but appearing in the digest gives context
 * ("this has been bad for 2 days now").
 *
 * Also includes a green-status footer (scheduler, last deploy, snapshot
 * freshness) so the operator can confirm core systems are alive.
 */
class SendHealthDigest extends Command
{
    protected $signature = 'admin:health-digest
                            {--force : Send even when nothing is degraded}
                            {--dry-run : Print body, no email}';

    protected $description = 'Send a daily system-health digest covering anything warn/bad.';

    private const PROBE_LABELS = [
        'api_errors'         => 'API errors (24h)',
        'database'           => 'Database',
        'disk'               => 'Disk usage',
        'ssl'                => 'SSL cert',
        'queue'              => 'Queue',
        'snapshot_freshness' => 'Snapshot freshness',
        'scheduler'          => 'Scheduler',
        'public_site'        => 'Public site',
        'mailer'             => 'Mailer',
        'last_deploy'        => 'Last deploy',
    ];

    public function handle(AdminDashboardController $controller): int
    {
        $snapshot = $controller->getHealthSnapshot();
        $to = env('ALERTS_EMAIL_TO') ?: 'carrenoluis318@gmail.com';
        $force = (bool) $this->option('force');
        $dry   = (bool) $this->option('dry-run');

        $bad = [];
        $warn = [];
        $signals = []; // for the footer (scheduler / deploy / snapshot)
        foreach ($snapshot['sections'] as $sectionKey => $probes) {
            foreach ($probes as $key => $probe) {
                $entry = ['section' => $sectionKey, 'key' => $key, 'probe' => $probe];
                $status = $probe['status'] ?? 'unknown';
                if ($status === 'bad')  $bad[] = $entry;
                if ($status === 'warn') $warn[] = $entry;
                if (in_array($key, ['scheduler', 'last_deploy', 'snapshot_freshness'], true)) {
                    $signals[$key] = $probe;
                }
            }
        }

        if (empty($bad) && empty($warn) && ! $force) {
            $this->info('All probes green — digest skipped.');
            return self::SUCCESS;
        }

        $count = count($bad) + count($warn);
        $subject = $count === 0
            ? '[BookReady] System Health — all clear'
            : '[BookReady] System Health — ' . count($bad) . " bad, " . count($warn) . " warn";

        $body = $this->renderBody($bad, $warn, $signals, $count);

        if ($dry) {
            $this->line("DRY-RUN would send: {$subject}");
            $this->line($body);
            return self::SUCCESS;
        }

        try {
            Mail::raw($body, function ($m) use ($to, $subject) {
                $m->to($to)->subject($subject);
            });
            Log::info('admin:health-digest sent', ['to' => $to, 'bad' => count($bad), 'warn' => count($warn)]);
            $this->info("Digest sent ({$count} issues).");
        } catch (\Throwable $e) {
            Log::error('admin:health-digest failed', ['error' => $e->getMessage()]);
            $this->error("Send failed: {$e->getMessage()}");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function renderBody(array $bad, array $warn, array $signals, int $count): string
    {
        $date = Carbon::now()->format('M j, Y');

        $badBlock = $this->renderGroup('🔴 BAD', $bad)
            ?: "🔴 BAD\n  (none)\n";

        $warnBlock = $this->renderGroup('🟡 WARN', $warn)
            ?: "🟡 WARN\n  (none)\n";

        $intro = $count === 0
            ? "Nothing degraded. Sending because --force was passed."
            : "{$count} probe" . ($count === 1 ? '' : 's') . " need attention.";

        // Footer signals — quick "is the core alive" check.
        $sigLines = [];
        foreach (['scheduler', 'last_deploy', 'snapshot_freshness'] as $k) {
            if (! isset($signals[$k])) continue;
            $p = $signals[$k];
            $sigLines[] = "  " . str_pad(self::PROBE_LABELS[$k], 22) . " " . $p['value'] . " · " . $p['note'];
        }

        $sig = implode("\n", $sigLines);

        return <<<TXT
BookReady System Health digest — {$date}

{$intro}

{$badBlock}
{$warnBlock}
────────────────────────────────────────────────────────────
Signals (core alive?):
{$sig}
────────────────────────────────────────────────────────────

Dashboard: https://app.bkrdy.me/admin/system
Drill in:
  https://app.bkrdy.me/admin/system/errors
  https://app.bkrdy.me/admin/system/queue
  https://app.bkrdy.me/admin/system/deploys

— BookReady ops (admin:health-digest, daily)
TXT;
    }

    private function renderGroup(string $heading, array $items): string
    {
        if (empty($items)) return '';
        $lines = ["{$heading}"];
        foreach ($items as $item) {
            $label = self::PROBE_LABELS[$item['key']] ?? $item['key'];
            $p     = $item['probe'];
            $lines[] = "  • {$label}: {$p['value']}";
            $lines[] = "      {$p['note']}";
            if (! empty($p['runbook'])) {
                $lines[] = "      ↪ " . $p['runbook'];
            }
        }
        return implode("\n", $lines) . "\n";
    }
}
