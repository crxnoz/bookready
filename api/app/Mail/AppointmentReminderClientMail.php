<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentReminderClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array  $appt,
        public readonly string $businessName,
        public readonly int    $hoursBefore,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reminder: your ' . $this->businessName . ' appointment',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.appointment-reminder-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
