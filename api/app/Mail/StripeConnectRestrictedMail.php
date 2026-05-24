<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Platform → owner: heads-up when Stripe restricts a connected account.
 * Payments stop working until the owner resolves the requirements.
 */
class StripeConnectRestrictedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $businessName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Stripe needs more info — payments are paused',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.stripe-connect-restricted');
    }

    public function attachments(): array
    {
        return [];
    }
}
