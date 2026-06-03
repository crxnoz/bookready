<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationSendLog;
use App\Models\SmsOptout;
use App\Services\Sms\SmsService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Twilio Messaging webhooks.
 *
 *   POST /api/v1/webhooks/twilio/status    — delivery-receipt callbacks
 *   POST /api/v1/webhooks/twilio/inbound   — inbound SMS replies
 *
 * Unlike Telnyx (one URL for everything), Twilio uses two distinct
 * webhooks you configure separately:
 *   - The STATUS callback URL is attached per-message via StatusCallback
 *     (SmsService sets it on every send) — point it at /status.
 *   - The INBOUND ("A message comes in") URL is set on the phone number
 *     or the Messaging Service — point it at /inbound.
 *
 * Both endpoints:
 *   - Are unauthenticated (Twilio can't carry our cookie), so the
 *     X-Twilio-Signature HMAC-SHA1 is the only access control.
 *   - Verify that signature against the Twilio Auth Token before reading
 *     anything. Reject 403 on mismatch.
 *
 * Twilio posts application/x-www-form-urlencoded. Status params:
 *   MessageSid, MessageStatus (queued|sending|sent|delivered|
 *   undelivered|failed), ErrorCode (on undelivered/failed).
 * Inbound params:
 *   MessageSid, From, To, Body.
 */
class TwilioWebhookController extends Controller
{
    /**
     * Delivery-receipt callback. Verifies signature, then flips the
     * matching notification_send_log row's status.
     */
    public function status(Request $request): Response
    {
        if (! $this->verifySignature($request)) {
            Log::warning('twilio.webhook.invalid_signature', ['path' => 'status', 'ip' => $request->ip()]);
            return response('Invalid signature', 403);
        }

        $sid    = (string) $request->input('MessageSid', '');
        $status = (string) $request->input('MessageStatus', '');
        if ($sid === '') {
            return response('', 204);
        }

        // Map Twilio status → our log status. Non-terminal states
        // (queued / sending / accepted) leave the row alone.
        $newStatus = match ($status) {
            'sent'        => 'sent',
            'delivered'   => 'delivered',
            'undelivered' => 'undelivered',
            'failed'      => 'failed',
            default       => null,
        };

        $row = NotificationSendLog::where('provider_id', $sid)->first();
        if (! $row) {
            // No record — a callback for a message sent before this
            // service existed, or a duplicate. 204 so Twilio stops.
            return response('', 204);
        }

        if ($newStatus !== null) {
            $row->status = $newStatus;
            if (in_array($newStatus, ['delivered', 'undelivered', 'failed'], true)) {
                $row->terminal_at = now();
            }
            // Carrier error code, if present, into context for debugging.
            $errorCode = $request->input('ErrorCode');
            if ($errorCode !== null && $errorCode !== '') {
                $ctx = $row->context ?? [];
                $ctx['twilio_error_code'] = $errorCode;
                $row->context = $ctx;
                $row->error = 'Twilio error ' . $errorCode;
            }
            $row->save();
        }

        return response('', 204);
    }

    /**
     * Inbound SMS replies. Keyword routing identical to the prior Telnyx
     * handler:
     *
     *   STOP / STOPALL / CANCEL / END / QUIT / UNSUBSCRIBE
     *     → add to sms_optouts, auto-reply with confirmation.
     *   START / UNSTOP / YES
     *     → remove from sms_optouts, auto-reply that they're back.
     *   HELP / INFO
     *     → auto-reply with help text.
     *   Anything else
     *     → log only (V1). V2: surface in the owner's inbox.
     *
     * NOTE: if Twilio "Advanced Opt-Out" is enabled on the Messaging
     * Service, Twilio intercepts STOP/START/HELP itself and may not
     * forward them here. SmsService also checks sms_optouts before every
     * send, so opt-outs are still honored; this handler keeps OUR table
     * in sync whenever Twilio does forward the message.
     *
     * Replies are sent via the API (SmsService::send), so we return an
     * empty TwiML document to tell Twilio no inline reply is needed.
     */
    public function inbound(Request $request): Response
    {
        if (! $this->verifySignature($request)) {
            Log::warning('twilio.webhook.invalid_signature', ['path' => 'inbound', 'ip' => $request->ip()]);
            return response('Invalid signature', 403);
        }

        $fromPhone  = (string) $request->input('From', '');
        $text       = trim((string) $request->input('Body', ''));
        $normalized = SmsService::normalizePhone($fromPhone);

        if ($normalized === null) {
            Log::warning('twilio.inbound.invalid_from', ['raw' => $fromPhone]);
            return $this->emptyTwiml();
        }

        $keyword = self::keywordOf($text);

        if (in_array($keyword, ['STOP', 'STOPALL', 'CANCEL', 'END', 'QUIT', 'UNSUBSCRIBE'], true)) {
            SmsOptout::updateOrCreate(
                ['phone' => $normalized],
                [
                    'opted_out_at' => now(),
                    'source'       => 'inbound_keyword',
                    'note'         => 'Keyword: ' . $keyword,
                ],
            );
            SmsService::send(
                to:          $normalized,
                body:        'You are unsubscribed and will no longer receive BookReady appointment messages. Reply START to opt back in.',
                templateKey: 'optout_confirmation',
                context:     ['origin' => 'inbound_keyword'],
            );
            return $this->emptyTwiml();
        }

        if (in_array($keyword, ['START', 'UNSTOP', 'YES'], true)) {
            SmsOptout::where('phone', $normalized)->delete();
            SmsService::send(
                to:          $normalized,
                body:        'You are re-subscribed to BookReady appointment messages. Reply STOP to opt out again at any time.',
                templateKey: 'optin_confirmation',
                context:     ['origin' => 'inbound_keyword'],
            );
            return $this->emptyTwiml();
        }

        if (in_array($keyword, ['HELP', 'INFO'], true)) {
            SmsService::send(
                to:          $normalized,
                body:        'BookReady appointment messages. Reply STOP to opt out. Questions? Email hello@mybookready.com',
                templateKey: 'help_reply',
                context:     ['origin' => 'inbound_keyword'],
            );
            return $this->emptyTwiml();
        }

        // Generic reply — log it. V2: route to owner inbox.
        Log::info('twilio.inbound.reply', [
            'from'        => $normalized,
            'text'        => mb_substr($text, 0, 500),
            'message_sid' => $request->input('MessageSid'),
        ]);
        return $this->emptyTwiml();
    }

    /**
     * Verify the X-Twilio-Signature HMAC-SHA1 Twilio attaches to every
     * webhook. Algorithm:
     *   1. Take the full request URL Twilio called (scheme + host + path
     *      + query), exactly as configured in the console.
     *   2. Append each POST param, sorted alphabetically by key, as
     *      key immediately followed by value (no delimiters).
     *   3. HMAC-SHA1 the result with the Auth Token, base64-encode.
     *   4. Constant-time compare to the header.
     */
    private function verifySignature(Request $request): bool
    {
        $token = (string) config('services.twilio.auth_token');
        if ($token === '') {
            // Without an Auth Token we can't verify — reject by default.
            // In dry-run mode we never sent anything, so we don't expect
            // callbacks anyway.
            return false;
        }

        $signature = (string) $request->header('X-Twilio-Signature', '');
        if ($signature === '') return false;

        // Reconstruct the exact URL Twilio signed. Behind the load
        // balancer fullUrl() may report http; Twilio always calls https,
        // so force it (or use the explicit override when configured).
        $base = (string) config('services.twilio.webhook_base_url');
        if ($base !== '') {
            $url = rtrim($base, '/') . '/' . ltrim($request->path(), '/');
            $qs  = $request->getQueryString();
            if ($qs !== null && $qs !== '') $url .= '?' . $qs;
        } else {
            $url = $request->fullUrl();
            if (str_starts_with($url, 'http://')) {
                $url = 'https://' . substr($url, 7);
            }
        }

        $params = $request->post();
        ksort($params);
        $data = $url;
        foreach ($params as $key => $value) {
            $data .= $key . (is_array($value) ? implode('', $value) : (string) $value);
        }

        $expected = base64_encode(hash_hmac('sha1', $data, $token, true));
        return hash_equals($expected, $signature);
    }

    /**
     * Empty TwiML response — tells Twilio we handled the inbound message
     * (replies go out via the API) and no inline reply is needed.
     */
    private function emptyTwiml(): Response
    {
        return response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200)
            ->header('Content-Type', 'text/xml');
    }

    /**
     * First word of the inbound text, uppercased and stripped of
     * punctuation. Carriers + customers can be sloppy ("stop.", " STOP",
     * "stop please"). We match on the leading token only.
     */
    private static function keywordOf(string $text): string
    {
        $first = strtok(trim($text), " \t\r\n.,!?");
        return strtoupper((string) $first);
    }
}
