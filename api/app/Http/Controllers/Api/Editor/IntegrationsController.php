<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Owner-facing integrations endpoints. Currently:
 *
 *   GET  /editor/integrations/ics-feed             — return the owner's
 *                                                     calendar-feed URL,
 *                                                     minting a token lazily
 *                                                     on first request.
 *   POST /editor/integrations/ics-feed/regenerate  — rotate the token,
 *                                                     invalidating any
 *                                                     existing subscription.
 *
 * Lives in the editor namespace (Sanctum-authed). The PUBLIC consumption
 * route for the feed itself is PublicCalendarFeedController::owner().
 */
class IntegrationsController extends Controller
{
    /** Where calendar feeds are served from. Public, no auth, token-gated. */
    private const FEED_BASE = 'https://api.bkrdy.me/api/v1/cal/owner';

    public function icsFeed(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->tenant_id) {
            return response()->json(['message' => 'No active workspace.'], 400);
        }

        // Migration may not have run yet on a dev box — degrade gracefully
        // rather than 500. The frontend treats `available: false` as
        // "calendar feed isn't available here yet."
        if (! Schema::hasColumn('users', 'ics_feed_token')) {
            return response()->json([
                'available' => false,
                'message'   => 'Calendar feed will be available after the next migration.',
            ]);
        }

        $token = $user->ics_feed_token;
        if (! $token) {
            $token = $this->mintToken($user->id);
        }

        return response()->json([
            'available' => true,
            'token'     => $token,
            'url'       => $this->buildUrl($user->tenant_id, $token),
        ]);
    }

    public function regenerateIcsFeed(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->tenant_id) {
            return response()->json(['message' => 'No active workspace.'], 400);
        }
        if (! Schema::hasColumn('users', 'ics_feed_token')) {
            return response()->json([
                'available' => false,
                'message'   => 'Calendar feed will be available after the next migration.',
            ]);
        }

        $token = $this->mintToken($user->id);

        return response()->json([
            'available' => true,
            'token'     => $token,
            'url'       => $this->buildUrl($user->tenant_id, $token),
        ]);
    }

    /**
     * Generate + persist a fresh opaque token. Retry on the (extraordinarily
     * unlikely) unique-constraint collision so a re-roll never breaks.
     */
    private function mintToken(int $userId): string
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $candidate = Str::random(48);
            try {
                // DB::table over the Eloquent model — bypasses $fillable
                // and avoids any model events on the central users table.
                DB::table('users')->where('id', $userId)->update([
                    'ics_feed_token' => $candidate,
                    'updated_at'     => now(),
                ]);
                return $candidate;
            } catch (\Throwable $e) {
                if ($attempt === 2) throw $e;
            }
        }
        throw new \RuntimeException('Could not mint ics_feed_token');
    }

    private function buildUrl(string $tenantSlug, string $token): string
    {
        return sprintf('%s/%s/%s.ics', self::FEED_BASE, $tenantSlug, $token);
    }
}
