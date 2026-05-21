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

        $clients = DB::table('clients')
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => [
                'id'                  => (int) $r->id,
                'name'                => $r->name,
                'email'               => $r->email,
                'phone'               => $r->phone,
                'notes'               => $r->notes,
                'last_appointment_at' => $r->last_booked_at,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
            ])
            ->all();

        tenancy()->end();

        return response()->json($clients);
    }
}
