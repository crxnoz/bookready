<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 2 of the customer-accounts feature — verify-email link sent
 * after a customer registers directly (not via the claim flow, which
 * pre-verifies because the click proves email ownership).
 *
 * Mirror of VerifyEmailMail. Separate class so the copy can speak to
 * the customer ("see your bookings") rather than the owner ("unlock
 * your workspace").
 */
class CustomerVerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $verifyUrl,
        public readonly int    $ttlMins,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify your BookReady email',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.customer-verify-email',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
