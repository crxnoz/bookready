<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer-facing refund receipt. Sent when charge.refunded fires for a
 * Connect payment we created. Tells the client how much went back and
 * sets the "5–10 business days" expectation banks apply for card refunds.
 */
class PaymentRefundedClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $businessName,
        public readonly string $serviceName,
        public readonly string $appointmentDate,
        public readonly string $startTime,
        public readonly float  $refundAmount,
        public readonly bool   $isFullRefund,
        public readonly string $currency,
    ) {}

    public function envelope(): Envelope
    {
        $word = $this->isFullRefund ? 'Refund issued' : 'Partial refund issued';
        return new Envelope(subject: $word . ' — ' . $this->businessName);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.payment-refunded-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
