<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentConfirmedClientMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $appt,
        public readonly string $businessName,
        public readonly ?array $customization = null,
    ) {}

    public function envelope(): Envelope
    {
        $custom = $this->customization['subject'] ?? null;
        return new Envelope(
            subject: $custom ?: ('Appointment confirmed — ' . $this->businessName),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.appointment-confirmed-client',
            with: [
                'customIntro'   => $this->customization['intro']   ?? null,
                'customSignoff' => $this->customization['signoff'] ?? null,
            ],
        );
    }

    public function attachments(): array { return []; }
}
