<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentCancelledClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $appt,
        public readonly string $businessName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Appointment cancelled — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.appointment-cancelled-client',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
