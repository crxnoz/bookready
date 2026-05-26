<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\SitePrivacyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase S1 — site password unlock for private sites.
 *
 * POST /public/sites/{slug}/unlock { password }
 *   → 200 { token } on success
 *   → 200 { error: 'wrong_password' } on miss (deliberate 200 — we never
 *     leak whether the site exists or is set to private)
 *
 * Rate-limited via routes/api.php to deter password guessing.
 */
class PublicSiteUnlockController extends Controller
{
    public function unlock(Request $request, string $slug): JsonResponse
    {
        $slug = strtolower($slug);
        if (! preg_match('/^[a-z0-9]+$/', $slug)) {
            return response()->json(['error' => 'not_found']);
        }

        $request->validate([
            'password' => 'required|string|max:255',
        ]);

        $tenant = Tenant::find($slug);
        if (! $tenant) {
            return response()->json(['error' => 'not_found']);
        }

        tenancy()->initialize($tenant);
        $token = SitePrivacyService::tryUnlock($slug, $request->input('password'));
        tenancy()->end();

        if (! $token) {
            return response()->json(['error' => 'wrong_password']);
        }

        return response()->json(['token' => $token]);
    }
}
