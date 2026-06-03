<?php

namespace App\Services\Sms;

use App\Models\NotificationSendLog;
use App\Models\SmsOptout;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Single entry point for sending SMS through Twilio.
 *
 * Usage:
 *   $r = SmsService::send(
 *       to:          '+13125551234',
 *       body:        'BookReady: Your appointment is confirmed. Reply STOP to opt out.',
 *       tenantId:    'lushstudio',
 *       templateKey: 'booking_confirmation',
 *       context:     ['appointment_id' => 1234],
 *   );
 *
 * Flow:
 *
 *   1. Normalize phone to E.164. Reject if it can't be normalized.
 *   2. Check sms_optouts. If opted out, log + return optedOut().
 *   3. If Twilio is configured (live mode): POST to the Messages REST
 *      endpoint, log the provider Message SID, return queued().
 *   4. If Twilio is NOT configured (dry-run mode): log status=dry_run,
 *      return dryRun(). Lets the rest of the codebase wire SMS into
 *      booking flows BEFORE we have credentials, without surprises.
 *
 * Webhook callbacks (handled by TwilioWebhookController) flip the
 * notification_send_log.status from 'queued' to 'sent' / 'delivered'
 * / 'undelivered' / 'failed' once Twilio confirms downstream state.
 *
 * Raw HTTP, no SDK — keeps the dependency surface small and matches the
 * rest of the codebase (Stripe + uploads are all raw HTTP too).
 *
 * Stateless — fine to call from controllers, jobs, or services. No
 * shared mutable state.
 */
