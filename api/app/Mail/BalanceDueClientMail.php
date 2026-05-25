<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer-facing "pay your remaining balance" email. Fired when the
 * owner clicks "Charge balance" on an appointment that has a deposit
 * paid plus an outstanding amount_due. Contains the Stripe Checkout
 * URL for the balance amount only.
 */
class BalanceDueClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $businessName,
        public readonly string $serviceName,
        public readonly string $appointmentDate,
        public readonly string $startTime,
        public readonly float  $amount,
        public readonly string $currency,
        public readonly string $checkoutUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pay your remaining balance — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.balance-due-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
