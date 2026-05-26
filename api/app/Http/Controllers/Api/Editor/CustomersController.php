<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 13 — Customers CRM.
 *
 * Listing returns each client enriched with auto-derived status,
 * payment rollups (total_spent, deposits_paid, balance_due, last
 * payment status), and appointment counts. show() also returns the
 * full appointment timeline. VIP is the only manual override and lives
 * in clients.is_vip; the other statuses (New/Returning/Regular/Inactive)
 * are computed from appointment history every request.
 */
class CustomersController extends Controller
{
    /** Number of days of inactivity before auto-flipping to "inactive". */
    private const INACTIVE_DAYS = 90;

    /** Minimum completed appointments to count as "regular". */
    private const REGULAR_MIN_COMPLETED = 4;

    // GET /editor/customers
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $search = trim((string) $request->input('search', ''));
        $limit  = max(1, min(500, (int) $request->input('limit', 200)));

        $hasVip = Schema::hasColumn('clients', 'is_vip');

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

        // One round-trip for every appointment that belongs to any client
        // in the page. We group client-side because the per-customer
        // aggregates need to walk the rows anyway (last payment status,
        // pending balance, etc — not all expressible as plain SUM()s).
        $apptsByClient = collect();
        $tagsByClient  = collect();
        if (! empty($clientIds)) {
            $apptsByClient = $this->loadClientAppointments($clientIds);
            // Phase 14 — one extra query for the tag pivot, mirrored shape.
            $tagsByClient  = $this->loadClientTags($clientIds);
        }

        $today  = now()->toDateString();
        $result = $clients->map(fn ($c) => $this->formatClient(
            $c,
            $apptsByClient->get($c->id, collect()),
            $tagsByClient->get($c->id, collect()),
            $today,
            $hasVip,
        ))->all();

        tenancy()->end();

