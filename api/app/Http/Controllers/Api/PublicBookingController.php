<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Customer\EmailVerificationController;
use App\Mail\CustomerWelcomeMail;
use App\Models\CustomerUser;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Exceptions\StripeConnectNotReadyException;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\PlatformMailer;
use App\Services\SitePrivacyService;
use App\Services\SlotGenerator;
use App\Services\StripeConnectService;
use App\Support\CustomerAuthCookie;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

        // Phase 3 customer-accounts — if the visitor is signed into a
        // BookReady customer account, override the identity fields on the
        // request input BEFORE validation runs. This both removes the
        // "fill name/email" friction for repeat customers and prevents
        // an authed customer from booking under a different identity by
        // editing the form. Anonymous flow is untouched.
        //
        // Phone has a softer rule: if the customer's profile phone is
        // empty AND they typed one into the booking form, back-sync it
        // to the customer_users row first, then use it on the booking.
        // This handles the common case where someone signed up with
        // just name+email via the in-page modal (which intentionally
        // doesn't ask for phone to stay short) and adds their number
        // during their first booking. We never OVERWRITE an existing
        // phone — that's a profile-management action they make
        // explicitly from /account/profile.
        // Use the Sanctum guard explicitly. The public booking route has
        // no auth middleware (anonymous bookings still work), which means
        // $request->user() doesn't fire the Sanctum guard's resolver and
        // returns null even when AuthFromCookie set the Bearer header.
        // Auth::guard('sanctum')->user() walks the header directly.
        $sanctumUser = Auth::guard('sanctum')->user();
        $authedCustomer = $sanctumUser instanceof CustomerUser ? $sanctumUser : null;

        // Opt-in account creation alongside booking. When the visitor
        // ticked "Create a BookReady account" in Step 4 we register them
        // BEFORE the rest of the booking flow runs, so the downstream
        // stamping logic (clients.customer_user_id + pivot upsert) treats
        // them as authed and the link is in place by the time the email
        // confirmation goes out.
        //
        // The mint-token-and-attach-cookie variable is held here and
        // chained onto the final success response (Stripe-redirect path
        // included). Failure to create the account (email already taken,
        // mailer down, etc.) is non-fatal — the booking still goes
        // through anonymously and the existing claim CTA in the email
        // handles "save this booking" later.
        $newCustomerCookie       = null;
        $customerAccountCreated  = false;
        if (! $authedCustomer && filter_var($request->input('create_account', false), FILTER_VALIDATE_BOOLEAN)) {
            $signupEmail = strtolower(trim((string) $request->input('customer_email', '')));
            $signupPassword = (string) $request->input('account_password', '');
            $signupName  = trim((string) $request->input('customer_name', ''));
            $signupPhone = trim((string) $request->input('customer_phone', ''));

            // Soft validation — empty email or password just falls
            // through to anonymous. Real form validation runs below in
            // the existing $request->validate() block and catches
            // anything malformed before the booking is created.
            if ($signupEmail !== '' && strlen($signupPassword) >= 8 && $signupName !== '') {
                $emailTaken = CustomerUser::where('email', $signupEmail)->exists();
                if (! $emailTaken) {
                    try {
                        $newUser = CustomerUser::create([
                            'name'     => $signupName,
                            'email'    => $signupEmail,
                            'password' => $signupPassword,
                            'phone'    => $signupPhone !== '' ? $signupPhone : null,
                        ]);
                        $newUser->last_login_at = now();
                        $newUser->save();

                        // Welcome mail — best effort.
                        try {
                            Mail::to($newUser->email)->send(new CustomerWelcomeMail(
                                customerName: $newUser->name,
                                accountUrl:   'https://app.bkrdy.me/account',
                            ));
                        } catch (\Throwable $e) {
                            Log::warning('CustomerWelcomeMail failed (booking signup)', [
                                'user_id' => $newUser->id,
                                'error'   => $e->getMessage(),
                            ]);
                        }
                        // Verify-email link — best effort. Customer can
                        // resend later from /account.
                        try {
                            EmailVerificationController::sendVerificationEmail($newUser);
                        } catch (\Throwable $e) {
                            Log::warning('CustomerVerifyEmailMail failed (booking signup)', [
                                'user_id' => $newUser->id,
                                'error'   => $e->getMessage(),
                            ]);
                        }

                        $token = $newUser->createToken(
                            'customer-booking-signup',
                            ['*'],
                            now()->addMinutes(CustomerAuthCookie::TOKEN_TTL_MIN),
                        )->plainTextToken;

                        $newCustomerCookie      = CustomerAuthCookie::make($token);
                        $authedCustomer         = $newUser;
                        $customerAccountCreated = true;
                    } catch (\Throwable $e) {
                        Log::warning('booking.signup creation failed', [
                            'email' => $signupEmail,
                            'error' => $e->getMessage(),
                        ]);
                        // Fall through to anonymous booking.
                    }
                }
            }
        }

        if ($authedCustomer) {
            $providedPhone = trim((string) $request->input('customer_phone', ''));

            if (empty($authedCustomer->phone) && $providedPhone !== '') {
                $authedCustomer->phone = $providedPhone;
                $authedCustomer->save();
            }

            $request->merge([
                'customer_name'  => $authedCustomer->name,
                'customer_email' => $authedCustomer->email,
                // After the save above, $authedCustomer->phone reflects
                // the new value, so the ?: also picks up freshly-synced
                // numbers without re-reading the request.
                'customer_phone' => $authedCustomer->phone ?: $providedPhone,
            ]);
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
            // Phase 7: optional add-on ids + chosen staff member.
            'addon_ids'        => 'sometimes|array',
            'addon_ids.*'      => 'integer',
            'staff_id'         => 'sometimes|nullable|integer',
            // Phase 16: custom booking-question answers.
            // Shape: [{ question_id, value? (string|bool), image_url? }]
            'question_answers'                 => 'sometimes|array|max:100',
            'question_answers.*.question_id'   => 'required_with:question_answers|integer',
            'question_answers.*.value'         => 'sometimes|nullable',
            'question_answers.*.image_url'     => 'sometimes|nullable|string|max:2000',
            // Phase S1 — unlock token for private sites
            'unlock'           => 'sometimes|nullable|string|max:500',
            // Opt-in account-creation alongside booking. Soft-validated
            // above (any failure falls through to anonymous booking); we
            // still declare them here so the request input arrays stay
            // tidy and so a malformed password is rejected cleanly if
            // the visitor explicitly opted in.
            'create_account'   => 'sometimes|boolean',
            'account_password' => 'required_if:create_account,true|string|min:8|max:255',
        ]);

        $serviceId = (int)    $validated['service_id'];
        $date      =          $validated['appointment_date'];
        $startTime = substr($validated['start_time'], 0, 5);
        $requestedAddonIds = array_values(array_unique(array_map('intval', $validated['addon_ids'] ?? [])));
        $requestedStaffId  = isset($validated['staff_id']) && $validated['staff_id'] !== null
            ? (int) $validated['staff_id']
            : null;

        // Fetch owner email from central DB before switching tenant connection.
        $ownerEmail = $tenant->owner?->email;
        $ownerName  = $tenant->owner?->name ?? 'there';

        tenancy()->initialize($tenant);

        // Phase S1 — block bookings when the site is private or coming-soon.
        // The booking POST accepts an optional unlock token (passed by the
        // public booking form when the visitor has unlocked the site).
        $unlockToken = $request->input('unlock') ?? $request->query('unlock');
        $block = SitePrivacyService::check($slug, is_string($unlockToken) ? $unlockToken : null);
        if ($block !== null) {
            tenancy()->end();
            return response()->json([
                'message' => 'Bookings for this site are not currently available.',
            ], 403);
        }

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

        // ── Phase 7: resolve add-ons + staff ─────────────────────────────
        // Add-ons must be linked to THIS service (defends against clients
        // sending arbitrary addon ids). Required add-ons are auto-added
        // server-side even if the client somehow drops them.
        [$selectedAddons, $addonsDurationMinutes, $addonsSubtotalCents] =
            $this->resolveAddons((int) $service->id, $requestedAddonIds);

        // Staff: must be in the service's assigned_staff_ids pivot when
        // that pivot is non-empty. Empty pivot = any staff is fine, so
        // we leave $staffId null in that case (legacy behaviour).
        $staffId = $this->resolveStaffId((int) $service->id, $requestedStaffId);

        // ── Calculate end time (service + add-on durations) ──────────────
        $duration = (int) $service->duration + $addonsDurationMinutes;
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

        // Phase 3 — stamp the new (or existing) clients row with the
        // authed customer's id so the customer dashboard surfaces this
        // booking immediately. Guarded by Schema::hasColumn so a tenant
        // mid-deploy without the Phase 1 migration doesn't blow up.
        if ($authedCustomer && $clientId && Schema::hasColumn('clients', 'customer_user_id')) {
            DB::table('clients')
                ->where('id', $clientId)
                ->update([
                    'customer_user_id' => $authedCustomer->id,
                    'updated_at'       => now(),
                ]);
        }

        // ── Payment branching ────────────────────────────────────────────
        // Defaults: payments off, no charge, no special status.
        $payment      = $this->loadPaymentSettings();
        // Phase 7: roll any selected add-ons into the price the client is
        // charged for (deposit + full both use this combined total). The
        // original service price is preserved on the appointment for the
        // receipt line; addons_subtotal lives in its own column.
        $servicePrice = $service->price !== null
            ? (float) $service->price + ($addonsSubtotalCents / 100)
            : null;

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

        // ── Phase 16: booking-question answers ──────────────────────────────
        // Build a snapshot from the active questions table. Required ones
        // are enforced server-side regardless of client validation.
        $questionAnswersJson = null;
        if (Schema::hasTable('booking_questions') && Schema::hasColumn('appointments', 'question_answers')) {
            $rawAnswers = is_array($validated['question_answers'] ?? null)
                ? $validated['question_answers']
                : [];
            $answerByQ = [];
            foreach ($rawAnswers as $a) {
                $qid = (int) ($a['question_id'] ?? 0);
                if ($qid > 0) $answerByQ[$qid] = $a;
            }

            $activeQuestions = DB::table('booking_questions')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $snapshot = [];
            foreach ($activeQuestions as $q) {
                // Scope filter — skip questions that don't apply to this service.
                $scope = $q->scope ?? 'all';
                if ($scope === 'services') {
                    $sids = is_string($q->service_ids) ? json_decode($q->service_ids, true) : [];
                    $sids = is_array($sids) ? array_map('intval', $sids) : [];
                    if (! in_array((int) $service->id, $sids, true)) continue;
                }

                $given = $answerByQ[(int) $q->id] ?? null;
                $value = $given['value']     ?? null;
                $image = $given['image_url'] ?? null;

                // Normalize per type.
                $type = $q->type;
                if ($type === 'checkbox') {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                    $image = null;
                } elseif ($type === 'image') {
                    $value = null;
                    // Phase S5++ — image_url must be a URL we minted from
                    // the booking-answer-upload endpoint. A malicious client
                    // submitting `javascript:alert(1)` or a phishing URL
                    // would otherwise end up rendered inside the owner's
                    // appointment view as a clickable link.
                    $image = $this->sanitizeImageUrl(is_string($image) ? $image : null);
                } else {
                    $value = is_scalar($value) ? trim((string) $value) : null;
                    if ($value === '') $value = null;
                    $image = null;
                }

                // Required enforcement.
                if ((bool) $q->required) {
                    $missing = ($type === 'image')    ? ($image === null)
                            : (($type === 'checkbox') ? ($value !== true)
                                                      : ($value === null));
                    if ($missing) {
                        tenancy()->end();
                        return response()->json([
                            'message' => 'Please answer all required questions.',
                            'errors'  => ['question_answers' => ["'{$q->label}' is required."]],
                        ], 422);
                    }
                }

                $snapshot[] = [
                    'question_id'    => (int) $q->id,
                    'label_snapshot' => $q->label,
                    'type_snapshot'  => $type,
                    'value'          => $value,
                    'image_url'      => $image,
                ];
            }

            if (! empty($snapshot)) {
                $questionAnswersJson = json_encode($snapshot);
            }
        }

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
        // Phase 7 columns — defensive so legacy tenants don't blow up.
        if (Schema::hasColumn('appointments', 'staff_id')) {
            $insertData['staff_id'] = $staffId;
        }
        if (Schema::hasColumn('appointments', 'addons_subtotal_cents')) {
            $insertData['addons_subtotal_cents'] = $addonsSubtotalCents;
        }
        if ($questionAnswersJson !== null && Schema::hasColumn('appointments', 'question_answers')) {
            $insertData['question_answers'] = $questionAnswersJson;
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

        // Phase 7: persist add-on snapshots — captures price + duration
        // at booking time so future add-on edits don't rewrite history.
        if (! empty($selectedAddons) && Schema::hasTable('appointment_addons')) {
            $rows = array_map(fn ($a) => [
                'appointment_id'           => $id,
                'addon_id'                 => $a['id'],
                'price_snapshot_cents'     => $a['extra_price_cents'],
                'duration_snapshot_minutes'=> $a['extra_duration_minutes'],
                'name_snapshot'            => $a['name'],
                'created_at'               => now(),
                'updated_at'               => now(),
            ], $selectedAddons);
            DB::table('appointment_addons')->insert($rows);
        }

        $row = DB::table('appointments')->find($id);

        // Phase 7 — staff name + add-on summary for the email templates.
        // Looked up inside the tenant scope so the mailer (which runs after
        // tenancy()->end()) doesn't need to re-open a connection.
        $staffName = null;
        if ($staffId !== null && Schema::hasTable('staff')) {
            $staffName = DB::table('staff')->where('id', $staffId)->value('name');
        }
        $apptAddons = array_map(fn ($a) => [
            'name'                   => $a['name'],
            'extra_price'            => round($a['extra_price_cents'] / 100, 2),
            'extra_duration_minutes' => $a['extra_duration_minutes'],
        ], $selectedAddons);

        // Build a plain-array snapshot for use after tenancy ends.
        $apptToken = property_exists($row, 'manage_token') ? $row->manage_token : null;
        $manageUrl = $apptToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $apptToken) : null;

        // Phase 4 customer-accounts — mint a "Save this booking" claim
        // token ONLY when the booker is anonymous AND we have an email
        // to send the link to. An authed booker is already linked to a
        // customer_users row via the customer_user_id stamp above, so
        // showing the CTA would just confuse them. ClaimController
        // tokens are 7-day-TTL, HMAC-signed, single-use (re-claim with
        // the same email returns 409). The frontend lands the link at
        // app.bkrdy.me/account/claim?token=...
        $claimUrl = null;
        if (! $authedCustomer && ! empty($row->customer_email)) {
            $claimToken = \App\Http\Controllers\Api\Customer\ClaimController::mintToken(
                (string) $row->customer_email,
            );
            $claimUrl = 'https://app.bkrdy.me/account/claim?token=' . urlencode($claimToken);
        }

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
            'claim_url'        => $claimUrl,
            // Phase 7 extras. Empty array / null when not used so blades
            // can @if-guard cheaply.
            'staff_name'       => $staffName,
            'addons'           => $apptAddons,
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
                        'https://%s.bkrdy.me/?booking=success&appointment=%d&session_id={CHECKOUT_SESSION_ID}%s',
                        $tenant->id, $appt['id'],
                        $customerAccountCreated ? '&account=new' : '',
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

        // Phase 3 — pivot upsert MUST happen after tenancy()->end()
        // because customer_user_tenants lives in the central DB.
        // Idempotent: re-booking at the same tenant just bumps
        // last_booked_at. Best-effort wrap because losing the pivot
        // row is annoying (booking won't appear in /customer/bookings)
        // but not severe enough to fail the whole booking response.
        if ($authedCustomer) {
            try {
                DB::table('customer_user_tenants')->updateOrInsert(
                    ['customer_user_id' => $authedCustomer->id, 'tenant_id' => $tenant->id],
                    [
                        'first_booked_at' => DB::raw('COALESCE(first_booked_at, NOW())'),
                        'last_booked_at'  => now(),
                        'updated_at'      => now(),
                        'created_at'      => DB::raw('COALESCE(created_at, NOW())'),
                    ],
                );
            } catch (\Throwable $e) {
                Log::warning('customer_user_tenants upsert failed', [
                    'customer_user_id' => $authedCustomer->id,
                    'tenant_id'        => $tenant->id,
                    'error'            => $e->getMessage(),
                ]);
            }
        }

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

        if ($customerAccountCreated) {
            $response['customer_account_created'] = true;
        }

        $resp = response()->json($response, 201);
        // Attach the customer auth cookie when we minted one — the
        // visitor is logged in by the time they see the success state.
        if ($newCustomerCookie !== null) {
            $resp = $resp->withCookie($newCustomerCookie);
        }

        return $resp;
    }

    /**
     * Phase 7: resolve which add-ons apply to this booking.
     *
     * Required add-ons (per the service_addon_links pivot) are always
     * included even if the client omitted them — they're called required
     * because they are. Optional ones are kept only when both linked and
     * active. Returns:
     *   - $selectedAddons: list of ['id','name','extra_price_cents','extra_duration_minutes']
     *   - $durationMinutes: sum of all extra_duration_minutes
     *   - $subtotalCents:   sum of all extra_price_cents
     */
    private function resolveAddons(int $serviceId, array $requestedIds): array
    {
        if (! Schema::hasTable('service_addon_links') || ! Schema::hasTable('service_addons')) {
            return [[], 0, 0];
        }
        $links = DB::table('service_addon_links')
            ->where('service_id', $serviceId)
            ->get(['addon_id', 'is_required']);

        $linkedIds   = $links->pluck('addon_id')->map(fn ($i) => (int) $i)->all();
        $requiredIds = $links->where('is_required', true)->pluck('addon_id')->map(fn ($i) => (int) $i)->all();

        // Only keep client picks that are actually linked to this service,
        // then union with the required set so required can't be dropped.
        $effectiveIds = array_values(array_unique(array_merge(
            array_intersect($requestedIds, $linkedIds),
            $requiredIds,
        )));
        if (empty($effectiveIds)) {
            return [[], 0, 0];
        }

        $addons = DB::table('service_addons')
            ->whereIn('id', $effectiveIds)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'extra_price_cents', 'extra_duration_minutes'])
            ->map(fn ($r) => [
                'id'                     => (int) $r->id,
                'name'                   =>       $r->name,
                'extra_price_cents'      => (int) $r->extra_price_cents,
                'extra_duration_minutes' => (int) $r->extra_duration_minutes,
            ])
            ->all();

        $duration = array_sum(array_column($addons, 'extra_duration_minutes'));
        $subtotal = array_sum(array_column($addons, 'extra_price_cents'));

        return [$addons, $duration, $subtotal];
    }

    /**
     * Phase 7: validate the requested staff_id against the service's
     * assigned_staff_ids pivot. When the service has no assignments,
     * any staff (including the null "unassigned" sentinel) is fine.
     */
    private function resolveStaffId(int $serviceId, ?int $requestedStaffId): ?int
    {
        if ($requestedStaffId === null) return null;
        if (! Schema::hasTable('service_staff')) return null;

        $assigned = DB::table('service_staff')
            ->where('service_id', $serviceId)
            ->pluck('staff_id')
            ->map(fn ($i) => (int) $i)
            ->all();

        // Empty assignment list = any staff member is acceptable (we
        // still verify the staff row exists below).
        if (! empty($assigned) && ! in_array($requestedStaffId, $assigned, true)) {
            return null;
        }
        // Verify the staff row actually exists in this tenant.
        $exists = DB::table('staff')->where('id', $requestedStaffId)->exists();
        return $exists ? $requestedStaffId : null;
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

    /**
     * Phase S5++ — narrow validator for question_answers.image_url.
     *
     * The legitimate flow is:
     *   1. Public booking form POSTs the file to /public/sites/{slug}/booking-answer-upload
     *   2. That endpoint resizes + encodes + uploads to R2 and returns
     *      a public URL like https://<R2_PUBLIC_BASE>/tenants/<id>/booking_answer/<ulid>.webp
     *   3. The form re-submits the booking with image_url set to that URL.
     *
     * The booking POST itself is anonymous, so we cannot trust the client.
     * Accept ONLY:
     *   - an http(s) URL starting with the configured R2 public base, OR
     *   - (when r2 url is not configured — dev fallback) any https URL.
     *
     * Anything else (javascript:, data:, vbscript:, bare strings, phishing
     * URLs on attacker-controlled domains) is silently dropped — the
     * appointment still saves, just without the image. The owner sees the
     * question without a "View image" link, which is the correct fail-safe.
     */
    private function sanitizeImageUrl(?string $raw): ?string
    {
        if (! is_string($raw)) return null;
        $url = trim($raw);
        if ($url === '') return null;

        // Hard reject anything that is not http or https. Stops
        // javascript:/data:/vbscript:/file: at the validator boundary.
        if (! preg_match('#^https?://#i', $url)) return null;

        // Cap length defensively in case the validator was bypassed.
        if (strlen($url) > 2000) return null;

        $r2Base = rtrim((string) config('filesystems.disks.r2.url'), '/');
        if ($r2Base === '') {
            // Dev fallback when R2_PUBLIC_BASE isn't set — accept https only.
            $env = strtolower((string) config('app.env'));
            if (in_array($env, ['local', 'testing'], true)) {
                return preg_match('#^https://#i', $url) === 1 ? $url : null;
            }

            return null;
        }

        // Production — must originate from our R2 CDN.
        return str_starts_with($url, $r2Base . '/') ? $url : null;
    }
}
