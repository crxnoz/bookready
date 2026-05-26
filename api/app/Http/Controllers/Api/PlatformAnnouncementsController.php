<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Platform-wide announcements shown on every tenant's dashboard.
 *
 * Read endpoint is open to any authenticated user (every tenant owner
 * needs to see them). Write endpoints are gated to users.is_admin and
 * live under the /admin prefix; see routes/api.php.
 */
class PlatformAnnouncementsController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'            => (int)  $row->id,
            'title'         =>        $row->title,
            'body'          =>        $row->body,
            'cta_label'     =>        $row->cta_label    ?? null,
            'cta_href'      =>        $row->cta_href     ?? null,
            'is_active'     => (bool) $row->is_active,
            'sort_order'    => (int)  $row->sort_order,
            'published_at'  =>        $row->published_at ?? null,
            'created_at'    =>        $row->created_at   ?? null,
            'updated_at'    =>        $row->updated_at   ?? null,
        ];
    }

    /**
     * Public-ish read — any authed user. Active-only, newest first by
     * published_at (falling back to created_at). Caps at 10 to keep the
     * dashboard payload tiny.
     */
    public function index(Request $request): JsonResponse
    {
        if (! Schema::hasTable('platform_announcements')) {
            return response()->json([]);
        }

        $rows = DB::table('platform_announcements')
            ->where('is_active', true)
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->limit(10)
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();

        return response()->json($rows);
    }

    // ── Admin-only below ─────────────────────────────────────────────────

    public function adminIndex(Request $request): JsonResponse
    {
        if (! Schema::hasTable('platform_announcements')) {
            return response()->json([]);
        }
        $rows = DB::table('platform_announcements')
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();
        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request, true);
        $id = DB::table('platform_announcements')->insertGetId([
            'title'        => trim($validated['title']),
            'body'         => trim($validated['body']),
            'cta_label'    => $validated['cta_label']    ?? null,
            'cta_href'     => $validated['cta_href']     ?? null,
            'is_active'    => $validated['is_active']    ?? true,
            'sort_order'   => $validated['sort_order']   ?? 0,
            // Default published_at to "now" so new posts surface immediately.
            'published_at' => $validated['published_at'] ?? now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $row = DB::table('platform_announcements')->find($id);
        return response()->json($this->format($row), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $this->validatePayload($request, false);

        $row = DB::table('platform_announcements')->find($id);
        if (! $row) return response()->json(['message' => 'Not found'], 404);

        $data = ['updated_at' => now()];
        foreach (['title', 'body', 'cta_label', 'cta_href'] as $k) {
            if (array_key_exists($k, $validated)) {
                $data[$k] = is_string($validated[$k]) ? trim($validated[$k]) : $validated[$k];
            }
        }
        if (array_key_exists('is_active',    $validated)) $data['is_active']    = (bool) $validated['is_active'];
        if (array_key_exists('sort_order',   $validated)) $data['sort_order']   = (int)  $validated['sort_order'];
        if (array_key_exists('published_at', $validated)) $data['published_at'] = $validated['published_at'];

        DB::table('platform_announcements')->where('id', $id)->update($data);
        $updated = DB::table('platform_announcements')->find($id);
        return response()->json($this->format($updated));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $row = DB::table('platform_announcements')->find($id);
        if (! $row) return response()->json(['message' => 'Not found'], 404);
        DB::table('platform_announcements')->where('id', $id)->delete();
        return response()->json(['message' => 'Deleted', 'deleted' => true]);
    }

    private function validatePayload(Request $request, bool $isCreate): array
    {
        $req = $isCreate ? 'required' : 'sometimes';
        return $request->validate([
            'title'        => $req . '|string|max:255',
            'body'         => $req . '|string|max:5000',
            'cta_label'    => 'sometimes|nullable|string|max:100',
            'cta_href'     => 'sometimes|nullable|string|max:500',
            'is_active'    => 'sometimes|boolean',
            'sort_order'   => 'sometimes|integer',
            'published_at' => 'sometimes|nullable|date',
        ]);
    }
}