        return response()->json($result);
    }

    // GET /editor/customers/{customer}
    public function show(Request $request, int $customer): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('clients')->find($customer);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $hasVip  = Schema::hasColumn('clients', 'is_vip');
        $appts   = $this->loadClientAppointments([$customer])->get($customer, collect());
        $tags    = $this->loadClientTags([$customer])->get($customer, collect());

        $base    = $this->formatClient($row, $appts, $tags, now()->toDateString(), $hasVip);
        // Detail view also returns the full timeline so the drawer can
        // render it without a second round-trip. Reverse-chrono so the
        // most recent appointment is on top.
        $base['appointments'] = $appts
            ->sortByDesc(fn ($a) => $a->appointment_date . ' ' . $a->start_time)
            ->values()
            ->map(fn ($a) => $this->formatAppointmentRow($a))
            ->all();

        tenancy()->end();

        return response()->json($base);
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
        $hasVip = Schema::hasColumn('clients', 'is_vip');
        $result = $this->formatClient($row, collect(), collect(), now()->toDateString(), $hasVip);

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
            // Phase 14 — structured preferences (all optional, all nullable).
            'preferred_service_id'     => 'sometimes|nullable|integer',
            'preferred_staff_id'       => 'sometimes|nullable|integer',
            'preferred_time_of_day'    => 'sometimes|nullable|in:morning,afternoon,evening',
            'preferred_contact_method' => 'sometimes|nullable|in:email,sms,phone',
            'birthday'                 => 'sometimes|nullable|date_format:Y-m-d',
            'preferences_notes'        => 'sometimes|nullable|string|max:5000',
            // Atomic tag pivot replace — presence of `tag_ids` clears and
            // re-inserts the customer's tag links. Omitting it leaves the
            // current set alone (so saving just the name doesn't wipe tags).
            'tag_ids'                  => 'sometimes|array',
            'tag_ids.*'                => 'integer',
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

        $update = [
            'name'       => $validated['name'],
            'email'      => $validated['email'] ?? null,
            'phone'      => $validated['phone'] ?? null,
            'notes'      => $validated['notes'] ?? null,
            'updated_at' => now(),
        ];
        // Only set preference columns when both the column exists AND the
        // request actually included the key — keeps PATCH partial-safe
        // and tenant-migration-safe.
        foreach ([
            'preferred_service_id',
            'preferred_staff_id',
            'preferred_time_of_day',
            'preferred_contact_method',
            'birthday',
            'preferences_notes',
        ] as $field) {
            if (array_key_exists($field, $validated) && Schema::hasColumn('clients', $field)) {
                $update[$field] = $validated[$field];
            }
        }
        DB::table('clients')->where('id', $customer)->update($update);

        // Replace tag links atomically when the key was supplied. Skipping
        // when the column is absent so older tenants don't 500 on a
        // request that quietly includes `tag_ids: []`.
        if (array_key_exists('tag_ids', $validated) && Schema::hasTable('client_tag_links')) {
            DB::table('client_tag_links')->where('client_id', $customer)->delete();
            $rows = array_values(array_unique($validated['tag_ids']));
            if (! empty($rows)) {
                DB::table('client_tag_links')->insert(array_map(fn ($tagId) => [
                    'client_id'  => $customer,
                    'tag_id'     => (int) $tagId,
                    'created_at' => now(),
                ], $rows));
            }
        }

        $updated = DB::table('clients')->find($customer);
        $hasVip  = Schema::hasColumn('clients', 'is_vip');
        $appts   = $this->loadClientAppointments([$customer])->get($customer, collect());
        $tags    = $this->loadClientTags([$customer])->get($customer, collect());
        $result  = $this->formatClient($updated, $appts, $tags, now()->toDateString(), $hasVip);

        tenancy()->end();

        return response()->json($result);
    }

    // POST /editor/customers/{customer}/toggle-vip
    // Body: { is_vip?: bool }  — when omitted, flips the current value.
    public function toggleVip(Request $request, int $customer): JsonResponse
    {
        $validated = $request->validate([
            'is_vip' => 'sometimes|boolean',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('clients', 'is_vip')) {
            tenancy()->end();
            return response()->json(['message' => 'VIP support not migrated yet.'], 503);
        }

        $row = DB::table('clients')->find($customer);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $next = array_key_exists('is_vip', $validated)
            ? (bool) $validated['is_vip']
            : ! (bool) ($row->is_vip ?? false);

        DB::table('clients')->where('id', $customer)->update([
            'is_vip'     => $next,
            'updated_at' => now(),
        ]);

        $updated = DB::table('clients')->find($customer);
        $appts   = $this->loadClientAppointments([$customer])->get($customer, collect());
        $tags    = $this->loadClientTags([$customer])->get($customer, collect());
        $result  = $this->formatClient($updated, $appts, $tags, now()->toDateString(), true);

        tenancy()->end();

        return response()->json($result);
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    /**
     * Pull every appointment (non-cancelled by default for stats, but
     * we keep cancelled in the timeline view) for the given client ids.
     * Returns a Collection<int, Collection<int, object>> keyed by client id.
     */
    private function loadClientAppointments(array $clientIds): Collection
    {
        if (empty($clientIds)) return collect();

        // Select everything we might need across index + show + format.
        // Cheaper than picking columns conditionally — these are flat,
        // and the row count per page is bounded by `limit`.
        $select = [
            'id', 'client_id', 'appointment_date', 'start_time', 'end_time',
            'service_name', 'service_price', 'status',
            'payment_status', 'deposit_paid_amount', 'balance_paid_amount',
            'amount_due', 'balance_paid_at', 'tip_amount', 'refunded_amount',
            'paid_at', 'created_at',
        ];
        // Some legacy tenants may not yet have every payment column.
        $select = array_values(array_filter($select, fn ($c) => Schema::hasColumn('appointments', $c)));

        return DB::table('appointments')
            ->whereIn('client_id', $clientIds)
            ->select($select)
            ->orderBy('appointment_date')
            ->orderBy('start_time')
            ->get()
            ->groupBy('client_id');
    }

    /**
     * Phase 14 — single round-trip to fetch the tag pivot for a page of
     * clients. Joins through to customer_tags so the formatter has
     * everything it needs (id, name, color) without a second lookup.
     * Returns Collection<int, Collection<int, object>> keyed by client_id.
     */
    private function loadClientTags(array $clientIds): Collection
    {
        if (empty($clientIds))                       return collect();
        if (! Schema::hasTable('client_tag_links'))  return collect();
        if (! Schema::hasTable('customer_tags'))     return collect();

        return DB::table('client_tag_links as l')
            ->join('customer_tags as t', 't.id', '=', 'l.tag_id')
            ->whereIn('l.client_id', $clientIds)
            ->select('l.client_id', 't.id', 't.name', 't.color', 't.sort_order')
            ->orderBy('t.sort_order')
            ->orderBy('t.name')
            ->get()
            ->groupBy('client_id');
    }

    /**
     * Reduce a client + their appointment rows into the API shape the
     * directory + drawer both consume. Status is auto-derived here so
     * the frontend never re-computes; VIP override is honored when
     * `clients.is_vip` is true.
     */
    private function formatClient(object $c, Collection $appts, Collection $tags, string $today, bool $hasVip): array
    {
        // Drop cancelled rows for the stats; keep them for the timeline
        // (the caller in show() re-builds the timeline from raw $appts).
        $countable = $appts->filter(fn ($a) => $a->status !== 'cancelled');

        $past     = $countable->filter(fn ($a) => $a->appointment_date <  $today)->values();
        $upcoming = $countable->filter(fn ($a) => $a->appointment_date >= $today)->values();
        $lastAppt = $past->last();
        $nextAppt = $upcoming->first();

        $completedCount = $countable->where('status', 'completed')->count();
        $lastCompleted  = $countable->where('status', 'completed')->last();

        // ── Payment rollups ──
        // Total spent =  every dollar the customer has actually paid, net of refunds.
        //              deposits + balances + tips, MINUS refunded_amount.
        $totalDeposits = (float) $countable->sum(fn ($a) => (float) ($a->deposit_paid_amount ?? 0));
        $totalBalances = (float) $countable->sum(fn ($a) => (float) ($a->balance_paid_amount ?? 0));
        $totalTips     = (float) $countable->sum(fn ($a) => (float) ($a->tip_amount         ?? 0));
        $totalRefunded = (float) $countable->sum(fn ($a) => (float) ($a->refunded_amount    ?? 0));
        $totalSpent    = max(0.0, $totalDeposits + $totalBalances + $totalTips - $totalRefunded);

        // Outstanding balance = future / today appointments still owing
        // their remainder. Skip rows whose balance has already cleared,
        // or that were cancelled / no-showed.
        $outstandingBalance = (float) $countable
            ->filter(fn ($a) => empty($a->balance_paid_at))
            ->filter(fn ($a) => ($a->payment_status ?? null) === 'deposit_paid')
            ->sum(fn ($a) => (float) ($a->amount_due ?? 0));

        // Most recent payment_status — useful as a quick health signal.
        // We take the latest appointment that ever had a payment_status.
        $lastPaymentStatus = optional(
            $countable->sortByDesc(fn ($a) => $a->appointment_date . ' ' . $a->start_time)
                      ->first(fn ($a) => ! empty($a->payment_status))
        )->payment_status;

        // ── Status ──
        $isVip  = $hasVip ? (bool) ($c->is_vip ?? false) : false;
        $status = $this->deriveStatus($isVip, $completedCount, $lastCompleted, $today);

        // Phase 14 — no-show risk. Two heuristics, OR'd:
        //   (a) 2+ no_show in the last 5 actually-attendable visits
        //   (b) >= 30% no_show ratio across at least 3 attendable visits
        // "Attendable" = anything that isn't cancelled (no_show + completed).
        $noShowRisk = $this->computeNoShowRisk($countable);

        // Phase 14 — tags → flat array of {id, name, color}.
        $tagsOut = $tags->map(fn ($t) => [
            'id'    => (int) $t->id,
            'name'  => $t->name,
            'color' => $t->color,
        ])->values()->all();

        // Phase 14 — preferences block. Always returned (with nulls) so
        // the frontend doesn't have to feature-detect each field.
        $preferences = [
            'preferred_service_id'     => isset($c->preferred_service_id)     ? (int) $c->preferred_service_id     : null,
            'preferred_staff_id'       => isset($c->preferred_staff_id)       ? (int) $c->preferred_staff_id       : null,
            'preferred_time_of_day'    => $c->preferred_time_of_day    ?? null,
            'preferred_contact_method' => $c->preferred_contact_method ?? null,
            'birthday'                 => $c->birthday                 ?? null,
            'preferences_notes'        => $c->preferences_notes        ?? null,
        ];

        return [
            'id'                         => (int) $c->id,
            'name'                       => $c->name,
            'email'                      => $c->email,
            'phone'                      => $c->phone,
            'notes'                      => $c->notes,
            'is_vip'                     => $isVip,
            'status'                     => $status,
            'no_show_risk'               => $noShowRisk,
            'tags'                       => $tagsOut,
            'preferences'                => $preferences,
            'last_appointment_at'        => $c->last_booked_at ?? null,
            'appointment_count'          => $countable->count(),
            'upcoming_appointment_count' => $upcoming->count(),
            'completed_count'            => $completedCount,
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
            'total_spent'                => round($totalSpent, 2),
            'deposits_paid'              => round($totalDeposits, 2),
            'outstanding_balance'        => round($outstandingBalance, 2),
            'last_payment_status'        => $lastPaymentStatus,
            'created_at'                 => $c->created_at,
            'updated_at'                 => $c->updated_at,
        ];
    }

    /**
     * Phase 13 status rules (matches the spec the owner approved).
     *  VIP     — manual override (clients.is_vip true)
     *  New     — 0 completed appointments, ever
     *  Inactive — at least 1 completed, last completed > 90 days ago
     *  Regular — 4+ completed AND last completed within 90 days
     *  Returning — 1–3 completed AND last completed within 90 days
     */
    private function deriveStatus(bool $isVip, int $completedCount, ?object $lastCompleted, string $today): string
    {
        if ($isVip)                   return 'vip';
        if ($completedCount === 0)    return 'new';

        $daysSinceLast = $lastCompleted
            ? \Carbon\Carbon::parse($lastCompleted->appointment_date)->diffInDays(\Carbon\Carbon::parse($today), false)
            : null;

        if ($daysSinceLast !== null && $daysSinceLast > self::INACTIVE_DAYS) return 'inactive';

        return $completedCount >= self::REGULAR_MIN_COMPLETED ? 'regular' : 'returning';
    }

    /**
     * Phase 14 — no-show risk flag.
     *
     * Two heuristics, OR'd:
     *   (a) 2+ no_show among the last 5 attendable visits
     *   (b) ≥30% no_show ratio across ≥3 attendable visits
     *
     * "Attendable" = completed or no_show. We DON'T filter by date here
     * — `no_show` is an explicit owner-set status, so its presence
     * already means the visit was missed regardless of stored date
     * (otherwise an owner who set a future row to no_show during data
     * cleanup or testing would never trip the flag).
     */
    private function computeNoShowRisk(Collection $appts): bool
    {
        $past = $appts
            ->filter(fn ($a) => in_array($a->status, ['completed', 'no_show'], true))
            ->sortByDesc(fn ($a) => $a->appointment_date . ' ' . $a->start_time)
            ->values();

        if ($past->count() < 2) return false;

        $last5      = $past->take(5);
        $recentMiss = $last5->where('status', 'no_show')->count();
        if ($recentMiss >= 2) return true;

        if ($past->count() >= 3) {
            $missRate = $past->where('status', 'no_show')->count() / $past->count();
            if ($missRate >= 0.30) return true;
        }

        return false;
    }

    /**
     * Per-appointment shape used by show()'s timeline. Trimmed down
     * from the full appointments controller output — we only need
     * enough for the drawer to render date / service / status /
     * payment chip.
     */
    private function formatAppointmentRow(object $a): array
    {
        return [
            'id'               => (int) $a->id,
            'appointment_date' => $a->appointment_date,
            'start_time'       => substr((string) $a->start_time, 0, 5),
            'end_time'         => substr((string) ($a->end_time ?? ''), 0, 5) ?: null,
            'service_name'     => $a->service_name,
            'service_price'    => isset($a->service_price) ? (float) $a->service_price : null,
            'status'           => $a->status,
            'payment_status'   => $a->payment_status ?? null,
            'deposit_paid_amount' => isset($a->deposit_paid_amount) ? (float) $a->deposit_paid_amount : null,
            'balance_paid_amount' => isset($a->balance_paid_amount) ? (float) $a->balance_paid_amount : null,
            'amount_due'       => isset($a->amount_due) ? (float) $a->amount_due : null,
            'tip_amount'       => isset($a->tip_amount) ? (float) $a->tip_amount : null,
            'refunded_amount'  => isset($a->refunded_amount) ? (float) $a->refunded_amount : null,
        ];
    }
}
