<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomersController extends Controller
{
    // GET /editor/customers
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $search = trim((string) $request->input('search', ''));
        $limit  = max(1, min(500, (int) $request->input('limit', 200)));

        $query = DB::table('clients')
            ->orderByDesc('last_booked_at')
            ->orderByDesc('updated_at');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name',  'like', $like)
                  ->orWhere('email', 'like', $like)
                  ->orWhere('phone', 'like', $like);
            });
        }

        $clients   = $query->limit($limit)->get();
        $clientIds = $clients->pluck('id')->filter()->values()->all();

        // One query for all appointment summaries across matched clients
        $apptGroups = collect();
        if (! empty($clientIds)) {
            $apptGroups = DB::table('appointments')
                ->whereIn('client_id', $clientIds)
                ->whereNotIn('status', ['cancelled'])
                ->select('client_id', 'appointment_date', 'start_time', 'service_name', 'status')
                ->orderBy('appointment_date')
                ->orderBy('start_time')
                ->get()
                ->groupBy('client_id');
        }

        $today = now()->toDateString();

        $result = $clients->map(function ($c) use ($apptGroups, $today) {
            $appts        = collect($apptGroups->get($c->id, collect()));
            $pastAppts    = $appts->filter(fn ($a) => $a->appointment_date <  $today)->values();
            $upcomingAppts = $appts->filter(fn ($a) => $a->appointment_date >= $today)->values();

            // pastAppts is sorted asc → last() is most recent past appointment
            $lastAppt = $pastAppts->last();
            // upcomingAppts is sorted asc → first() is the soonest upcoming
            $nextAppt = $upcomingAppts->first();

            return [
                'id'                         => (int) $c->id,
                'name'                       => $c->name,
                'email'                      => $c->email,
                'phone'                      => $c->phone,
                'notes'                      => $c->notes,
                'last_appointment_at'        => $c->last_booked_at,
                'appointment_count'          => $appts->count(),
                'upcoming_appointment_count' => $upcomingAppts->count(),
                'last_appointment'           => $lastAppt ? [
                    'date'         => $lastAppt->appointment_date,
                    'service_name' => $lastAppt->service_name,
                    'status'       => $lastAppt->status,
                ] : null,
                'next_appointment'           => $nextAppt ? [
                    'date'         => $nextAppt->appointment_date,
                    'start_time'   => substr($nextAppt->start_time, 0, 5),
                    'service_name' => $nextAppt->service_name,
                    'status'       => $nextAppt->status,
                ] : null,
                'created_at'                 => $c->created_at,
                'updated_at'                 => $c->updated_at,
            ];
        })->all();

        tenancy()->end();

        return response()->json($result);
    }
}
