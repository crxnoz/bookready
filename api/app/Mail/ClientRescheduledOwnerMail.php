<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientRescheduledOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array  $appt,        // new (current) appointment snapshot
        public readonly array  $oldAppt,     // previous date/time snapshot
        public readonly string $businessName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking rescheduled by client — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.client-rescheduled-owner');
    }

    public function attachments(): array
    {
        return [];
    }
}
