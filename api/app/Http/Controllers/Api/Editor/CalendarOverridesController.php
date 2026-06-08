<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Availability 2.0 · Phase 1 · Smart Calendar editor.
 *
 * CRUD on the calendar_overrides table. Date is the natural primary key
 * from the UI's perspective — one override per date, edit = upsert,
 * clear = DELETE. Follows the canonical "flatten before tenancy()->end()"
 * pattern so nothing lazy-serializes against a torn-down connection.
 *
 * No SlotGenerator changes; the resolver in
 * App\Services\AvailabilityOverrideResolver consumes this data at slot-
 * generation time.
 */
class CalendarOverridesController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'           => (int)  $row->id,
            'date'         =>         (string) substr((string) $row->date, 0, 10),
            'is_available' => (bool) $row->is_available,
            'open_time'    =>         $row->open_time   ? substr((string) $row->open_time, 0, 5)   : null,
            'close_time'   =>         $row->close_time  ? substr((string) $row->close_time, 0, 5)  : null,
            'break_start'  =>         $row->break_start ? substr((string) $row->break_start, 0, 5) : null,
            'break_end'    =>         $row->break_end   ? substr((string) $row->break_end, 0, 5)   : null,
            'staff_ids'    =>         $row->staff_ids   ? json_decode((string) $row->staff_ids,   true) : null,
            'service_ids'  =>         $row->service_ids ? json_decode((string) $row->service_ids, true) : null,
            'notes'        =>         $row->notes,
        ];
    }

    /**
     * GET /editor/calendar-overrides?from=YYYY-MM-DD&to=YYYY-MM-DD
     *
     * Range-scoped list. The Smart Calendar grid asks for one month at a
     * time. `from` defaults to today; `to` defaults to from+90d so the
     * payload stays small even if the caller forgets bounds.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'sometimes|date_format:Y-m-d',
            'to'   => 'sometimes|date_format:Y-m-d',
        ]);
        $from = $validated['from'] ?? Carbon::today()->toDateString();
        $to   = $validated['to']   ?? Carbon::parse($from)->addDays(90)->toDateString();

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $rows = DB::table('calendar_overrides')
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();

        tenancy()->end();

        return response()->json([
            'overrides' => $rows,
            'from'      => $from,
            'to'        => $to,
        ]);
    }

    /**
     * GET /editor/calendar-overrides/{date}
     *
     * Returns the override for a single date, or 404 when none exists.
     * 404 (not 200 with null) so the UI's edit-screen can branch on the
     * existence vs absence cleanly.
     */
    public function show(Request $request, string $date): JsonResponse
    {
        if (! self::isValidDate($date)) {
            return response()->json(['message' => 'Invalid date.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('calendar_overrides')->where('date', $date)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'No override for this date.'], 404);
        }

        $payload = $this->format($row);
        tenancy()->end();

        return response()->json($payload);
    }

    /**
     * PUT /editor/calendar-overrides/{date}
     *
     * Upsert. The date is the primary key from the UI; the controller
     * inserts when missing, replaces when present. Validation rejects
     * impossible combos (close before open, break outside hours, etc).
     */
    public function upsert(Request $request, string $date): JsonResponse
    {
        if (! self::isValidDate($date)) {
            return response()->json(['message' => 'Invalid date.'], 422);
        }

        $validated = $request->validate([
            'is_available' => 'sometimes|boolean',
            'open_time'    => 'nullable|date_format:H:i',
            'close_time'   => 'nullable|date_format:H:i',
            'break_start'  => 'nullable|date_format:H:i',
            'break_end'    => 'nullable|date_format:H:i',
            'staff_ids'    => 'nullable|array',
            'staff_ids.*'  => 'integer|min:1',
            'service_ids'  => 'nullable|array',
            'service_ids.*' => 'integer|min:1',
            'notes'        => 'nullable|string|max:200',
        ]);

        // Coherence checks: close must come after open; break inside hours.
        if (! empty($validated['open_time']) && ! empty($validated['close_time'])
            && $validated['close_time'] <= $validated['open_time']) {
            return response()->json(['message' => 'Closing time must be after opening time.'], 422);
        }
        if (! empty($validated['break_start']) && ! empty($validated['break_end'])
            && $validated['break_end'] <= $validated['break_start']) {
            return response()->json(['message' => 'Break end must be after break start.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $payload = [
            'date'         => $date,
            'is_available' => array_key_exists('is_available', $validated) ? (bool) $validated['is_available'] : true,
            'open_time'    => $validated['open_time']    ?? null,
            'close_time'   => $validated['close_time']   ?? null,
            'break_start'  => $validated['break_start']  ?? null,
            'break_end'    => $validated['break_end']    ?? null,
            'staff_ids'    => isset($validated['staff_ids'])   ? json_encode(array_values(array_unique($validated['staff_ids'])))   : null,
            'service_ids'  => isset($validated['service_ids']) ? json_encode(array_values(array_unique($validated['service_ids']))) : null,
            'notes'        => $validated['notes'] ?? null,
            'updated_at'   => now(),
        ];

        $existing = DB::table('calendar_overrides')->where('date', $date)->first();
        if ($existing) {
            DB::table('calendar_overrides')->where('date', $date)->update($payload);
        } else {
            DB::table('calendar_overrides')->insert(array_merge($payload, ['created_at' => now()]));
        }

        $row = DB::table('calendar_overrides')->where('date', $date)->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    /**
     * DELETE /editor/calendar-overrides/{date}
     *
     * Clears the override — date falls back to the weekly schedule.
     * Idempotent: 200 even when nothing existed (no-op delete).
     */
    public function destroy(Request $request, string $date): JsonResponse
    {
        if (! self::isValidDate($date)) {
            return response()->json(['message' => 'Invalid date.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $deleted = DB::table('calendar_overrides')->where('date', $date)->delete();

        tenancy()->end();

        return response()->json([
            'date'    => $date,
            'cleared' => (bool) $deleted,
        ]);
    }

    private static function isValidDate(string $date): bool
    {
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            && checkdate(
                (int) substr($date, 5, 2),
                (int) substr($date, 8, 2),
                (int) substr($date, 0, 4),
            );
    }
}
