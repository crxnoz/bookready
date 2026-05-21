<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HoursController extends Controller
{
    private const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    private function format(object $row): array
    {
        return [
            'id'          => (int)   $row->id,
            'day_of_week' => (int)   $row->day_of_week,
            'day_name'    =>          self::DAYS[(int) $row->day_of_week],
            'is_open'     => ! (bool) $row->is_closed,
            'open_time'   =>          $this->fmt($row->open_time),
            'close_time'  =>          $this->fmt($row->close_time),
            'break_start' =>          $this->fmt($row->break_start ?? null),
            'break_end'   =>          $this->fmt($row->break_end ?? null),
        ];
    }

    // Strip seconds so HTML time inputs receive HH:MM
    private function fmt(?string $t): ?string
    {
        return $t ? substr($t, 0, 5) : null;
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Ensure all 7 rows exist (seeder covers new tenants, this is a safety net)
        $existing = DB::table('hours')->pluck('day_of_week')->toArray();
        foreach (range(0, 6) as $day) {
            if (! in_array($day, $existing, true)) {
                $closed = in_array($day, [0, 6]);
                DB::table('hours')->insert([
                    'day_of_week' => $day,
                    'is_closed'   => $closed,
                    'open_time'   => $closed ? null : '09:00:00',
                    'close_time'  => $closed ? null : '18:00:00',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }

        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($hours);
    }

    public function update(Request $request): JsonResponse
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

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        foreach ($request->hours as $day) {
            DB::table('hours')
                ->where('day_of_week', $day['day_of_week'])
                ->update([
                    'is_closed'   => ! $day['is_open'],
                    'open_time'   => $day['open_time']   ?? null,
                    'close_time'  => $day['close_time']  ?? null,
                    'break_start' => $day['break_start'] ?? null,
                    'break_end'   => $day['break_end']   ?? null,
                    'updated_at'  => now(),
                ]);
        }

        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($hours);
    }
}
