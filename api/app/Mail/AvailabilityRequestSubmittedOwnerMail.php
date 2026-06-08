<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Owner alert: a customer asked to be squeezed in on a fully-booked day.
 * Links straight to the Availability → Squeeze-Ins tab to decide.
 */
class AvailabilityRequestSubmittedOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string  $businessName,
        public readonly string  $customerName,
        public readonly string  $customerEmail,
        public readonly string  $serviceName,
        public readonly string  $preferredDate,
        public readonly ?string $preferredTime,
        public readonly ?string $notes,
        public readonly string  $manageUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New appointment request — {$this->customerName}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.availability-request-submitted-owner');
    }

    public function attachments(): array { return []; }
}
