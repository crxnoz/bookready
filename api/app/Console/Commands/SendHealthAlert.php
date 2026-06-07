<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * admin:health-alert — immediate notification when a probe goes bad.
 *
 * Runs every 5 minutes via the scheduler. For every probe currently
 * reading 'bad', sends ONE email — then sets a 6-hour cooldown on that
 * specific probe key so the same condition doesn't flood the inbox.
 *
 * Why a cooldown instead of a "transition" check:
 *   We'd otherwise need to persist the prior state somewhere and risk
 *   a missed alert when the snapshot itself failed. Cooldown gives the
 *   same end-user experience (one email per incident) with zero state.
 *
 * Warn-level probes are NOT alerted here — they go into the daily
 * digest instead. This keeps "immediate" channel for actual incidents.
 *
 * Send target: ALERTS_EMAIL_TO env, falls back to carrenoluis318@gmail.com
 * (the same convention as support:digest + uptime alerts).
 */
class SendHealthAlert extends Command
{
    protected $signature = 'admin:health-alert
                            {--force : Send even if cooldown is active}
                            {--dry-run : Print what would be sent, no email}';

    protected $description = 'Send an immediate email when a system-health probe is bad.';

    /** 6h between alerts for the same probe key. */
    private const COOLDOWN_SECONDS = 6 * 3600;

    public function handle(AdminDashboardController $controller): int
    {
        $snapshot = $controller->getHealthSnapshot();
        $to = env('ALERTS_EMAIL_TO') ?: 'carrenoluis318@gmail.com';
        $force = (bool) $this->option('force');
        $dry   = (bool) $this->option('dry-run');

        // Flatten sections → probes with full context.
        $bad = [];
        foreach ($snapshot['sections'] as $sectionKey => $probes) {
            foreach ($probes as $probeKey => $probe) {
                if (($probe['status'] ?? 'unknown') === 'bad') {
                    $bad[] = ['section' => $sectionKey, 'key' => $probeKey, 'probe' => $probe];
                }
            }
        }

        if (empty($bad)) {
            $this->info('All probes ok or warn — no alert sent.');
            return self::SUCCESS;
        }

        // Filter out anything still in cooldown unless --force.
        $sendable = collect($bad)->filter(function ($item) use ($force) {
            if ($force) return true;
            $cooldownKey = "admin:health-alert:cooldown:{$item['key']}";
            return ! Cache::has($cooldownKey);
        })->values();

        if ($sendable->isEmpty()) {
            $this->info('All bad probes already alerted within the last 6h.');
            return self::SUCCESS;
        }

        // Build one email per bad probe — small enough that "one issue per
        // email" is more useful than batching, and lets the operator
        // forward / triage individually.
        foreach ($sendable as $item) {
            $key   = $item['key'];
            $probe = $item['probe'];
            $label = self::PROBE_LABELS[$key] ?? $key;
            $subject = "[BookReady] {$label} is BAD — {$probe['value']}";

            $body = $this->renderBody($item['section'], $key, $label, $probe);

            if ($dry) {
                $this->line("DRY-RUN would send: {$subject}");
                $this->line(rtrim($body));
                $this->line(str_repeat('─', 60));
                continue;
            }

            try {
                Mail::raw($body, function ($m) use ($to, $subject) {
                    $m->to($to)->subject($subject);
                });
                Cache::put("admin:health-alert:cooldown:{$key}", true, self::COOLDOWN_SECONDS);
                Log::warning('admin:health-alert sent', ['probe' => $key, 'to' => $to, 'value' => $probe['value']]);
                $this->info("Sent: {$subject}");
            } catch (\Throwable $e) {
                Log::error('admin:health-alert send failed', ['probe' => $key, 'error' => $e->getMessage()]);
                $this->error("Send failed for {$key}: {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }

    /** Human label per probe slug (matches the System Health UI). */
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

    private function renderBody(string $section, string $key, string $label, array $probe): string
    {
        $runbook = trim((string) ($probe['runbook'] ?? ''));
        $runbookBlock = $runbook !== ''
            ? "\nWhat to check first:\n  {$runbook}\n"
            : '';

        return <<<TXT
🔴 {$label} is reporting BAD.

Section: {$section}
Status:  bad
Value:   {$probe['value']}
Note:    {$probe['note']}
{$runbookBlock}
Open the live dashboard:
  https://app.bkrdy.me/admin/system

Drill in:
  https://app.bkrdy.me/admin/system/errors    (recent log entries)
  https://app.bkrdy.me/admin/system/queue     (pending + failed jobs)
  https://app.bkrdy.me/admin/system/deploys   (recent deploys)

────────────────────────────────────────────────────────────
You'll get at most ONE of these per probe per 6 hours. If the
condition persists past 6h, the next check sends a fresh alert.
Warns are batched into the daily digest, not sent immediately.
────────────────────────────────────────────────────────────

— BookReady ops (admin:health-alert)
TXT;
    }
}
