<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationSendLog;
use App\Models\SmsOptout;
use App\Services\Sms\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Telnyx Messaging webhooks.
 *
 *   POST /api/v1/webhooks/telnyx/status   — delivery receipts
 *   POST /api/v1/webhooks/telnyx/inbound  — inbound SMS replies
 *
 * Both endpoints:
 *   - Are unauthenticated (Telnyx can't carry our owner/customer cookie),
 *     so signature verification is the only access control.
 *   - Verify the Ed25519 signature in the `Telnyx-Signature-Ed25519`
 *     header against TELNYX_PUBLIC_KEY before reading the body.
 *   - Reject any payload whose `Telnyx-Timestamp` is more than
 *     services.telnyx.webhook_max_age_seconds old (replay protection).
 *
 * Telnyx event shape (v2):
 *   {
 *     "data": {
 *       "event_type": "message.sent" | "message.delivered" |
 *                     "message.delivery_failed" | "message.finalized" |
 *                     "message.received",
 *       "payload": {
 *         "id": "uuid",
 *         "to":   [{"phone_number": "+1...", "status": "delivered"}],
 *         "from": {"phone_number": "+1..."},
 *         "text": "...",
 *         ...
 *       }
 *     }
 *   }
 */
class TelnyxWebhookController extends Controller
{
    /**
     * Unified webhook handler. Telnyx's Messaging Profile config has
     * ONE primary Webhook URL + ONE failover URL, and sends every
     * event type (message.sent, message.delivered, message.received,
     * message.delivery_failed, etc.) to BOTH urls. This method
     * routes by event_type into either the status or inbound flow.
     *
     * Wire BOTH `/sms` AND `/sms-failover` to this same method so
     * Telnyx's redundancy doesn't change behavior — we just dedupe
     * by provider_id at the log level (NotificationSendLog
     * updateOrInsert keeps the row idempotent).
     */
    public function handle(Request $request): JsonResponse
    {
        $body = $request->getContent();
        if (! $this->verifySignature($request, $body)) {
            Log::warning('telnyx.webhook.invalid_signature', [
                'path' => $request->path(),
                'ip'   => $request->ip(),
            ]);
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $event = (string) $request->json('data.event_type', '');

        // Status / delivery events.
        if (in_array($event, [
            'message.sent',
            'message.delivered',
            'message.delivery_failed',
            'message.finalized',
        ], true)) {
            return $this->handleStatusEvent($request);
        }

        // Inbound replies.
        if ($event === 'message.received') {
            return $this->handleInboundEvent($request);
        }

        // Unknown event types — accept and move on so Telnyx doesn't
        // retry forever.
        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Legacy delivery-receipt route. Signature-verifies, then defers
     * to the shared inner handler so this URL behaves identically to
     * the unified /sms endpoint.
     */
    public function status(Request $request): JsonResponse
    {
        if (! $this->verifySignature($request, $request->getContent())) {
            Log::warning('telnyx.webhook.invalid_signature', ['path' => 'status', 'ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid signature'], 403);
        }
        return $this->handleStatusEvent($request);
    }

    /**
     * Internal: status flip from a verified Telnyx delivery event.
     * Caller must have already verified the signature.
     */
    private function handleStatusEvent(Request $request): JsonResponse
    {
        $data    = (array) ($request->json('data') ?? []);
        $event   = (string) ($data['event_type'] ?? '');
        $payload = (array) ($data['payload'] ?? []);
        $id      = (string) ($payload['id'] ?? '');

        if ($id === '') {
            return response()->json(['message' => 'OK'], 200);
        }

        // Map Telnyx events to our log statuses.
        $newStatus = match ($event) {
            'message.sent'             => 'sent',
            'message.delivered'        => 'delivered',
            'message.delivery_failed',
            'message.finalized'        => 'failed',
            default                    => null,
        };

        $row = NotificationSendLog::where('provider_id', $id)->first();
        if (! $row) {
            // We don't have a record — probably a callback for a
            // message sent before this service existed, or a duplicate.
            // 200 so Telnyx doesn't retry.
            return response()->json(['message' => 'OK'], 200);
        }

        if ($newStatus !== null) {
            $row->status = $newStatus;
            if (in_array($newStatus, ['delivered', 'failed'], true)) {
                $row->terminal_at = now();
            }
            // Carrier error code, if present, into context for debugging.
            $errors = $payload['errors'] ?? null;
            if (is_array($errors) && ! empty($errors)) {
                $ctx = $row->context ?? [];
                $ctx['carrier_errors'] = $errors;
                $row->context = $ctx;
                $row->error = (string) ($errors[0]['title'] ?? $errors[0]['code'] ?? null);
            }
            $row->save();
        }

        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Inbound SMS replies. Three kinds of behavior:
     *
     *   STOP / STOPALL / CANCEL / END / QUIT / UNSUBSCRIBE
     *     → add to sms_optouts, auto-reply with confirmation.
     *
     *   START / UNSTOP / YES
     *     → remove from sms_optouts, auto-reply that they're back.
     *
     *   HELP / INFO
     *     → auto-reply with help text.
     *
     *   Anything else
     *     → log only (V1). V2: surface in the owner's inbox.
     */
    public function inbound(Request $request): JsonResponse
    {
        if (! $this->verifySignature($request, $request->getContent())) {
            Log::warning('telnyx.webhook.invalid_signature', ['path' => 'inbound', 'ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $event = (string) $request->json('data.event_type', '');
        if ($event !== 'message.received') {
            return response()->json(['message' => 'OK'], 200);
        }

        return $this->handleInboundEvent($request);
    }

    /**
     * Internal: inbound keyword routing. Caller must have already
     * verified the signature AND checked event_type === message.received.
     */
    private function handleInboundEvent(Request $request): JsonResponse
    {
        $payload = (array) $request->json('data.payload', []);

        $fromPhone = (string) ($payload['from']['phone_number'] ?? '');
        $text      = trim((string) ($payload['text'] ?? ''));
        $normalized = SmsService::normalizePhone($fromPhone);

        if ($normalized === null) {
            Log::warning('telnyx.inbound.invalid_from', ['raw' => $fromPhone]);
            return response()->json(['message' => 'OK'], 200);
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
            return response()->json(['message' => 'OK'], 200);
        }

        if (in_array($keyword, ['START', 'UNSTOP', 'YES'], true)) {
            SmsOptout::where('phone', $normalized)->delete();
            SmsService::send(
                to:          $normalized,
                body:        'You are re-subscribed to BookReady appointment messages. Reply STOP to opt out again at any time.',
                templateKey: 'optin_confirmation',
                context:     ['origin' => 'inbound_keyword'],
            );
            return response()->json(['message' => 'OK'], 200);
        }

        if (in_array($keyword, ['HELP', 'INFO'], true)) {
            SmsService::send(
                to:          $normalized,
                body:        'BookReady appointment messages. Reply STOP to opt out. Questions? Email hello@mybookready.com',
                templateKey: 'help_reply',
                context:     ['origin' => 'inbound_keyword'],
            );
            return response()->json(['message' => 'OK'], 200);
        }

        // Generic reply — log it. V2: route to owner inbox.
        Log::info('telnyx.inbound.reply', [
            'from'     => $normalized,
            'text'     => mb_substr($text, 0, 500),
            'event_id' => $payload['id'] ?? null,
        ]);
        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Verify the Ed25519 signature Telnyx attaches to every callback.
     *
     * Telnyx headers:
     *   Telnyx-Signature-Ed25519  base64-encoded signature
     *   Telnyx-Timestamp          unix seconds (string)
     *
     * Signed payload is `timestamp + '|' + raw body`. Public key is
     * the PEM-encoded Ed25519 key from the portal — we extract the
     * raw 32-byte key from the base64 between the PEM headers.
     */
    private function verifySignature(Request $request, string $body): bool
    {
        $pem = (string) config('services.telnyx.public_key');
        if ($pem === '') {
            // Without a configured public key we can't verify. Reject
            // by default — better to drop callbacks than to trust
            // unsigned data. In dry-run mode we don't expect callbacks
            // anyway (we never sent anything for Telnyx to call back
            // about).
            return false;
        }

        $signatureHeader = (string) $request->header('Telnyx-Signature-Ed25519', '');
        $timestamp       = (string) $request->header('Telnyx-Timestamp', '');

        if ($signatureHeader === '' || $timestamp === '') return false;

        // Replay protection.
        $maxAge = (int) config('services.telnyx.webhook_max_age_seconds', 300);
        if (abs(time() - (int) $timestamp) > $maxAge) return false;

        // Extract the raw 32-byte public key from the PEM. The portal
        // hands us a standard SubjectPublicKeyInfo (SPKI) DER wrapped
        // in PEM. For Ed25519 the last 32 bytes of the DER ARE the key.
        $raw = self::pemToRawKey($pem);
        if ($raw === null) return false;

        $signature = base64_decode($signatureHeader, true);
        if ($signature === false) return false;

        $signed = $timestamp . '|' . $body;

        // sodium_crypto_sign_verify_detached is constant-time and
        // ships with PHP 8+. No openssl_verify fallback needed.
        try {
            return sodium_crypto_sign_verify_detached($signature, $signed, $raw);
        } catch (\SodiumException) {
            return false;
        }
    }

    /**
     * Extract the raw 32-byte Ed25519 public key from a PEM-encoded
     * SubjectPublicKeyInfo. The last 32 bytes of the DER are the key.
     */
    private static function pemToRawKey(string $pem): ?string
    {
        $body = preg_replace('/-----BEGIN [A-Z ]+-----|-----END [A-Z ]+-----|\s+/', '', $pem);
        if (! is_string($body) || $body === '') return null;
        $der = base64_decode($body, true);
        if ($der === false || strlen($der) < 32) return null;
        return substr($der, -32);
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