class SmsService
{
    public static function send(
        string $to,
        string $body,
        ?string $tenantId = null,
        ?string $templateKey = null,
        array $context = [],
    ): SmsSendResult {
        // 1. Phone normalization. We accept human-typed numbers
        //    ("(312) 555-1234", "312-555-1234", "13125551234") and
        //    coerce to E.164. If we can't, refuse — preferable to
        //    sending into the void.
        $normalized = self::normalizePhone($to);
        if ($normalized === null) {
            Log::warning('sms.send invalid phone', ['raw' => $to]);
            return SmsSendResult::invalidPhone($to);
        }

        // 2. Opt-out check. We never call Twilio for a number on the
        //    list — would be a TCPA violation. Log it so support can
        //    explain "your customer texted STOP" if the owner asks.
        if (SmsOptout::where('phone', $normalized)->exists()) {
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'twilio',
                'status'       => 'opted_out',
                'cost_cents'   => 0,
                'context'      => $context,
            ])->id;
            return SmsSendResult::optedOut($logId);
        }

        // 3. Dry-run path. Service is callable without credentials so
        //    the rest of the codebase can integrate SMS into booking
        //    flows during Twilio onboarding. The log row tells us
        //    what WOULD have been sent.
        if (! config('services.twilio.live')) {
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'twilio',
                'status'       => 'dry_run',
                'cost_cents'   => 0,
                'context'      => array_merge($context, [
                    'body_preview' => mb_substr($body, 0, 160),
                    'reason'       => 'TWILIO_ACCOUNT_SID/AUTH_TOKEN or sender not set',
                ]),
            ])->id;
            Log::info('sms.dry_run', [
                'to' => $normalized,
                'tenant_id' => $tenantId,
                'template_key' => $templateKey,
                'log_id' => $logId,
            ]);
            return SmsSendResult::dryRun($logId);
        }

        // 4. Live send. Twilio REST API (2010-04-01) — direct HTTP, no
        //    SDK needed. Auth is HTTP Basic (AccountSid : AuthToken), the
        //    body is form-encoded, and the message SID comes back as
        //    `sid`. Prefer a Messaging Service SID (A2P number pool) over
        //    a bare From number when both are configured.
        $sid       = (string) config('services.twilio.account_sid');
        $token     = (string) config('services.twilio.auth_token');
        $from      = (string) config('services.twilio.from');
        $msgSvc    = (string) config('services.twilio.messaging_service_sid');
        $costCents = (int) round((float) config('services.twilio.cost_cents_per_message'));

        $payload = [
            'To'   => $normalized,
            'Body' => $body,
        ];
        if ($msgSvc !== '') {
            $payload['MessagingServiceSid'] = $msgSvc;
        } else {
            $payload['From'] = $from;
        }
        // Ask Twilio to POST delivery receipts back so the webhook can
        // flip queued → sent / delivered / undelivered / failed.
        $base = rtrim((string) (config('services.twilio.webhook_base_url') ?: config('app.url')), '/');
        if ($base !== '') {
            $payload['StatusCallback'] = $base . '/api/v1/webhooks/twilio/status';
        }

        try {
            $resp = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->acceptJson()
                ->timeout(15)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", $payload);
        } catch (\Throwable $e) {
            // Network failure — log and bail. Caller decides whether
            // to retry; for booking confirmation we don't, the email
            // is the redundant channel.
            Log::error('sms.send.network_error', [
                'tenant_id' => $tenantId,
                'error'     => $e->getMessage(),
            ]);
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'twilio',
                'status'       => 'failed',
                'error'        => 'network: ' . $e->getMessage(),
                'context'      => $context,
            ])->id;
            return SmsSendResult::failed('network: ' . $e->getMessage(), $logId);
        }

        if (! $resp->successful()) {
            // Twilio error shape: { "code": 21610, "message": "...",
            // "more_info": "...", "status": 400 }.
            $err  = $resp->json('message') ?? $resp->status();
            $code = $resp->json('code');
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'twilio',
                'status'       => 'failed',
                'error'        => is_string($err) ? $err : json_encode($err),
                'context'      => array_merge($context, [
                    'http_status'  => $resp->status(),
                    'twilio_code'  => $code,
                ]),
            ])->id;
            Log::warning('sms.send.api_error', [
                'tenant_id'    => $tenantId,
                'http_status'  => $resp->status(),
                'twilio_code'  => $code,
                'error'        => $err,
            ]);
            return SmsSendResult::failed(is_string($err) ? $err : 'twilio error', $logId);
        }

        // Twilio success: the message SID is `sid`; `status` is the
        // initial state (queued / accepted / sending).
        $providerId = (string) ($resp->json('sid') ?? '');
        $logId = NotificationSendLog::create([
            'tenant_id'    => $tenantId,
            'channel'      => 'sms',
            'template_key' => $templateKey,
            'recipient'    => $normalized,
            'provider'     => 'twilio',
            'provider_id'  => $providerId !== '' ? $providerId : null,
            'status'       => 'queued',
            'cost_cents'   => $costCents,
            'context'      => $context,
        ])->id;

        return SmsSendResult::queued($providerId, $logId);
    }

    /**
     * Best-effort E.164 normalization for North American numbers. For
     * MVP we assume +1 (US/Canada) when the country code isn't given,
     * since that's the only region we serve. International support
     * would need libphonenumber.
     *
     * Returns null if the input can't be coerced.
     */
    public static function normalizePhone(?string $raw): ?string
    {
        if ($raw === null) return null;
        $digits = preg_replace('/[^\d+]/', '', $raw);
        if ($digits === null || $digits === '') return null;

        // Already E.164 (+ prefix, 11-15 digits after).
        if (str_starts_with($digits, '+')) {
            $rest = substr($digits, 1);
            if (preg_match('/^\d{11,15}$/', $rest)) {
                return '+' . $rest;
            }
            return null;
        }

        // 10-digit US/Canada -> +1XXXXXXXXXX.
        if (preg_match('/^\d{10}$/', $digits)) {
            return '+1' . $digits;
        }

        // 11-digit starting with 1 -> +1XXXXXXXXXX.
        if (preg_match('/^1\d{10}$/', $digits)) {
            return '+' . $digits;
        }

        return null;
    }
}
