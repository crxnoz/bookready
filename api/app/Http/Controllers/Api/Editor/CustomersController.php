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

        $today  = now()->toDateString();
        $result = $clients->map(function ($c) use ($apptGroups, $today) {
            $appts = collect($apptGroups->get($c->id, collect()));
            return $this->formatClient($c, $appts, $today);
        })->all();

        tenancy()->end();

        return response()->json($result);
    }

    // POST /editor/customers
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:5000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! empty($validated['email'])) {
            $existing = DB::table('clients')->where('email', $validated['email'])->first();
            if ($existing) {
                tenancy()->end();
                return response()->json(['message' => 'A customer with this email already exists.'], 422);
            }
        }

        $id = DB::table('clients')->insertGetId([
            'name'       => $validated['name'],
            'email'      => $validated['email'] ?? null,
            'phone'      => $validated['phone'] ?? null,
            'notes'      => $validated['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row    = DB::table('clients')->find($id);
        $result = $this->formatClient($row, collect(), now()->toDateString());

        tenancy()->end();

        return response()->json($result, 201);
    }

    // PATCH /editor/customers/{customer}
    public function update(Request $request, int $customer): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:5000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('clients')->find($customer);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        if (! empty($validated['email'])) {
            $duplicate = DB::table('clients')
                ->where('email', $validated['email'])
                ->where('id', '!=', $customer)
                ->first();
            if ($duplicate) {
                tenancy()->end();
                return response()->json(['message' => 'A customer with this email already exists.'], 422);
            }
        }

        DB::table('clients')->where('id', $customer)->update([
            'name'       => $validated['name'],
            'email'      => $validated['email'] ?? null,
            'phone'      => $validated['phone'] ?? null,
            'notes'      => $validated['notes'] ?? null,
            'updated_at' => now(),
        ]);

        $updated = DB::table('clients')->find($customer);

        $appts = DB::table('appointments')
            ->where('client_id', $customer)
            ->whereNotIn('status', ['cancelled'])
            ->select('client_id', 'appointment_date', 'start_time', 'service_name', 'status')
            ->orderBy('appointment_date')
            ->orderBy('start_time')
            ->get();

        $result = $this->formatClient($updated, $appts, now()->toDateString());

        tenancy()->end();

        return response()->json($result);
    }

    // ── Shared formatter ──────────────────────────────────────────────────────

    private function formatClient(object $c, \Illuminate\Support\Collection $appts, string $today): array
    {
        $pastAppts     = $appts->filter(fn ($a) => $a->appointment_date <  $today)->values();
        $upcomingAppts = $appts->filter(fn ($a) => $a->appointment_date >= $today)->values();
        $lastAppt      = $pastAppts->last();
        $nextAppt      = $upcomingAppts->first();

        return [
            'id'                         => (int) $c->id,
            'name'                       => $c->name,
            'email'                      => $c->email,
            'phone'                      => $c->phone,
            'notes'                      => $c->notes,
            'last_appointment_at'        => $c->last_booked_at ?? null,
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
    }
}
