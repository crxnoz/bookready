<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Owner alert: a client filed a chargeback on a Connect payment. Sent
 * once on charge.dispute.created. Includes the deadline so the owner
 * knows when they need to submit evidence inside Stripe.
 */
class DisputeOpenedOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $businessName,
        public readonly float  $disputeAmount,
        public readonly string $currency,
        public readonly string $reason,
        public readonly ?int   $evidenceDueBy,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Action needed: a payment was disputed — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.dispute-opened-owner');
    }

    public function attachments(): array
    {
        return [];
    }
}
