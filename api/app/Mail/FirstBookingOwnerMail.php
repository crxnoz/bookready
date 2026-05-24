<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Platform → owner: celebratory email fired when a tenant receives
 * their very first booking. Sent once per tenant, alongside the regular
 * booking-request email — this is the "you made a sale!" moment, not
 * a replacement for the booking notification.
 */
class FirstBookingOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array  $appt,
        public readonly string $businessName,
        public readonly string $ownerName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎉 Your first booking is in — ' . $this->businessName,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.first-booking-owner');
    }

    public function attachments(): array
    {
        return [];
    }
}
