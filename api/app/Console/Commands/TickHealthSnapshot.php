<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * admin:health-tick — one row per trendable probe, every 15 min.
 *
 * Powers the 24-hour sparklines on /admin/system. Skips untrendable
 * probes (mailer, last_deploy) — those values aren't time-series
 * meaningful and just bloat the table.
 *
 * Pruning: keeps the last 90 days. At 96 ticks/day × 8 probes that's
 * ~70k rows max, ~4 MB on disk, indexed for sub-ms range scans.
 */
class TickHealthSnapshot extends Command
{
    protected $signature = 'admin:health-tick {--prune-days=90}';

    protected $description = 'Append one row per trendable probe to system_health_snapshots (powers sparklines).';

    public function handle(AdminDashboardController $controller): int
    {
        $snapshot = $controller->getHealthSnapshot();
        $now = now();
        $rows = [];

        foreach ($snapshot['sections'] as $section) {
            foreach ($section as $key => $probe) {
                $value = $controller->numericValueFor($key, $probe);
                if ($value === null) continue; // untrendable
                $rows[] = [
                    'snapshot_at'   => $now,
                    'probe_key'     => $key,
                    'status'        => $probe['status'] ?? 'unknown',
                    'numeric_value' => $value,
                ];
            }
        }

        if (! empty($rows)) {
            DB::table('system_health_snapshots')->insert($rows);
        }

        // Prune. Single delete per run; tiny op given the indexed column.
        $cutoff = $now->copy()->subDays((int) $this->option('prune-days'));
        DB::table('system_health_snapshots')->where('snapshot_at', '<', $cutoff)->delete();

        $this->info('Ticked ' . count($rows) . ' probes (' . $now->format('H:i:s') . ').');
        return self::SUCCESS;
    }
}
