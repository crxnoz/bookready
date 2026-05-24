<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Exceptions\StripeConnectNotReadyException;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\SlotGenerator;
use App\Services\StripeConnectService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PublicBookingController extends Controller
{
    /**
     * POST /api/v1/public/sites/{slug}/appointments
     * No auth required. Creates a pending appointment in the tenant DB.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        $slug = strtolower($slug);

        if (! preg_match('/^[a-z0-9]+$/', $slug)) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $tenant = Tenant::find($slug);
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $validated = $request->validate([
            'service_id'       => 'required|integer',
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time'       => 'required|date_format:H:i',
            'customer_name'    => 'required|string|max:255',
            'customer_email'   => 'nullable|email|max:255',
            'customer_phone'   => 'nullable|string|max:50',
            'notes'            => 'nullable|string|max:5000',
        ]);

        $serviceId = (int)    $validated['service_id'];
        $date      =          $validated['appointment_date'];
        $startTime = substr($validated['start_time'], 0, 5);

        // Fetch owner email from central DB before switching tenant connection.
        $ownerEmail = $tenant->owner?->email;

        tenancy()->initialize($tenant);

        // ── Load data ────────────────────────────────────────────────────
        $service = DB::table('services')
            ->where('id', $serviceId)
            ->where('is_active', true)
            ->first();

        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable'], 422);
        }

        $dayOfWeek    = (int) Carbon::parse($date)->dayOfWeek;
        $hoursRow     = DB::table('hours')->where('day_of_week', $dayOfWeek)->first();
        $settings     = DB::table('booking_settings')->first();

        // ── Global booking gate ──────────────────────────────────────────
        if ($settings && property_exists($settings, 'booking_enabled') && ! $settings->booking_enabled) {
            tenancy()->end();
            return response()->json(['message' => 'Booking is currently unavailable.'], 422);
        }

        // ── max_days_ahead guard (slot generator also enforces, but
        //    fail fast here so we never insert past the window) ──
        $maxDaysAhead = $settings ? (int) ($settings->max_days_ahead ?? 30) : 30;
        $today        = Carbon::now(config('app.timezone'))->format('Y-m-d');
        $maxDate      = Carbon::parse($today)->addDays($maxDaysAhead)->format('Y-m-d');
        if ($date > $maxDate) {
            tenancy()->end();
            return response()->json([
                'message' => "Bookings are only available up to {$maxDaysAhead} days in advance.",
            ], 422);
        }

        $appointments = DB::table('appointments')
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($r) => [
                'start_time' => substr($r->start_time, 0, 5),
                'end_time'   => substr($r->end_time,   0, 5),
            ])
            ->all();

        // ── Re-verify slot is still available (anti-double-booking) ──────
        $result = SlotGenerator::generate(
            date:         $date,
            service:      $service,
            hoursRow:     $hoursRow,
            settings:     $settings,
            appointments: $appointments,
            appTimezone:  config('app.timezone'),
        );

        if (! SlotGenerator::containsSlot($result['slots'], $startTime)) {
            tenancy()->end();
            return response()->json(['message' => 'This time is no longer available.'], 422);
        }

        // ── Calculate end time ───────────────────────────────────────────
        $duration = (int) $service->duration;
        $endTime  = Carbon::createFromFormat('H:i', $startTime)
            ->addMinutes($duration)
            ->format('H:i');

        // ── Duplicate-booking guard ──────────────────────────────────────
        // When enabled, the same client (matched by email OR phone) cannot
        // book the same service at the same date+start time more than once.
        $preventDup = (bool) ($settings->prevent_duplicate_client_bookings ?? false);
        if ($preventDup) {
            $email = $validated['customer_email'] ?? null;
            $phone = $validated['customer_phone'] ?? null;
            if ($email || $phone) {
                $exists = DB::table('appointments')
                    ->where('service_id', $serviceId)
                    ->where('appointment_date', $date)
                    ->where('start_time', $startTime . ':00')
                    ->whereNotIn('status', ['cancelled'])
                    ->where(function ($q) use ($email, $phone) {
                        if ($email) $q->orWhere('customer_email', $email);
                        if ($phone) $q->orWhere('customer_phone', $phone);
                    })
                    ->exists();
                if ($exists) {
                    tenancy()->end();
                    return response()->json([
                        'message' => 'You already have a booking for this service at this time.',
                    ], 422);
                }
            }
        }

        // ── Find or create client ────────────────────────────────────────
        $clientId = $this->findOrCreateClient(
            $validated['customer_name'],
            $validated['customer_email'] ?? null,
            $validated['customer_phone'] ?? null,
        );

        // ── Payment branching ────────────────────────────────────────────
        // Defaults: payments off, no deposit, no special status.
        $payment = $this->loadPaymentSettings();
        $servicePrice = $service->price !== null ? (float) $service->price : null;
        $deposit = AppointmentPaymentService::calculateDeposit($payment, $servicePrice);
        $paymentRequired = $deposit !== null;

        // Columns we set only when the migration has run (graceful fallback).
        $appointmentsHasPaymentCols = Schema::hasColumn('appointments', 'payment_status');

        // Pre-check: if the booking would need a deposit, the tenant's
        // Stripe Connect account must be ready BEFORE we insert anything.
        // Otherwise we'd leave a pending_payment row that can never be
        // collected on.
        if ($paymentRequired && ! StripeConnectService::isReady($payment)) {
            tenancy()->end();
            return response()->json([
                'message' => 'This business is not ready to accept online payments yet.',
            ], 422);
        }

        // auto_confirm_bookings only applies when no deposit is required.
        // When a deposit IS required, status stays 'pending' until the
        // webhook fires; the post-webhook auto-confirm path is handled
        // in AppointmentPaymentWebhookController.
        $autoConfirm    = (bool) ($settings->auto_confirm_bookings ?? false);
        $initialStatus  = (! $paymentRequired && $autoConfirm) ? 'confirmed' : 'pending';

        $insertData = [
            'client_id'                => $clientId,
            'service_id'               => (int) $service->id,
            'customer_name'            => $validated['customer_name'],
            'customer_email'           => $validated['customer_email'] ?? null,
            'customer_phone'           => $validated['customer_phone'] ?? null,
            'service_name'             => $service->name,
            'service_price'            => $service->price,
            'service_duration_minutes' => $duration,
            'appointment_date'         => $date,
            'start_time'               => $startTime,
            'end_time'                 => $endTime,
            'status'                   => $initialStatus,
            'notes'                    => $validated['notes'] ?? null,
            'internal_notes'           => null,
            'created_at'               => now(),
            'updated_at'               => now(),
        ];

        if ($appointmentsHasPaymentCols) {
            if ($paymentRequired) {
                $insertData['payment_status']     = 'pending_payment';
                $insertData['deposit_required']   = true;
                $insertData['deposit_amount']     = $deposit;
                $insertData['deposit_paid_amount'] = 0;
                $insertData['amount_due'] = $servicePrice !== null
                    ? max(0, round($servicePrice - $deposit, 2))
                    : null;
                $insertData['currency'] = $payment['currency'] ?? 'USD';
            } else {
                $insertData['payment_status']   = 'none';
                $insertData['deposit_required'] = false;
                $insertData['currency']         = $payment['currency'] ?? 'USD';
            }
        }

        $id  = DB::table('appointments')->insertGetId($insertData);
        $row = DB::table('appointments')->find($id);

        // Build a plain-array snapshot for use after tenancy ends.
        $appt = [
            'id'               => (int) $row->id,
            'customer_name'    => $row->customer_name,
            'customer_email'   => $row->customer_email,
            'customer_phone'   => $row->customer_phone,
            'service_name'     => $row->service_name,
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time,   0, 5),
            'status'           => $row->status,
            'notes'            => $row->notes,
        ];

        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $notify       = NotificationSettingsService::load();

        // ── Payment-required path: create Stripe Checkout session ────────
        $checkoutUrl = null;
        if ($paymentRequired && $appointmentsHasPaymentCols) {
            try {
                $session = AppointmentPaymentService::createDepositCheckoutSession([
                    'tenant_id'                 => (string) $tenant->id,
                    'tenant_slug'               => (string) $tenant->id,
                    'appointment_id'            => (int)    $appt['id'],
                    'service_name'              => (string) $appt['service_name'],
                    'deposit_amount'            => (float)  $deposit,
                    'currency'                  => $payment['currency'] ?? 'USD',
                    'customer_email'            => $appt['customer_email'],
                    'stripe_connect_account_id' => $payment['stripe_connect_account_id'] ?? null,
                    'stripe_connect_ready'      => StripeConnectService::isReady($payment),
                    'success_url'    => sprintf(
                        'https://%s.bkrdy.me/?booking=success&appointment=%d&session_id={CHECKOUT_SESSION_ID}',
                        $tenant->id, $appt['id'],
                    ),
                    'cancel_url'     => sprintf(
                        'https://%s.bkrdy.me/?booking=cancelled&appointment=%d',
                        $tenant->id, $appt['id'],
                    ),
                ]);

                DB::table('appointments')->where('id', $id)->update([
                    'stripe_checkout_session_id' => $session['id'],
                    'updated_at'                 => now(),
                ]);

                $checkoutUrl = $session['url'];
            } catch (StripeConnectNotReadyException $e) {
                // Connect went away between our precheck and the create call.
                DB::table('appointments')->where('id', $id)->delete();
                tenancy()->end();
                return response()->json(['message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                Log::error('Stripe checkout session creation failed', [
                    'tenant'   => $tenant->id,
                    'appointment_id' => $appt['id'],
                    'error'    => $e->getMessage(),
                ]);
                // Roll back: mark appointment failed and let the caller see an error.
                DB::table('appointments')->where('id', $id)->update([
                    'payment_status' => 'failed',
                    'updated_at'     => now(),
                ]);
                tenancy()->end();
                return response()->json([
                    'message' => 'Could not start payment. Please try again in a moment.',
                ], 502);
            }
        }

        tenancy()->end();

        // ── Email behavior ───────────────────────────────────────────────
        // When payment is required, hold off on the booking-request emails
        // until the webhook confirms the deposit. When payment is not
        // required, behavior is byte-identical to the previous flow.
        if (! $paymentRequired) {
            AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail, $notify);
        }

        $response = [
            'message'     => $paymentRequired ? 'Deposit required to confirm booking' : 'Booking request received',
            'appointment' => [
                'id'               => $appt['id'],
                'service_name'     => $appt['service_name'],
                'appointment_date' => $appt['appointment_date'],
                'start_time'       => $appt['start_time'],
                'end_time'         => $appt['end_time'],
                'status'           => $appt['status'],
                'customer_name'    => $appt['customer_name'],
            ],
        ];

        if ($paymentRequired) {
            $response['payment_required'] = true;
            $response['deposit_amount']   = (float) $deposit;
            $response['currency']         = $payment['currency'] ?? 'USD';
            $response['checkout_url']     = $checkoutUrl;
        }

        return response()->json($response, 201);
    }

    /**
     * Load payment_settings inside the current tenant context. Returns
     * sensible defaults so older tenants without the table behave like
     * payments are off.
     */
    private function loadPaymentSettings(): array
    {
        $defaults = [
            'payments_enabled'           => false,
            'deposits_enabled'           => false,
            'deposit_type'               => null,
            'deposit_amount'             => null,
            'allow_full_payment'         => false,
            'currency'                   => 'USD',
            'stripe_connect_account_id'  => null,
            'stripe_connect_status'      => 'not_connected',
            'stripe_charges_enabled'     => false,
            'stripe_payouts_enabled'     => false,
            'stripe_details_submitted'   => false,
        ];

        if (! Schema::hasTable('payment_settings')) {
            return $defaults;
        }

        $row = DB::table('payment_settings')->first();
        if (! $row) {
            return $defaults;
        }

        // Defensive accessor for Connect columns added in a later migration.
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;

        return [
            'payments_enabled'           => (bool) $row->payments_enabled,
            'deposits_enabled'           => (bool) $row->deposits_enabled,
            'deposit_type'               =>        $row->deposit_type,
            'deposit_amount'             => $row->deposit_amount !== null ? (float) $row->deposit_amount : null,
            'allow_full_payment'         => (bool) $row->allow_full_payment,
            'currency'                   =>        $row->currency ?? 'USD',
            'stripe_connect_account_id'  =>        $get('stripe_connect_account_id'),
            'stripe_connect_status'      =>        $get('stripe_connect_status', 'not_connected'),
            'stripe_charges_enabled'     => (bool) $get('stripe_charges_enabled', false),
            'stripe_payouts_enabled'     => (bool) $get('stripe_payouts_enabled', false),
            'stripe_details_submitted'   => (bool) $get('stripe_details_submitted', false),
        ];
    }

    private function findOrCreateClient(string $name, ?string $email, ?string $phone): ?int
    {
        if ($email) {
            $client = DB::table('clients')->where('email', $email)->first();
            if ($client) {
                DB::table('clients')->where('id', $client->id)->update([
                    'last_booked_at' => now(),
                    'updated_at'     => now(),
                ]);
                return (int) $client->id;
            }
        } elseif ($phone) {
            $client = DB::table('clients')->where('phone', $phone)->first();
            if ($client) {
                DB::table('clients')->where('id', $client->id)->update([
                    'last_booked_at' => now(),
                    'updated_at'     => now(),
                ]);
                return (int) $client->id;
            }
        }

        if ($email || $phone) {
            return DB::table('clients')->insertGetId([
                'name'           => $name,
                'email'          => $email,
                'phone'          => $phone,
                'last_booked_at' => now(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        return null;
    }
}
