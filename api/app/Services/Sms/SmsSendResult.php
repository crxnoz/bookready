<?php

namespace App\Services\Sms;

/**
 * Return type for SmsService::send(). Designed so callers can branch
 * cleanly on success/failure without parsing strings:
 *
 *   $r = SmsService::send($phone, $body);
 *   if ($r->isSent()) { ... }
 *   if ($r->isOptedOut()) { ... }
 *
 * The notification_send_log row id (when one was created) is on the
 * result so callers can attach further context (e.g. appointment id)
 * after the fact if needed.
 */
final class SmsSendResult
{
    private function __construct(
        public readonly string $status,           // 'queued' | 'dry_run' | 'opted_out' | 'failed' | 'invalid_phone'
        public readonly ?string $providerId,
        public readonly ?int $logId,
        public readonly ?string $error,
    ) {}

    public static function queued(string $providerId, int $logId): self
    {
        return new self('queued', $providerId, $logId, null);
    }

    public static function dryRun(int $logId): self
    {
        return new self('dry_run', null, $logId, null);
    }

    public static function optedOut(int $logId): self
    {
        return new self('opted_out', null, $logId, null);
    }

    public static function failed(string $error, ?int $logId = null): self
    {
        return new self('failed', null, $logId, $error);
    }

    public static function invalidPhone(string $raw): self
    {
        return new self('invalid_phone', null, null, "Phone not E.164: {$raw}");
    }

    public function isSent(): bool
    {
        return $this->status === 'queued' || $this->status === 'dry_run';
    }

    public function isOptedOut(): bool { return $this->status === 'opted_out'; }
    public function isFailed(): bool   { return $this->status === 'failed' || $this->status === 'invalid_phone'; }

    public function toArray(): array
    {
        return [
            'status'      => $this->status,
            'provider_id' => $this->providerId,
            'log_id'      => $this->logId,
            'error'       => $this->error,
        ];
    }
}
