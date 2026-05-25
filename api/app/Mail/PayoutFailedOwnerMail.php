<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Urgent owner alert when Stripe couldn't deposit funds to their bank.
 * This is real money sitting in Stripe limbo — they have to log into
 * Stripe and fix bank details for it to retry. Subject doesn't bury
 * the lede.
 */
class PayoutFailedOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $businessName,
        public readonly float  $amount,
        public readonly string $currency,
        public readonly string $failureReason,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Action needed: a payout to your bank failed — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.payout-failed-owner');
    }

    public function attachments(): array
    {
        return [];
    }
}
