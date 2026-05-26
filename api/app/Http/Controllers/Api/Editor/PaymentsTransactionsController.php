<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 15 — Transactions ledger.
 *
 * Backs the /editor/payments → Transactions tab. We treat every
 * appointment with any payment activity as a transaction row.
 * No separate `transactions` table — the appointments row already
 * carries every field we need (paid_at, amount paid, refund, dispute,
 * receipt_number).
 */
class PaymentsTransactionsController extends Controller
{
    /** Statuses that count as "had a payment" for the ledger. */
    private const PAYMENT_STATUSES = [
        'deposit_paid', 'paid', 'partially_refunded', 'refunded', 'failed',
    ];

    // GET /editor/payments/transactions
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $search = trim((string) $request->input('search', ''));
        $filter = (string) $request->input('filter', 'all');
        $limit  = max(1, min(200, (int) $request->input('limit', 50)));

        $query = DB::table('appointments')
            ->whereIn('payment_status', self::PAYMENT_STATUSES);

        // Filter chips — narrow the ledger to a slice. 'disputed' uses
        // dispute_status presence rather than payment_status because a
        // dispute can be opened on a still-'paid' row.
        switch ($filter) {
            case 'deposits':
                $query->where('payment_status', 'deposit_paid');
                break;
            case 'paid':
                $query->where('payment_status', 'paid');
                break;
            case 'refunded':
                $query->whereIn('payment_status', ['refunded', 'partially_refunded']);
                break;
            case 'disputed':
                if (Schema::hasColumn('appointments', 'dispute_status')) {
                    $query->whereNotNull('dispute_status');
                }
                break;
            case 'failed':
                $query->where('payment_status', 'failed');
                break;
            // 'all' — no extra clause
        }

        // Search across receipt #, customer, service. LIKE-based — fast
        // enough at the scales we expect per tenant.
        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('customer_name',  'like', $like)
                  ->orWhere('customer_email', 'like', $like)
                  ->orWhere('service_name',   'like', $like);
                if (Schema::hasColumn('appointments', 'receipt_number')) {
                    $q->orWhere('receipt_number', 'like', $like);
                }
            });
        }

        // Most recent payment first. Falls back to created_at when
        // paid_at is unset (e.g. failed rows).
        $rows = $query
            ->orderByDesc(DB::raw('COALESCE(paid_at, created_at)'))
            ->limit($limit)
            ->get();

        $result = $rows->map(fn ($r) => $this->format($r))->all();

        tenancy()->end();

        return response()->json([
            'transactions' => $result,
            'count'        => count($result),
        ]);
    }

    private function format(object $r): array
    {
        $paid = (float) ($r->deposit_paid_amount ?? 0) + (float) ($r->balance_paid_amount ?? 0);

        return [
            'appointment_id'   => (int) $r->id,
            'receipt_number'   => $r->receipt_number      ?? null,
            'customer_name'    => $r->customer_name,
            'customer_email'   => $r->customer_email,
            'customer_id'      => isset($r->client_id) ? (int) $r->client_id : null,
            'service_name'     => $r->service_name,
            'appointment_date' => $r->appointment_date,
            'start_time'       => substr((string) $r->start_time, 0, 5),
            'payment_status'   => $r->payment_status,
            'paid_amount'      => round($paid, 2),
            'tip_amount'       => isset($r->tip_amount) ? (float) $r->tip_amount : null,
            'refunded_amount'  => isset($r->refunded_amount) ? (float) $r->refunded_amount : null,
            'amount_due'       => isset($r->amount_due) ? (float) $r->amount_due : null,
            'currency'         => $r->currency ?? 'USD',
            'paid_at'          => $r->paid_at ?? null,
            'payment_method'   => $r->payment_method ?? null,
            'dispute_status'   => $r->dispute_status ?? null,
            'is_stripe'        => ! empty($r->stripe_payment_intent_id),
        ];
    }
}
