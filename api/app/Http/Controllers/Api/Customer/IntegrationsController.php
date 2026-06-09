<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Customer-side integrations endpoints. Currently:
 *
 *   GET  /customer/ics-feed             — return the customer's
 *                                          calendar-feed URL, minting a
 *                                          token lazily on first request.
 *   POST /customer/ics-feed/regenerate  — rotate the token, invalidating
 *                                          any existing subscription.
 *
 * Mirror of `App\Http\Controllers\Api\Editor\IntegrationsController` —
 * separate file so the customer surface stays self-contained and the
 * authed-user expectation (`CustomerUser`, not `User`) is encoded in
 * the file's namespace + middleware group.
 *
 * PUBLIC consumption route for the feed itself lives in
 * `PublicCalendarFeedController::customer()` (no auth, token-gated).
 */
class IntegrationsController extends Controller
{
    /** Where customer calendar feeds are served from. Public, no auth. */
    private const FEED_BASE = 'https://api.bkrdy.me/api/v1/cal/customer';

    public function icsFeed(Request $request): JsonResponse
    {
        $customer = $request->user();
        if (! $customer) {
            return response()->json(['message' => 'Not signed in.'], 401);
        }

        // Degrade gracefully on a dev box that hasn't run the migration.
        if (! Schema::hasColumn('customer_users', 'ics_feed_token')) {
            return response()->json([
                'available' => false,
                'message'   => 'Calendar feed will be available after the next migration.',
            ]);
        }

        $token = $customer->ics_feed_token;
        if (! $token) {
            $token = $this->mintToken((int) $customer->id);
        }

        return response()->json([
            'available' => true,
            'token'     => $token,
            'url'       => $this->buildUrl($token),
        ]);
    }

    public function regenerateIcsFeed(Request $request): JsonResponse
    {
        $customer = $request->user();
        if (! $customer) {
            return response()->json(['message' => 'Not signed in.'], 401);
        }
        if (! Schema::hasColumn('customer_users', 'ics_feed_token')) {
            return response()->json([
                'available' => false,
                'message'   => 'Calendar feed will be available after the next migration.',
            ]);
        }

        $token = $this->mintToken((int) $customer->id);

        return response()->json([
            'available' => true,
            'token'     => $token,
            'url'       => $this->buildUrl($token),
        ]);
    }

    /**
     * Generate + persist a fresh opaque token. Retry on the (extraordinarily
     * unlikely) unique-constraint collision so a re-roll never breaks.
     */
    private function mintToken(int $customerUserId): string
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $candidate = Str::random(48);
            try {
                // DB::table over the Eloquent model — bypasses $fillable
                // and avoids any model events on the central customer_users table.
                DB::table('customer_users')->where('id', $customerUserId)->update([
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

    private function buildUrl(string $token): string
    {
        return sprintf('%s/%s.ics', self::FEED_BASE, $token);
    }
}
