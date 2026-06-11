<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-staff working hours.
 *
 * Mirrors HoursController's shape but keyed by staff_id. The staff_hours
 * table uses positive is_open (not is_closed), so the format layer here
 * is slightly different from the business hours layer.
 *
 * Index seeds the 7 days lazily on first read so an existing staff row
 * created before Phase 2 still gets a usable schedule.
 */
class StaffHoursController extends Controller
{
    private const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    private function format(object $row): array
    {
        return [
            'id'          => (int) $row->id,
            'day_of_week' => (int) $row->day_of_week,
            'day_name'    => self::DAYS[(int) $row->day_of_week],
            'is_open'     => (bool) $row->is_open,
            'open_time'   => $this->fmt($row->open_time),
            'close_time'  => $this->fmt($row->close_time),
            'break_start' => $this->fmt($row->break_start ?? null),
            'break_end'   => $this->fmt($row->break_end   ?? null),
        ];
    }

    private function fmt(?string $t): ?string
    {
        return $t ? substr($t, 0, 5) : null;
    }

    /**
     * Wave D — when the caller is a logged-in staff member, force the
     * {staff} route param to equal their own staff_id (resolved from the
     * central users row). Returns a 404 response when a staff user targets
     * any other staff row (or has a null staff_id); null when allowed
     * (owner, or staff targeting self). Call BEFORE tenancy init.
     */
    private function selfMatchGuard(Request $request, int $staff): ?JsonResponse
    {
        $user = $request->user();
        if (($user->role ?? null) !== 'staff') return null; // owner — no scope
        $ownStaffId = $user->staff_id !== null ? (int) $user->staff_id : null;
        if ($ownStaffId === null || $ownStaffId !== $staff) {
            return response()->json(['message' => 'Staff member not found'], 404);
        }
        return null;
    }

    public function index(Request $request, int $staff): JsonResponse
    {
        if ($guard = $this->selfMatchGuard($request, $staff)) return $guard;

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('staff_hours')) {
            tenancy()->end();
            return response()->json([], 200);
        }

        $exists = DB::table('staff')->where('id', $staff)->exists();
        if (! $exists) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        // Lazy-seed all 7 rows so the editor can always render a full week.
        $existing = DB::table('staff_hours')
            ->where('staff_id', $staff)
            ->pluck('day_of_week')
            ->toArray();
        foreach (range(0, 6) as $day) {
            if (in_array($day, $existing, true)) continue;
            // Default everyone closed on Sun (0) / Sat (6), open 9-5 the rest
            // — same shape the business hours editor seeds. Owners can flip
            // the toggles in the staff editor.
            $closed = in_array($day, [0, 6]);
            DB::table('staff_hours')->insert([
                'staff_id'    => $staff,
                'day_of_week' => $day,
                'is_open'     => ! $closed,
                'open_time'   => $closed ? null : '09:00:00',
                'close_time'  => $closed ? null : '17:00:00',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        $hours = DB::table('staff_hours')
            ->where('staff_id', $staff)
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($hours);
    }

    public function update(Request $request, int $staff): JsonResponse
    {
        $request->validate([
            'hours'               => 'required|array|size:7',
            'hours.*.day_of_week' => 'required|integer|between:0,6',
            'hours.*.is_open'     => 'required|boolean',
            'hours.*.open_time'   => 'nullable|date_format:H:i',
            'hours.*.close_time'  => 'nullable|date_format:H:i',
            'hours.*.break_start' => 'nullable|date_format:H:i',
            'hours.*.break_end'   => 'nullable|date_format:H:i',
        ]);

        if ($guard = $this->selfMatchGuard($request, $staff)) return $guard;

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('staff_hours')) {
            tenancy()->end();
            return response()->json(['message' => 'Staff hours not supported yet.'], 409);
        }

        $exists = DB::table('staff')->where('id', $staff)->exists();
        if (! $exists) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        foreach ($request->hours as $day) {
            // upsert by (staff_id, day_of_week) so the editor doesn't have
            // to pre-create rows.
            DB::table('staff_hours')->updateOrInsert(
                [
                    'staff_id'    => $staff,
                    'day_of_week' => $day['day_of_week'],
                ],
                [
                    'is_open'     => (bool) $day['is_open'],
                    'open_time'   => $day['open_time']   ?? null,
                    'close_time'  => $day['close_time']  ?? null,
                    'break_start' => $day['break_start'] ?? null,
                    'break_end'   => $day['break_end']   ?? null,
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ],
            );
        }

        $hours = DB::table('staff_hours')
            ->where('staff_id', $staff)
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($hours);
    }
}
