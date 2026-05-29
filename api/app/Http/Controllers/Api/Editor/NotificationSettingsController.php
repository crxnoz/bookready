<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentCancelledClientMail;
use App\Mail\AppointmentConfirmedClientMail;
use App\Mail\AppointmentReminderClientMail;
use App\Mail\AppointmentRescheduledClientMail;
use App\Mail\BookingRequestClientMail;
use App\Models\Tenant;
use App\Services\NotificationSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class NotificationSettingsController extends Controller
{
    private function format(object $row): array
    {
        $templates = [];
        if (Schema::hasColumn('notification_settings', 'email_templates')) {
            $raw = $row->email_templates ?? null;
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $templates = $decoded;
            } elseif (is_array($raw)) {
                $templates = $raw;
            }
        }

        return [
            'id'                                  => (int)   $row->id,
            'owner_booking_email_enabled'         => (bool)  $row->owner_booking_email_enabled,
            'client_booking_email_enabled'        => (bool)  $row->client_booking_email_enabled,
            'appointment_confirmed_email_enabled' => (bool)  $row->appointment_confirmed_email_enabled,
            'appointment_cancelled_email_enabled' => (bool)  $row->appointment_cancelled_email_enabled,
            'reminder_email_enabled'              => (bool)  $row->reminder_email_enabled,
            'reminder_hours_before'               => (int)   $row->reminder_hours_before,
            'reply_to_email'                      =>         $row->reply_to_email,
            'sender_name'                         =>         $row->sender_name,
            'email_templates'                     =>         (object) $templates,
            // Read-only — what From address Resend will actually use.
            'effective_from_address'              =>         (string) (config('mail.from.address') ?? ''),
            'effective_from_name'                 =>         $row->sender_name ?: (string) (config('mail.from.name') ?? ''),
            'created_at'                          =>         $row->created_at,
            'updated_at'                          =>         $row->updated_at,
        ];
    }

    private function ensureRowExists(): object
    {
        $row = DB::table('notification_settings')->first();
        if ($row) return $row;

        $id = DB::table('notification_settings')->insertGetId([
            'owner_booking_email_enabled'         => true,
            'client_booking_email_enabled'        => true,
            'appointment_confirmed_email_enabled' => true,
            'appointment_cancelled_email_enabled' => true,
            'reminder_email_enabled'              => false,
            'reminder_hours_before'               => 24,
            'reply_to_email'                      => null,
            'sender_name'                         => null,
            'created_at'                          => now(),
            'updated_at'                          => now(),
        ]);

        return DB::table('notification_settings')->where('id', $id)->first();
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row    = $this->ensureRowExists();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_booking_email_enabled'         => 'sometimes|boolean',
            'client_booking_email_enabled'        => 'sometimes|boolean',
            'appointment_confirmed_email_enabled' => 'sometimes|boolean',
            'appointment_cancelled_email_enabled' => 'sometimes|boolean',
            'reminder_email_enabled'              => 'sometimes|boolean',
            'reminder_hours_before'               => 'sometimes|integer|min:1|max:720',
            'reply_to_email'                      => 'sometimes|nullable|email|max:255',
            'sender_name'                         => 'sometimes|nullable|string|max:120',
            // Phase 17 — per-template customizations (subject + intro + signoff).
            'email_templates'                     => 'sometimes|nullable|array',
            'email_templates.*.subject'           => 'sometimes|nullable|string|max:255',
            'email_templates.*.intro'             => 'sometimes|nullable|string|max:2000',
            'email_templates.*.signoff'           => 'sometimes|nullable|string|max:2000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRowExists();

        $patch = ['updated_at' => now()];

        foreach ([
            'owner_booking_email_enabled', 'client_booking_email_enabled',
            'appointment_confirmed_email_enabled', 'appointment_cancelled_email_enabled',
            'reminder_email_enabled',
        ] as $f) {
            if (array_key_exists($f, $validated)) $patch[$f] = (bool) $validated[$f];
        }
        if (array_key_exists('reminder_hours_before', $validated)) $patch['reminder_hours_before'] = (int) $validated['reminder_hours_before'];
        if (array_key_exists('reply_to_email',       $validated)) $patch['reply_to_email'] = $validated['reply_to_email'];
        if (array_key_exists('sender_name',          $validated)) $patch['sender_name']    = $validated['sender_name'];

        // email_templates — accept partial updates; whitelist keys to what
        // we actually support so a bad payload can't smuggle through extras.
        if (array_key_exists('email_templates', $validated) && Schema::hasColumn('notification_settings', 'email_templates')) {
            $existing = $this->loadTemplatesRaw();
            $incoming = is_array($validated['email_templates']) ? $validated['email_templates'] : [];
            foreach ($incoming as $k => $v) {
                if (! in_array($k, NotificationSettingsService::CUSTOMIZABLE_TEMPLATES, true)) continue;
                if (! is_array($v)) continue;
                $existing[$k] = [
                    'subject' => isset($v['subject']) ? (string) $v['subject'] : null,
                    'intro'   => isset($v['intro'])   ? (string) $v['intro']   : null,
                    'signoff' => isset($v['signoff']) ? (string) $v['signoff'] : null,
                ];
            }
            $patch['email_templates'] = json_encode($existing);
        }

        DB::table('notification_settings')->update($patch);

        $row    = DB::table('notification_settings')->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    /**
     * Phase 17 — send a test email of the chosen template.
     *
     * Defaults to the owner's account email when `to` is omitted; pass
     * `to` to deliver to an arbitrary address (useful for previewing how
     * the email will land in a real client's inbox).
     *
     * Uses fake-but-realistic $appt data so the layout reflects what a
     * client would see, plus the tenant's saved customizations.
     */
    public function testSend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template' => 'required|string|in:' . implode(',', NotificationSettingsService::CUSTOMIZABLE_TEMPLATES),
            'to'       => 'sometimes|nullable|email|max:255',
        ]);
        $key = $validated['template'];

        $user   = $request->user();
        $tenant = Tenant::findOrFail($user->tenant_id);
        tenancy()->initialize($tenant);

        // Table is `business_profiles` (plural) — previous singular form
        // matched no table and threw SQLSTATE[42S02] on test send.
        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?? $tenant->id);
        $notify       = NotificationSettingsService::load();

        tenancy()->end();

        // Custom `to` takes precedence; otherwise fall back to the
        // signed-in owner's address.
        $to = ! empty($validated['to']) ? trim($validated['to']) : $user->email;
        if (! $to) return response()->json(['message' => 'Your account has no email address.'], 422);

        $custom = NotificationSettingsService::templateCustomization($notify, $key);

        // Fake appointment payload that looks real in the email layout.
        $appt = $this->buildFakeAppt($to);

        // Rescheduled needs a "before" snapshot for the email layout.
        $oldAppt = array_merge($appt, [
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'start_time'       => '14:00',
            'end_time'         => '15:00',
        ]);
        $appt['appointment_date'] = now()->addDays(4)->format('Y-m-d');

        try {
            $mailable = match ($key) {
                'booking_request_client'   => new BookingRequestClientMail($appt, $businessName, $custom),
                'appointment_confirmed'    => new AppointmentConfirmedClientMail($appt, $businessName, $custom),
                'appointment_cancelled'    => new AppointmentCancelledClientMail($appt, $businessName, $custom),
                'appointment_rescheduled'  => new AppointmentRescheduledClientMail($appt, $oldAppt, $businessName, 'owner', $custom),
                'appointment_reminder'     => new AppointmentReminderClientMail($appt, $businessName, $custom, $notify['reminder_hours_before'] ?? 24),
            };
            Mail::to($to)->send($mailable);
        } catch (\Throwable $e) {
            Log::error('[BookReady] Email test-send failed', [
                'template' => $key,
                'to'       => $to,
                'error'    => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not send the test email: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => "Test email sent to {$to}.",
            'sent_to' => $to,
        ]);
    }

    private function loadTemplatesRaw(): array
    {
        $row = DB::table('notification_settings')->first();
        if (! $row || ! Schema::hasColumn('notification_settings', 'email_templates')) return [];
        $raw = $row->email_templates ?? null;
        if (is_array($raw)) return $raw;
        if (is_string($raw) && $raw !== '') {
            $d = json_decode($raw, true);
            return is_array($d) ? $d : [];
        }
        return [];
    }

    private function buildFakeAppt(string $customerEmail): array
    {
        return [
            'id'                       => 0,
            'customer_name'            => 'Sample Client',
            'customer_email'           => $customerEmail,
            'customer_phone'           => null,
            'service_name'             => 'Sample Service',
            'service_price'            => 75.00,
            'service_duration_minutes' => 60,
            'appointment_date'         => now()->addDays(2)->format('Y-m-d'),
            'start_time'               => '10:00',
            'end_time'                 => '11:00',
            'status'                   => 'confirmed',
            'notes'                    => null,
            'manage_url'               => null,
            'staff_name'               => null,
            'addons'                   => [],
            'payment_status'           => 'none',
            'currency'                 => 'USD',
        ];
    }
}
