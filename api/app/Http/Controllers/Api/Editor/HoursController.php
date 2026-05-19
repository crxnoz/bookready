<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HoursController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('hours')->orderBy('day_of_week')->get());
    }

    /**
     * Accept the full 7-day schedule and upsert in one go.
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'hours'                  => ['required', 'array', 'size:7'],
            'hours.*.day_of_week'    => ['required', 'integer', 'between:0,6'],
            'hours.*.is_closed'      => ['required', 'boolean'],
            'hours.*.open_time'      => ['required_if:hours.*.is_closed,false', 'nullable', 'date_format:H:i'],
            'hours.*.close_time'     => ['required_if:hours.*.is_closed,false', 'nullable', 'date_format:H:i'],
        ]);

        foreach ($request->hours as $row) {
            DB::table('hours')->updateOrInsert(
                ['day_of_week' => $row['day_of_week']],
                [
                    'is_closed'  => $row['is_closed'],
                    'open_time'  => $row['is_closed'] ? null : ($row['open_time'] . ':00'),
                    'close_time' => $row['is_closed'] ? null : ($row['close_time'] . ':00'),
                    'updated_at' => now(),
                ]
            );
        }

        Cache::forget('template:' . tenancy()->tenant->id);

        return response()->json(DB::table('hours')->orderBy('day_of_week')->get());
    }
}
