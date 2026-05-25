<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer-facing payment-request email. Fired when the owner clicks
 * "Send payment link" on an appointment. Two flavors:
 *   - $isBalance=true  → "Pay your remaining balance" (deposit was already paid)
 *   - $isBalance=false → "Confirm your booking" (full payment up front,
 *                         for off-platform / phone bookings)
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
        public readonly bool   $isBalance = true,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->isBalance
            ? 'Pay your remaining balance — ' . $this->businessName
            : 'Confirm your booking — ' . $this->businessName;
        return new Envelope(subject: $subject);
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
