<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent immediately after a customer joins the waitlist.
 * "You're on the list — we'll email you the moment a spot opens."
 *
 * Tenant-branded (sender + reply-to from notification_settings via
 * AppointmentMailer::brand applied at dispatch time).
 */
class WaitlistJoinConfirmMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $businessName,
        public readonly string $serviceName,
        public readonly string $earliestDate,
        public readonly string $latestDate,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You're on the waitlist — " . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.waitlist-join-confirm-client');
    }

    public function attachments(): array { return []; }
}
