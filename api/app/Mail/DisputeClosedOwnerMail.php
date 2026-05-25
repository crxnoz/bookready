<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Owner notification when a chargeback resolves. `outcome` is the raw
 * Stripe dispute status (won|lost|warning_closed). Subject and body
 * adapt accordingly so a "won" doesn't read like a "lost".
 */
class DisputeClosedOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $businessName,
        public readonly float  $disputeAmount,
        public readonly string $currency,
        public readonly string $outcome,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->outcome) {
            'won'              => 'Dispute resolved in your favor — ' . $this->businessName,
            'lost'             => 'Dispute closed — funds reversed — ' . $this->businessName,
            default            => 'Dispute closed — ' . $this->businessName,
        };
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.dispute-closed-owner');
    }

    public function attachments(): array
    {
        return [];
    }
}
