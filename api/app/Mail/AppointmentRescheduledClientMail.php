<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentRescheduledClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array  $appt,
        public readonly array  $oldAppt,
        public readonly string $businessName,
        /** 'owner' | 'client' — who initiated the reschedule */
        public readonly string $initiatedBy,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your appointment has been rescheduled — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.appointment-rescheduled-client');
    }

    public function attachments(): array
    {
        return [];
    }
}
