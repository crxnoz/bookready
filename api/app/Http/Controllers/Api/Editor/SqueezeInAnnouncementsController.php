<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 follow-up — owner-announced squeeze-ins.
 *
 *   GET    /editor/squeeze-in-announcements?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   POST   /editor/squeeze-in-announcements
 *   DELETE /editor/squeeze-in-announcements/{id}
 *
 * An announcement is the owner publishing "I have extra time on this
 * date for these services — book me at a premium fee." The customer
 * sees it as a bookable slot tagged 'squeeze_in' in Step 3 of the
 * booking flow, alongside the existing "After hours" section.
 *
 * Distinct from SqueezeInController (which manages the config row)
 * and AvailabilityRequestsController (the customer-requested queue).
 * No edit endpoint — delete + recreate is the v1 UX since announcements
 * are short-lived (typically today/tomorrow) and small to author.
 *
 * Follows the canonical "flatten before tenancy()->end()" pattern.
 */
class SqueezeInAnnouncementsController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'           => (int)    $row->id,
            'date'         => (string) substr((string) $row->date, 0, 10),
            'slot_windows' => $row->slot_windows ? json_decode((string) $row->slot_windows, true) : [],
            'service_ids'  => $row->service_ids ? json_decode((string) $row->service_ids, true) : null,
            'fee_cents'    => $row->fee_cents !== null ? (int) $row->fee_cents : null,
            'notes'        => $row->notes,
        ];
    }

    /**
     * GET /editor/squeeze-in-announcements
     *
     * Range-scoped list. Defaults to today → +30d (squeeze-ins are
     * short-horizon by nature; the owner's "I have time NOW" use case
     * doesn't need a month-long catalog).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'sometimes|date_format:Y-m-d',
            'to'   => 'sometimes|date_format:Y-m-d',
        ]);
        $from = $validated['from'] ?? Carbon::today()->toDateString();
        $to   = $validated['to']   ?? Carbon::parse($from)->addDays(30)->toDateString();

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('squeeze_in_announcements')) {
            tenancy()->end();
            return response()->json(['announcements' => [], 'from' => $from, 'to' => $to]);
        }

        $rows = DB::table('squeeze_in_announcements')
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();

        tenancy()->end();

        return response()->json([
            'announcements' => $rows,
            'from'          => $from,
            'to'            => $to,
        ]);
    }

    /**
     * POST /editor/squeeze-in-announcements
     *
     * Create a single announcement. service_ids = null means "all
     * services" (the typical case — owner just has time, doesn't care
     * what gets booked). fee_cents = null inherits squeeze_in_config.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date'                 => 'required|date_format:Y-m-d|after_or_equal:today',
            'slot_windows'         => 'required|array|min:1|max:16',
            'slot_windows.*.start' => 'required|date_format:H:i',
            'slot_windows.*.end'   => 'required|date_format:H:i',
            'service_ids'          => 'nullable|array',
            'service_ids.*'        => 'integer|min:1',
            // Optional dollar amount; converted to cents for storage.
            'fee'                  => 'nullable|numeric|min:0|max:10000',
            'notes'                => 'nullable|string|max:200',
        ]);

        // Each window must be well-ordered.
        foreach ($validated['slot_windows'] as $i => $w) {
            if ($w['end'] <= $w['start']) {
                return response()->json([
                    'message' => 'Window ' . ($i + 1) . ': end time must be after start time.',
                ], 422);
            }
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $payload = [
            'date'         => $validated['date'],
            'slot_windows' => json_encode(array_map(
                fn ($w) => ['start' => $w['start'], 'end' => $w['end']],
                $validated['slot_windows'],
            )),
            'service_ids'  => isset($validated['service_ids']) && count($validated['service_ids']) > 0
                                ? json_encode(array_values(array_unique($validated['service_ids'])))
                                : null,
            'fee_cents'    => isset($validated['fee']) ? (int) round($validated['fee'] * 100) : null,
            'notes'        => $validated['notes'] ?? null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ];
        $id = DB::table('squeeze_in_announcements')->insertGetId($payload);
        $row = DB::table('squeeze_in_announcements')->where('id', $id)->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    /**
     * DELETE /editor/squeeze-in-announcements/{id}
     *
     * Pull the announcement. Idempotent — 200 even when the id is
     * already gone (covers the racy "two tabs" delete case).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $deleted = DB::table('squeeze_in_announcements')->where('id', $id)->delete();

        tenancy()->end();

        return response()->json([
            'id'      => $id,
            'cleared' => (bool) $deleted,
        ]);
    }
}
