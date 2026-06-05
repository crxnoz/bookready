<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * #123 — Uptime / health check endpoint.
 *
 * GET /api/v1/health
 *
 * Returns a small JSON status used by:
 *   - the server-side `bookready-uptime.sh` cron (every 2 min)
 *   - any external monitor (UptimeRobot / BetterStack)
 *
 * Checks the CENTRAL database with a fast `SELECT 1`. We deliberately do
 * NOT touch tenant databases (would be slow + meaningless for a liveness
 * probe). A failed DB check flips the HTTP status to 503 so monitors
 * treat a DB-down-but-PHP-up state as an outage rather than a false OK.
 *
 * No auth, no tenancy. Lightly throttled at the route level so it can't
 * be turned into a cheap DB-pinging amplifier.
 */
class HealthController extends Controller
{
    public function show(): JsonResponse
    {
        $dbOk   = false;
        $dbMs   = null;

        try {
            $start = microtime(true);
            // Fast liveness probe on the central connection. select() avoids
            // any model/event overhead.
            DB::connection()->select('SELECT 1');
            $dbMs = (int) round((microtime(true) - $start) * 1000);
            $dbOk = true;
        } catch (\Throwable $e) {
            $dbOk = false;
        }

        $ok = $dbOk;

        return response()->json([
            'status' => $ok ? 'ok' : 'degraded',
            'checks' => [
                'database' => [
                    'ok'         => $dbOk,
                    'latency_ms' => $dbMs,
                ],
            ],
            // ISO-8601 UTC; lets a monitor confirm the clock + that the
            // response is freshly generated (not a stale cache).
            'time' => now()->toIso8601String(),
        ], $ok ? 200 : 503);
    }
}
