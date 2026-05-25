<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Customer receipt for an owner-triggered no-show / late-cancel fee.
 * Subject adapts to the type so the customer sees plain language.
 */
class LateFeeChargedClientMail extends Mailable
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
        public readonly string $feeType,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->feeType === 'no_show'
            ? 'No-show fee charged — ' . $this->businessName
            : 'Late-cancellation fee charged — ' . $this->businessName;
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.late-fee-charged-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
