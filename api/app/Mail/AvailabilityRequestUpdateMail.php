<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer-facing outcome of an availability request. One mailable, three
 * outcomes (approved / suggested / declined) — the blade branches on
 * $outcome so we don't carry three near-identical templates.
 */
class AvailabilityRequestUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string  $outcome,        // approved | suggested | declined
        public readonly string  $customerName,
        public readonly string  $businessName,
        public readonly string  $serviceName,
        public readonly string  $preferredDate,
        public readonly ?string $suggestedDate,
        public readonly ?string $suggestedTime,
        public readonly ?string $ownerNote,
        public readonly ?string $actionUrl,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->outcome) {
            'approved'  => "You're booked — {$this->businessName}",
            'suggested' => "A new time for you — {$this->businessName}",
            default     => "Update on your request — {$this->businessName}",
        };
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.availability-request-update-client');
    }

    public function attachments(): array { return []; }
}
