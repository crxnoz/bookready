<?php

namespace App\Mail;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when a cancellation matches this waitlister's preferences.
 * Carries a claim URL with a single-use token and a 2-hour expiry.
 *
 * Time-sensitive — the subject leads with "Spot opened" to read clearly
 * in the inbox preview.
 */
class WaitlistSpotOpenedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $businessName,
        public readonly string $serviceName,
        public readonly string $appointmentDate,
        public readonly string $startTime,
        public readonly string $claimUrl,
        public readonly Carbon $expiresAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Spot opened {$this->appointmentDate} — " . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.waitlist-spot-opened-client');
    }

    public function attachments(): array { return []; }
}
