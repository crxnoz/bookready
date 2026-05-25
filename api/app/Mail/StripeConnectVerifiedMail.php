<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Platform → owner: celebratory email when a tenant's Stripe Connect
 * account flips from a non-active state into 'active'. Sent once per
 * transition (the webhook handler only fires this when status actually
 * changes to active, not on every account.updated event).
 */
class StripeConnectVerifiedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $businessName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Stripe is connected — start collecting payments',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.stripe-connect-verified');
    }

    public function attachments(): array
    {
        return [];
    }
}
