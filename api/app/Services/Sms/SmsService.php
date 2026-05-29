<?php

namespace App\Services\Sms;

use App\Models\NotificationSendLog;
use App\Models\SmsOptout;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Single entry point for sending SMS through Telnyx.
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
 *   3. If Telnyx is configured (live mode): POST /v2/messages, log the
 *      provider id, return queued().
 *   4. If Telnyx is NOT configured (dry-run mode): log status=dry_run,
 *      return dryRun(). Lets the rest of the codebase wire SMS into
 *      booking flows BEFORE we have credentials, without surprises.
 *
 * Webhook callbacks (handled by TelnyxWebhookController) flip the
 * notification_send_log.status from 'queued' to 'sent' / 'delivered'
 * / 'undelivered' / 'failed' once Telnyx confirms downstream state.
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

        // 2. Opt-out check. We never call Telnyx for a number on the
        //    list — would be a TCPA violation. Log it so support can
        //    explain "your customer texted STOP" if the owner asks.
        if (SmsOptout::where('phone', $normalized)->exists()) {
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'telnyx',
                'status'       => 'opted_out',
                'cost_cents'   => 0,
                'context'      => $context,
            ])->id;
            return SmsSendResult::optedOut($logId);
        }

        // 3. Dry-run path. Service is callable without credentials so
        //    the rest of the codebase can integrate SMS into booking
        //    flows during Telnyx onboarding. The log row tells us
        //    what WOULD have been sent.
        if (! config('services.telnyx.live')) {
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'telnyx',
                'status'       => 'dry_run',
                'cost_cents'   => 0,
                'context'      => array_merge($context, [
                    'body_preview' => mb_substr($body, 0, 160),
                    'reason'       => 'TELNYX_API_KEY or TELNYX_FROM_NUMBER not set',
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

        // 4. Live send. Telnyx REST v2 — direct HTTP, no SDK needed.
        $apiKey    = (string) config('services.telnyx.api_key');
        $from      = (string) config('services.telnyx.from');
        $profileId = (string) config('services.telnyx.messaging_profile_id');
        $costCents = (int) round((float) config('services.telnyx.cost_cents_per_message'));

        $payload = [
            'from' => $from,
            'to'   => $normalized,
            'text' => $body,
        ];
        if ($profileId !== '') {
            $payload['messaging_profile_id'] = $profileId;
        }

        try {
            $resp = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(15)
                ->post('https://api.telnyx.com/v2/messages', $payload);
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
                'provider'     => 'telnyx',
                'status'       => 'failed',
                'error'        => 'network: ' . $e->getMessage(),
                'context'      => $context,
            ])->id;
            return SmsSendResult::failed('network: ' . $e->getMessage(), $logId);
        }

        if (! $resp->successful()) {
            $err = $resp->json('errors.0.title') ?? $resp->json('errors.0.detail') ?? $resp->status();
            $logId = NotificationSendLog::create([
                'tenant_id'    => $tenantId,
                'channel'      => 'sms',
                'template_key' => $templateKey,
                'recipient'    => $normalized,
                'provider'     => 'telnyx',
                'status'       => 'failed',
                'error'        => is_string($err) ? $err : json_encode($err),
                'context'      => array_merge($context, [
                    'http_status' => $resp->status(),
                ]),
            ])->id;
            Log::warning('sms.send.api_error', [
                'tenant_id'    => $tenantId,
                'http_status'  => $resp->status(),
                'error'        => $err,
            ]);
            return SmsSendResult::failed(is_string($err) ? $err : 'telnyx error', $logId);
        }

        $providerId = (string) ($resp->json('data.id') ?? '');
        $logId = NotificationSendLog::create([
            'tenant_id'    => $tenantId,
            'channel'      => 'sms',
            'template_key' => $templateKey,
            'recipient'    => $normalized,
            'provider'     => 'telnyx',
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
