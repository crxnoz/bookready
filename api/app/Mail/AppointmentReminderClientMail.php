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
        public readonly ?array $customization = null,
        public readonly int    $hoursBefore = 24,
    ) {}

    public function envelope(): Envelope
    {
        $custom = $this->customization['subject'] ?? null;
        return new Envelope(
            subject: $custom ?: ('Reminder: your ' . $this->businessName . ' appointment'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.appointment-reminder-client',
            with: [
                'customIntro'   => $this->customization['intro']   ?? null,
                'customSignoff' => $this->customization['signoff'] ?? null,
            ],
        );
    }

    public function attachments(): array { return []; }
}
