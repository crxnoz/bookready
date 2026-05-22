<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingRequestOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $appt,
        public readonly string $businessName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New booking request — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.booking-request-owner',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
