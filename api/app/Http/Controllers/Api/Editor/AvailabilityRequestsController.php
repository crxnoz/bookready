<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AvailabilityRequestService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 5 · Editor availability-requests inbox.
 *
 *   GET    /editor/availability-requests          — pending + recent
 *   POST   /editor/availability-requests/{id}/approve   {time}
 *   POST   /editor/availability-requests/{id}/suggest   {date,time,note?}
 *   POST   /editor/availability-requests/{id}/decline   {note?}
 *
 * Approve creates a confirmed appointment immediately (no payment — pay
 * after, via existing deposit tools). Suggest sends the customer a
 * token link to accept the alternative. Follows the canonical "flatten
 * before tenancy()->end()" pattern.
 */
class AvailabilityRequestsController extends Controller
{
    private function format(object $r): array
    {
        return [
            'id'             => (int) $r->id,
            'kind'           => (string) ($r->kind ?? 'standard'),
            'fee'            => round((int) ($r->fee_cents ?? 0) / 100, 2),
            'customer_name'  => (string) $r->customer_name,
            'customer_email' => (string) $r->customer_email,
            'customer_phone' => $r->customer_phone,
            'service_id'     => (int) $r->service_id,
            'service_name'   => $r->service_name ?? null,
            'staff_id'       => $r->staff_id !== null ? (int) $r->staff_id : null,
            'staff_name'     => $r->staff_name ?? null,
            'preferred_date' => substr((string) $r->preferred_date, 0, 10),
            'preferred_time' => $r->preferred_time ? substr((string) $r->preferred_time, 0, 5) : null,
            'notes'          => $r->notes,
            'status'         => (string) $r->status,
            'owner_note'     => $r->owner_note,
            'suggested_date' => $r->suggested_date ? substr((string) $r->suggested_date, 0, 10) : null,
            'suggested_time' => $r->suggested_time ? substr((string) $r->suggested_time, 0, 5) : null,
            'created_at'     => $r->created_at,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        // §6 — same inbox serves both kinds; the UI asks for one at a time.
        $kind = $request->query('kind') === 'squeeze_in' ? 'squeeze_in' : 'standard';

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('availability_requests')) {
            tenancy()->end();
            return response()->json(['data' => []]);
        }

        $hasKind = Schema::hasColumn('availability_requests', 'kind');

        $rows = DB::table('availability_requests as ar')
            ->leftJoin('services as s', 's.id', '=', 'ar.service_id')
            ->leftJoin('staff as st', 'st.id', '=', 'ar.staff_id')
            ->when($hasKind, fn ($q) => $q->where('ar.kind', $kind))
            // Pending first, then recently-decided for context.
            ->orderByRaw("CASE WHEN ar.status = 'pending' THEN 0 WHEN ar.status = 'suggested' THEN 1 ELSE 2 END")
            ->orderBy('ar.preferred_date')
            ->select('ar.*', 's.name as service_name', 'st.name as staff_name')
            ->limit(100)
            ->get();

        $data = $rows->map(fn ($r) => $this->format($r))->all();

        tenancy()->end();

        return response()->json(['data' => $data]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'time' => 'required|date_format:H:i',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        $businessName = $this->businessNameFor($tenant);
        $slug = (string) $tenant->id;

        tenancy()->initialize($tenant);

        $req = DB::table('availability_requests')->where('id', $id)->first();
        if (! $req) {
            tenancy()->end();
            return response()->json(['message' => 'Request not found.'], 404);
        }
        if (! in_array($req->status, ['pending', 'suggested'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This request has already been decided.'], 409);
        }

        $settings    = DB::table('booking_settings')->first();
        $autoConfirm = (bool) ($settings->auto_confirm_bookings ?? false);
        $date        = substr((string) $req->preferred_date, 0, 10);

        // §6 — squeeze-ins carry a premium fee folded into amount_due.
        $isSqueezeIn = ($req->kind ?? 'standard') === 'squeeze_in';
        $surcharge   = $isSqueezeIn ? (int) ($req->fee_cents ?? 0) : 0;

        $apptId = AvailabilityRequestService::createAppointment(
            $req, $date, $validated['time'], $autoConfirm,
            $surcharge, $isSqueezeIn ? 'squeeze_in' : null,
        );

        DB::table('availability_requests')->where('id', $id)->update([
            'status'         => 'approved',
            'appointment_id' => $apptId,
            'updated_at'     => Carbon::now(),
        ]);

        // Re-read for the email (preferred_time may differ from confirmed time).
        $fresh = DB::table('availability_requests')->find($id);
        AvailabilityRequestService::notifyCustomer(
            $fresh, 'approved', $businessName, $slug,
            'https://app.bkrdy.me/account',
        );

        tenancy()->end();

        return response()->json(['ok' => true, 'appointment_id' => $apptId]);
    }

    public function suggest(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'note' => 'nullable|string|max:1000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        $businessName = $this->businessNameFor($tenant);
        $slug = (string) $tenant->id;
        // Public site slug for the accept link — first domain label.
        $publicSlug = $this->publicSlugFor($tenant);

        tenancy()->initialize($tenant);

        $req = DB::table('availability_requests')->where('id', $id)->first();
        if (! $req) {
            tenancy()->end();
            return response()->json(['message' => 'Request not found.'], 404);
        }
        if (! in_array($req->status, ['pending', 'suggested'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This request has already been decided.'], 409);
        }

        DB::table('availability_requests')->where('id', $id)->update([
            'status'         => 'suggested',
            'suggested_date' => $validated['date'],
            'suggested_time' => $validated['time'],
            'owner_note'     => $validated['note'] ?? null,
            'updated_at'     => Carbon::now(),
        ]);

        $fresh = DB::table('availability_requests')->find($id);
        $actionUrl = "https://{$publicSlug}.bkrdy.me/request/{$fresh->action_token}";
        AvailabilityRequestService::notifyCustomer($fresh, 'suggested', $businessName, $slug, $actionUrl);

        tenancy()->end();

        return response()->json(['ok' => true]);
    }

    public function decline(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'note' => 'nullable|string|max:1000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        $businessName = $this->businessNameFor($tenant);
        $slug = (string) $tenant->id;

        tenancy()->initialize($tenant);

        $req = DB::table('availability_requests')->where('id', $id)->first();
        if (! $req) {
            tenancy()->end();
            return response()->json(['message' => 'Request not found.'], 404);
        }
        if (! in_array($req->status, ['pending', 'suggested'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This request has already been decided.'], 409);
        }

        DB::table('availability_requests')->where('id', $id)->update([
            'status'     => 'declined',
            'owner_note' => $validated['note'] ?? null,
            'updated_at' => Carbon::now(),
        ]);

        $fresh = DB::table('availability_requests')->find($id);
        AvailabilityRequestService::notifyCustomer($fresh, 'declined', $businessName, $slug);

        tenancy()->end();

        return response()->json(['ok' => true]);
    }

    /** Tenant display name (central) — overridden by tenant profile in-scope where needed. */
    private function businessNameFor(Tenant $tenant): string
    {
        return $tenant->name ?? 'Our team';
    }

    /** The public subdomain label for building customer-facing URLs. */
    private function publicSlugFor(Tenant $tenant): string
    {
        $domain = \App\Models\Domain::where('tenant_id', $tenant->id)->first();
        if ($domain && str_ends_with($domain->domain, '.bkrdy.me')) {
            return substr($domain->domain, 0, -strlen('.bkrdy.me'));
        }
        return (string) $tenant->id;
    }
}
