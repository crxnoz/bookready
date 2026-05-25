<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer receipt after they pay the remaining balance through the
 * link in BalanceDueClientMail. Fires from the balance branch of the
 * checkout.session.completed webhook.
 */
class BalancePaidClientMail extends Mailable
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
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment received — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.balance-paid-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
