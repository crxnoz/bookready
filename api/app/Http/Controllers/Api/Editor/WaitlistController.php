<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 7 · Editor waitlist surface.
 *
 *   GET   /editor/waitlist          — list pending + notified entries
 *   PATCH /editor/waitlist/{id}     — owner action (remove, mark contacted)
 *
 * Owner can't "claim on behalf of" via this endpoint — that's a security
 * surface we intentionally don't expose; spot-opened emails go directly
 * to the customer with a token. Owner can only manage their queue.
 *
 * Follows the canonical "flatten before tenancy()->end()" pattern.
 */
class WaitlistController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'              => (int)  $row->id,
            'customer_name'   =>         (string) $row->customer_name,
            'customer_email'  =>         (string) $row->customer_email,
            'customer_phone'  =>         $row->customer_phone,
            'service_id'      => (int)  $row->service_id,
            'service_name'    =>         $row->service_name ?? null,
            'staff_id'        =>         $row->staff_id !== null ? (int) $row->staff_id : null,
            'staff_name'      =>         $row->staff_name ?? null,
            'preferred_date'  =>         $row->preferred_date ? substr((string) $row->preferred_date, 0, 10) : null,
            'earliest_date'   =>         substr((string) $row->earliest_date, 0, 10),
            'latest_date'     =>         substr((string) $row->latest_date,   0, 10),
            'notes'           =>         $row->notes,
            'status'          =>         (string) $row->status,
            'notified_at'     =>         $row->notified_at,
            'notification_expires_at' => $row->notification_expires_at,
            'created_at'      =>         $row->created_at,
        ];
    }

    /**
     * GET /editor/waitlist
     *
     * Returns pending + notified entries (active queue). Claimed / expired
     * / removed entries fall off the list since the owner's view should
     * surface what still needs attention.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('waitlist_entries')) {
            tenancy()->end();
            return response()->json(['data' => []]);
        }

        $rows = DB::table('waitlist_entries as w')
            ->leftJoin('services as s', 's.id', '=', 'w.service_id')
            ->leftJoin('staff as st', 'st.id', '=', 'w.staff_id')
            ->whereIn('w.status', ['pending', 'notified'])
            ->orderBy('w.created_at', 'asc')
            ->select(
                'w.*',
                's.name as service_name',
                'st.name as staff_name',
            )
            ->get();

        $data = $rows->map(fn ($r) => $this->format($r))->all();

        tenancy()->end();

        return response()->json(['data' => $data]);
    }

    /**
     * PATCH /editor/waitlist/{id}
     *
     * Owner-side actions: mark removed. We keep it intentionally narrow —
     * nothing else makes sense for the owner to flip (status transitions
     * to "notified" and "claimed" only happen through the WaitlistService
     * + customer claim flow).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:removed',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $exists = DB::table('waitlist_entries')->where('id', $id)->exists();
        if (! $exists) {
            tenancy()->end();
            return response()->json(['message' => 'Waitlist entry not found.'], 404);
        }

        DB::table('waitlist_entries')->where('id', $id)->update([
            'status'     => $validated['status'],
            'updated_at' => now(),
        ]);

        tenancy()->end();

        return response()->json(['ok' => true]);
    }
}
