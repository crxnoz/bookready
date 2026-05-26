<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Exceptions\StripeConnectNotReadyException;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\PlatformMailer;
use App\Services\SlotGenerator;
use App\Services\StripeConnectService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

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
            // Optional client preference when both deposit AND full
            // payment are allowed. Ignored when only one is valid.
            'payment_choice'   => 'sometimes|in:deposit,full',
            // Policy-agreement flag. Required only when the tenant has
            // require_policy_agreement turned on (validated below).
            'policy_agreed'    => 'sometimes|boolean',
        ]);

        $serviceId = (int)    $validated['service_id'];
        $date      =          $validated['appointment_date'];
        $startTime = substr($validated['start_time'], 0, 5);

        // Fetch owner email from central DB before switching tenant connection.
        $ownerEmail = $tenant->owner?->email;
        $ownerName  = $tenant->owner?->name ?? 'there';

        tenancy()->initialize($tenant);

        // Policy enforcement: require_policy_agreement. Reject early if the
        // tenant requires it and the client didn't tick the box.
        if (\Illuminate\Support\Facades\Schema::hasTable('business_policies')
            && \Illuminate\Support\Facades\Schema::hasColumn('business_policies', 'require_policy_agreement')
        ) {
            $requiresAgreement = (bool) DB::table('business_policies')->value('require_policy_agreement');
            if ($requiresAgreement && empty($validated['policy_agreed'])) {
                tenancy()->end();
                return response()->json([
                    'message' => 'You must agree to the booking policies to continue.',
                    'errors'  => ['policy_agreed' => ['Please confirm you have read the booking policies.']],
                ], 422);
            }
        }

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

        // ── Daily-capacity guard ────────────────────────────────────────
        // booking_settings.max_appointments_per_day is nullable; null = no cap.
        if ($settings && isset($settings->max_appointments_per_day) && $settings->max_appointments_per_day !== null) {
            $cap = (int) $settings->max_appointments_per_day;
            if ($cap > 0 && count($appointments) >= $cap) {
                tenancy()->end();
                return response()->json([
                    'message' => 'This day is fully booked. Please choose another date.',
                ], 422);
            }
        }

        // Phase 6: load tenant-wide blocked-date ranges that touch this date
        // so the server-side slot re-verify also rejects newly-blocked days.
        $blockedRanges = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('blocked_dates')) {
            $blockedRanges = DB::table('blocked_dates')
                ->where('start_date', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->where('end_date', '>=', $date)->orWhereNull('end_date');
                })
                ->get(['start_date', 'end_date', 'reason'])
                ->map(fn ($r) => [
                    'start_date' => $r->start_date,
                    'end_date'   => $r->end_date,
                    'reason'     => $r->reason,
                ])
                ->all();
        }

        // ── Re-verify slot is still available (anti-double-booking) ──────
        $result = SlotGenerator::generate(
            date:          $date,
            service:       $service,
            hoursRow:      $hoursRow,
            settings:      $settings,
            appointments:  $appointments,
            appTimezone:   config('app.timezone'),
            blockedRanges: $blockedRanges,
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
        // Defaults: payments off, no charge, no special status.
        $payment      = $this->loadPaymentSettings();
        $servicePrice = $service->price !== null ? (float) $service->price : null;

        $depositAmount = AppointmentPaymentService::calculateDeposit($payment, $servicePrice);
        $fullAmount    = AppointmentPaymentService::calculateFullPayment($payment, $servicePrice);
        $depositAllowed = $depositAmount !== null;
        $fullAllowed    = $fullAmount    !== null;

        // Pick effective payment_type:
        //  - both allowed → use client's payment_choice; default to deposit
        //  - only one allowed → that one
        //  - neither → no payment required
        $clientChoice = $validated['payment_choice'] ?? null;
        if ($depositAllowed && $fullAllowed) {
            $paymentType  = $clientChoice === 'full' ? 'full' : 'deposit';
        } elseif ($depositAllowed) {
            $paymentType  = 'deposit';
        } elseif ($fullAllowed) {
            $paymentType  = 'full';
        } else {
            $paymentType  = null;
        }
        $paymentRequired = $paymentType !== null;
        $chargeAmount    = $paymentType === 'full' ? $fullAmount : ($paymentType === 'deposit' ? $depositAmount : null);

        // Columns we set only when the migration has run (graceful fallback).
        $appointmentsHasPaymentCols = Schema::hasColumn('appointments', 'payment_status');

        // Pre-check: any payment-required booking needs the tenant's Stripe
        // Connect account ready BEFORE we insert anything. Otherwise we'd
        // leave a pending_payment row that can never be collected on.
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

        $manageToken = Schema::hasColumn('appointments', 'manage_token')
            ? Str::random(40)
            : null;

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
        if ($manageToken !== null) {
            $insertData['manage_token'] = $manageToken;
        }

        if ($appointmentsHasPaymentCols) {
            if ($paymentRequired) {
                $insertData['payment_status']      = 'pending_payment';
                $insertData['deposit_required']    = $paymentType === 'deposit';
                $insertData['deposit_amount']      = $chargeAmount;
                $insertData['deposit_paid_amount'] = 0;
                // For 'full' the client is paying the whole service price
                // up front, so no balance is owed at the appointment.
                $insertData['amount_due'] = $paymentType === 'full'
                    ? 0
                    : ($servicePrice !== null
                        ? max(0, round($servicePrice - $chargeAmount, 2))
                        : null);
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
        $apptToken = property_exists($row, 'manage_token') ? $row->manage_token : null;
        $manageUrl = $apptToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $apptToken) : null;
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
            'manage_url'       => $manageUrl,
        ];

        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $notify       = NotificationSettingsService::load();

        // ── Payment-required path: create Stripe Checkout session ────────
        $checkoutUrl = null;
        if ($paymentRequired && $appointmentsHasPaymentCols) {
            try {
                $session = AppointmentPaymentService::createCheckoutSession([
                    'tenant_id'                 => (string) $tenant->id,
                    'tenant_slug'               => (string) $tenant->id,
                    'appointment_id'            => (int)    $appt['id'],
                    'service_name'              => (string) $appt['service_name'],
                    'payment_type'              =>          $paymentType,
                    'amount'                    => (float)  $chargeAmount,
                    'currency'                  => $payment['currency'] ?? 'USD',
                    'customer_email'            => $appt['customer_email'],
                    'stripe_connect_account_id' => $payment['stripe_connect_account_id'] ?? null,
                    'stripe_connect_ready'      => StripeConnectService::isReady($payment),
                    'allow_split_pay'           => (bool) ($payment['allow_split_pay']      ?? false),
                    'collect_tax'               => (bool) ($payment['collect_tax']          ?? false),
                    'save_cards_for_reuse'      => (bool) ($payment['save_cards_for_reuse'] ?? false),
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

        // Was this the tenant's first-ever real booking? "Real" = not
        // cancelled, so a test booking that got cancelled doesn't disqualify
        // them from the celebration. Best-effort; small race conditions are
        // fine because the worst case is missing the email once.
        $isFirstBooking = DB::table('appointments')
            ->whereNotIn('status', ['cancelled'])
            ->count() === 1;

        tenancy()->end();

        // ── Email behavior ───────────────────────────────────────────────
        // When payment is required, hold off on the booking-request emails
        // until the webhook confirms the deposit. When payment is not
        // required, behavior is byte-identical to the previous flow.
        if (! $paymentRequired) {
            AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail, $notify);

            // First-booking celebration runs alongside the regular request
            // email. Payment-required path fires this from the webhook so
            // it doesn't celebrate a pending_payment that never clears.
            if ($isFirstBooking) {
                PlatformMailer::sendFirstBookingCelebration(
                    $ownerEmail, $ownerName, $businessName, $appt,
                );
            }
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
            $response['payment_type']     = $paymentType;
            $response['amount']           = (float) $chargeAmount;
            // Back-compat field — older frontends look for deposit_amount.
            $response['deposit_amount']   = (float) $chargeAmount;
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
