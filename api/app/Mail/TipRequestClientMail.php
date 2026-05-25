<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Post-appointment "loved your visit? leave a tip" email. Fired when the
 * owner clicks "Request tip" on a completed appointment.
 */
class TipRequestClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $businessName,
        public readonly string $serviceName,
        public readonly string $appointmentDate,
        public readonly string $startTime,
        public readonly string $tipUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Leave a tip — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.tip-request-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
